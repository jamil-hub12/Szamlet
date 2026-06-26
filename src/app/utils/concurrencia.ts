/**
 * concurrencia.ts
 * RF-33 — Control de Concurrencia
 *
 * Implementa bloqueo pesimista en tiempo real mediante la tabla
 * `pedidos_bloqueos` en Supabase, complementado con detección de
 * conflictos optimista al guardar (comparación de updated_at).
 *
 * CP01/CP02 (E1) → bloqueo visible al abrir EditarPedidoModal
 * CP05   (E4)   → conflicto detectado al guardar si updated_at cambió
 */

import { supabase } from "../../lib/supabase";

/** Duración del lock en minutos (cubre cierre abrupto de sesión — CP03 E2) */
export const LOCK_DURACION_MINUTOS = 5;

export type BloqueoInfo = {
  pedidoCodigo: string;
  usuarioCodigo: string;
  usuarioNombre: string;
  expiraEn: string; // ISO timestamp
};

// ─────────────────────────────────────────────────────────────────────────────
// FUNCIONES PURAS (testables, sin efectos secundarios)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calcula si un bloqueo ya expiró dado su timestamp de expiración y la
 * fecha/hora actual. Devuelve `true` si el lock sigue vigente.
 */
export function bloqueoEstaVigente(
  expiraEn: string,
  ahora: Date = new Date(),
): boolean {
  return new Date(expiraEn) > ahora;
}

/**
 * Calcula la fecha de expiración (ISO string) sumando LOCK_DURACION_MINUTOS
 * a partir de `ahora`.
 */
export function calcularExpiracion(ahora: Date = new Date()): string {
  const expira = new Date(ahora.getTime() + LOCK_DURACION_MINUTOS * 60 * 1000);
  return expira.toISOString();
}

/**
 * Determina si el bloqueo pertenece al usuario actual.
 */
export function esMiBloqueo(bloqueo: BloqueoInfo, miCodigo: string): boolean {
  return bloqueo.usuarioCodigo === miCodigo;
}

/**
 * Comprueba si dos timestamps `updated_at` son distintos, indicando que el
 * pedido fue modificado por otra sesión entre que lo abrimos y lo guardamos.
 * Retorna `true` si hay conflicto (el pedido cambió).
 */
export function hayConflictoDeVersion(
  updatedAtAlAbrir: string,
  updatedAtActual: string,
): boolean {
  // Normalizamos a número para comparación robusta
  return (
    new Date(updatedAtActual).getTime() !== new Date(updatedAtAlAbrir).getTime()
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// OPERACIONES SUPABASE (async, llaman a la BD)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Obtiene el bloqueo activo de un pedido (si existe y no expiró).
 * Retorna `null` si el pedido está libre.
 */
export async function obtenerBloqueoActivo(
  pedidoCodigo: string,
): Promise<BloqueoInfo | null> {
  try {
    const { data, error } = await supabase
      .from("pedidos_bloqueos")
      .select("pedido_codigo, usuario_codigo, usuario_nombre, expira_en")
      .eq("pedido_codigo", pedidoCodigo)
      .single();

    if (error || !data) return null;

    const vigente = bloqueoEstaVigente(data.expira_en);
    if (!vigente) {
      // Expirado → lo limpiamos silenciosamente (cubre CP03 E2)
      await liberarBloqueo(pedidoCodigo, data.usuario_codigo);
      return null;
    }

    return {
      pedidoCodigo: data.pedido_codigo,
      usuarioCodigo: data.usuario_codigo,
      usuarioNombre: data.usuario_nombre,
      expiraEn: data.expira_en,
    };
  } catch {
    return null;
  }
}

/**
 * Intenta tomar el bloqueo de un pedido para el usuario indicado.
 * - Si el pedido está libre (o el lock expiró): toma el lock → retorna `true`.
 * - Si está tomado por OTRO usuario: retorna la info del bloqueador (para CP02).
 * - Si ya lo tiene el mismo usuario: renueva la expiración → retorna `true`.
 */
export async function tomarBloqueo(
  pedidoCodigo: string,
  usuarioCodigo: string,
  usuarioNombre: string,
): Promise<{ tomado: true } | { tomado: false; bloqueadoPor: BloqueoInfo }> {
  try {
    // Ver si existe bloqueo activo
    const bloqueoPrevio = await obtenerBloqueoActivo(pedidoCodigo);

    if (bloqueoPrevio && !esMiBloqueo(bloqueoPrevio, usuarioCodigo)) {
      // Otro usuario tiene el lock → CP02 E1
      return { tomado: false, bloqueadoPor: bloqueoPrevio };
    }

    // Libre o ya era mío → upsert
    const expiraEn = calcularExpiracion();
    const { error } = await supabase.from("pedidos_bloqueos").upsert(
      {
        pedido_codigo: pedidoCodigo,
        usuario_codigo: usuarioCodigo,
        usuario_nombre: usuarioNombre,
        expira_en: expiraEn,
      },
      { onConflict: "pedido_codigo" },
    );

    if (error) {
      console.error("Error al tomar bloqueo:", error);
      return { tomado: true }; // fail-open: preferimos no bloquear al usuario
    }

    return { tomado: true };
  } catch {
    return { tomado: true }; // fail-open
  }
}

/**
 * Libera el bloqueo de un pedido.
 * Solo elimina el registro si le pertenece al `usuarioCodigo` indicado.
 */
export async function liberarBloqueo(
  pedidoCodigo: string,
  usuarioCodigo: string,
): Promise<void> {
  try {
    await supabase
      .from("pedidos_bloqueos")
      .delete()
      .eq("pedido_codigo", pedidoCodigo)
      .eq("usuario_codigo", usuarioCodigo);
  } catch {
    // Silencioso — liberar el bloqueo nunca debe romper el flujo
  }
}

/**
 * Renueva la expiración del bloqueo del usuario (heartbeat).
 * Llama periódicamente mientras el modal está abierto.
 */
export async function renovarBloqueo(
  pedidoCodigo: string,
  usuarioCodigo: string,
): Promise<void> {
  try {
    await supabase
      .from("pedidos_bloqueos")
      .update({ expira_en: calcularExpiracion() })
      .eq("pedido_codigo", pedidoCodigo)
      .eq("usuario_codigo", usuarioCodigo);
  } catch {
    // Silencioso
  }
}

/**
 * Obtiene el `updated_at` actual de un pedido directamente de la BD.
 * Usado para verificar conflicto al guardar (CP05 E4).
 */
export async function obtenerUpdatedAtPedido(
  pedidoCodigo: string,
): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from("pedidos")
      .select("updated_at")
      .eq("codigo", pedidoCodigo)
      .single();

    if (error || !data) return null;
    return data.updated_at;
  } catch {
    return null;
  }
}
