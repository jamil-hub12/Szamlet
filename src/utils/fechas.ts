/**
 * Utilidades para manejo de fechas en zona horaria de Perú (UTC-5)
 */

const PERU_TIMEZONE = "America/Lima";

/**
 * Obtiene la fecha y hora actual en zona horaria de Perú
 */
export function obtenerFechaHoraPeruActual(): Date {
  return new Date(new Date().toLocaleString("en-US", { timeZone: PERU_TIMEZONE }));
}

/**
 * Convierte una fecha a zona horaria de Perú
 */
export function convertirAZonaHorariaPeru(fecha: Date | string): Date {
  const fechaObj = typeof fecha === "string" ? new Date(fecha) : fecha;
  return new Date(fechaObj.toLocaleString("en-US", { timeZone: PERU_TIMEZONE }));
}

/**
 * Obtiene la fecha actual en formato YYYY-MM-DD en zona horaria de Perú
 */
export function obtenerFechaPeruHoy(): string {
  const fecha = obtenerFechaHoraPeruActual();
  const year = fecha.getFullYear();
  const month = String(fecha.getMonth() + 1).padStart(2, "0");
  const day = String(fecha.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Obtiene la fecha y hora actual en formato ISO pero ajustada a zona horaria de Perú
 * Formato: YYYY-MM-DDTHH:mm:ss
 */
export function obtenerFechaHoraPeruISO(): string {
  const fecha = obtenerFechaHoraPeruActual();
  const year = fecha.getFullYear();
  const month = String(fecha.getMonth() + 1).padStart(2, "0");
  const day = String(fecha.getDate()).padStart(2, "0");
  const hours = String(fecha.getHours()).padStart(2, "0");
  const minutes = String(fecha.getMinutes()).padStart(2, "0");
  const seconds = String(fecha.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
}

/**
 * Formatea una fecha en formato legible para Perú
 * Ejemplo: "6 de junio de 2026, 9:52 a. m."
 */
export function formatearFechaHoraPeru(fecha: Date | string): string {
  const fechaObj = typeof fecha === "string" ? new Date(fecha) : fecha;
  return fechaObj.toLocaleString("es-PE", {
    timeZone: PERU_TIMEZONE,
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Formatea una fecha en formato corto para Perú
 * Ejemplo: "06/06/2026"
 */
export function formatearFechaCorta(fecha: Date | string): string {
  const fechaObj = typeof fecha === "string" ? new Date(fecha) : fecha;
  return fechaObj.toLocaleDateString("es-PE", {
    timeZone: PERU_TIMEZONE,
  });
}

/**
 * Formatea solo la hora para Perú
 * Ejemplo: "9:52 a. m."
 */
export function formatearHoraPeru(fecha: Date | string): string {
  const fechaObj = typeof fecha === "string" ? new Date(fecha) : fecha;
  return fechaObj.toLocaleTimeString("es-PE", {
    timeZone: PERU_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Convierte una fecha a formato YYYY-MM-DD en zona horaria de Perú
 */
export function formatearFechaISO(fecha: Date | string): string {
  const fechaObj = typeof fecha === "string" ? new Date(fecha) : fecha;
  const fechaPeru = convertirAZonaHorariaPeru(fechaObj);
  const year = fechaPeru.getFullYear();
  const month = String(fechaPeru.getMonth() + 1).padStart(2, "0");
  const day = String(fechaPeru.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
