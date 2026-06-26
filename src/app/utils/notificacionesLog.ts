// notificacionesLog.ts
// Funciones puras de lógica de negocio para el historial de notificaciones
// de un pedido (RF-21 — Log de Notificaciones).

export type EstadoEntregaNotificacion = "exitoso" | "fallido" | "no_confirmado";

export type NotificacionLog = {
  id: string;
  pedidoCodigo: string;
  fecha: string; // timestamp ISO (created_at)
  medio: string | null;
  destinatario: string | null;
  contenido: string | null;
  estadoEntrega: string | null; // valor crudo tal como llega de la BD
};

export type FiltroNotificacionesLog = {
  fecha?: string; // 'YYYY-MM-DD', filtra por día
  medio?: string;
  estado?: EstadoEntregaNotificacion;
};

const ESTADOS_VALIDOS: EstadoEntregaNotificacion[] = [
  "exitoso",
  "fallido",
  "no_confirmado",
];

/**
 * Clasifica el estado de entrega crudo de una notificación.
 * Cualquier valor nulo, vacío o no reconocido se considera "no_confirmado" (E2 - CP03).
 */
export function clasificarEstadoEntrega(
  estado: string | null | undefined,
): EstadoEntregaNotificacion {
  if (!estado) return "no_confirmado";
  const normalizado = estado.trim().toLowerCase();
  return ESTADOS_VALIDOS.includes(normalizado as EstadoEntregaNotificacion)
    ? (normalizado as EstadoEntregaNotificacion)
    : "no_confirmado";
}

/**
 * Indica si el contenido de una notificación está disponible para mostrar (E5 - CP06).
 */
export function tieneContenidoDisponible(
  contenido: string | null | undefined,
): boolean {
  return typeof contenido === "string" && contenido.trim().length > 0;
}

/**
 * Filtra el historial de notificaciones para que corresponda únicamente
 * al pedido seleccionado.
 */
export function filtrarNotificacionesPorPedido(
  notificaciones: NotificacionLog[],
  pedidoCodigo: string,
): NotificacionLog[] {
  return notificaciones.filter((n) => n.pedidoCodigo === pedidoCodigo);
}

/**
 * Ordena el historial de notificaciones por fecha/hora de envío,
 * de la más reciente a la más antigua (flujo de eventos, paso 7).
 */
export function ordenarNotificacionesPorFecha(
  notificaciones: NotificacionLog[],
): NotificacionLog[] {
  return [...notificaciones].sort(
    (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime(),
  );
}

/**
 * Indica si el conjunto de notificaciones está vacío (E1 - CP02).
 */
export function noHayNotificacionesRegistradas(
  notificaciones: NotificacionLog[],
): boolean {
  return notificaciones.length === 0;
}

/**
 * Aplica un filtro por fecha exacta, medio y/o estado de entrega
 * sobre el historial de notificaciones (E4 - CP05).
 */
export function aplicarFiltroNotificaciones(
  notificaciones: NotificacionLog[],
  filtro: FiltroNotificacionesLog,
): NotificacionLog[] {
  return notificaciones.filter((n) => {
    if (filtro.fecha) {
      const fechaNotif = n.fecha.slice(0, 10);
      if (fechaNotif !== filtro.fecha) return false;
    }
    if (filtro.medio && n.medio !== filtro.medio) {
      return false;
    }
    if (
      filtro.estado &&
      clasificarEstadoEntrega(n.estadoEntrega) !== filtro.estado
    ) {
      return false;
    }
    return true;
  });
}

/**
 * Indica si hay algún filtro activo (todos los campos vacíos/undefined = sin filtro).
 */
export function hayFiltroActivo(filtro: FiltroNotificacionesLog): boolean {
  return Boolean(filtro.fecha || filtro.medio || filtro.estado);
}
