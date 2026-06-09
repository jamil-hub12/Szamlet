import { obtenerFechaPeruHoy } from "../../utils/fechas";

/**
 * Verifica si un pedido está vencido (fecha de entrega pasada)
 * No considera pedidos en estado Entregado o Cancelado
 */
export function esPedidoVencido(
  fechaEntrega?: string,
  estado?: string,
): boolean {
  if (!fechaEntrega || !estado) return false;
  // No se considera vencido si ya fue entregado o cancelado
  if (estado === "Entregado" || estado === "Cancelado") return false;

  const hoy = obtenerFechaPeruHoy();
  return fechaEntrega < hoy;
}

/**
 * Calcula días hasta vencimiento (negativo si vencido)
 */
export function diasHastaVencimiento(fechaEntrega?: string): number | null {
  if (!fechaEntrega) return null;

  const hoy = new Date(obtenerFechaPeruHoy());
  const entrega = new Date(fechaEntrega);
  const diferencia = entrega.getTime() - hoy.getTime();
  return Math.ceil(diferencia / (1000 * 60 * 60 * 24));
}

/**
 * Valida que una fecha no sea anterior a hoy (usada al crear/editar)
 */
export function esValidaFechaMinimaHoy(fecha: string): boolean {
  return fecha >= obtenerFechaPeruHoy();
}

/**
 * Valida que una fecha no sea futura (usada para fechas de pago/realización)
 */
export function esValidaFechaMaximaHoy(fecha: string): boolean {
  return fecha <= obtenerFechaPeruHoy();
}

/**
 * Genera mensaje de error para fecha inválida
 */
export function obtenerMensajeErrorFecha(
  fecha: string,
  contexto: "entrega" | "pago" | "creacion",
): string {
  const hoy = obtenerFechaPeruHoy();

  if (contexto === "entrega") {
    if (fecha < hoy) {
      return `La fecha de entrega no puede ser anterior a hoy (${hoy})`;
    }
  } else if (contexto === "pago") {
    if (fecha > hoy) {
      return `La fecha del pago no puede ser futura (hoy es ${hoy})`;
    }
  } else if (contexto === "creacion") {
    if (fecha < hoy) {
      return `La fecha no puede ser anterior a hoy (${hoy})`;
    }
  }

  return "Fecha inválida";
}

/**
 * Valida estructura de email
 */
export function esEmailValido(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

/**
 * Valida número de teléfono peruano (9 dígitos, empieza en 9)
 */
export function esTelefonoValido(telefono: string): boolean {
  const regex = /^9\d{8}$/;
  return regex.test(telefono.replace(/[^\d]/g, ""));
}

/**
 * Valida DNI peruano (8 dígitos)
 */
export function esDNIValido(dni: string): boolean {
  return /^\d{8}$/.test(dni.replace(/[^\d]/g, ""));
}

/**
 * Valida RUC peruano (11 dígitos)
 */
export function esRUCValido(ruc: string): boolean {
  return /^\d{11}$/.test(ruc.replace(/[^\d]/g, ""));
}

/**
 * Valida nombre: solo letras y espacios
 */
export function esNombreValido(nombre: string): boolean {
  return /^[a-zA-ZáéíóúñÁÉÍÓÚÑ\s]+$/.test(nombre.trim());
}

/**
 * Valida email con proveedores permitidos (Gmail, Outlook, Hotmail)
 */
export function esEmailConProveedorPermitido(email: string): boolean {
  const dominiosPermitidos = ["@gmail.com", "@outlook.com", "@hotmail.com"];
  return dominiosPermitidos.some((dominio) =>
    email.toLowerCase().endsWith(dominio),
  );
}

/**
 * Valida dirección: permite letras, números, espacios y caracteres comunes en direcciones
 */
export function esDireccionValida(direccion: string): boolean {
  return /^[a-zA-Z0-9áéíóúñÁÉÍÓÚÑ\s\.,#\-\/]+$/.test(direccion.trim());
}

/**
 * Valida que solo contenga números
 */
export function soloNumeros(valor: string): boolean {
  return /^\d*$/.test(valor);
}

/**
 * Valida que un monto sea válido (positivo, máximo 2 decimales)
 */
export function esMontoValido(monto: string | number): boolean {
  const num = typeof monto === "string" ? parseFloat(monto) : monto;
  if (isNaN(num) || num <= 0) return false;
  // Verificar máximo 2 decimales
  if (typeof monto === "string") {
    const decimals = monto.split(".")[1];
    if (decimals && decimals.length > 2) return false;
  }
  return true;
}

/**
 * Valida que una cantidad sea válido (entero positivo)
 */
export function esCantidadValida(cantidad: number): boolean {
  return Number.isInteger(cantidad) && cantidad > 0;
}

/**
 * Obtiene todos los errores de validación en un formulario
 */
export type ErroresValidacion = Record<string, string>;

/**
 * Normaliza espacios en blanco en strings
 */
export function normalizarTexto(texto: string): string {
  return texto.trim().replace(/\s+/g, " ");
}
