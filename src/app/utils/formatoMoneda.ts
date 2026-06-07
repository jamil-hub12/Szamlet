/**
 * Utilidad para formatear montos en Soles Peruanos (PEN)
 */

/**
 * Formatea un número como moneda peruana (Soles)
 * @param monto - El monto a formatear
 * @param incluirSimbolo - Si debe incluir el símbolo S/ (por defecto true)
 * @returns String formateado con símbolo y decimales
 * @example
 * formatearSoles(1234.5) // "S/ 1,234.50"
 * formatearSoles(1234.5, false) // "1,234.50"
 */
export function formatearSoles(monto: number, incluirSimbolo: boolean = true): string {
  const montoFormateado = monto.toLocaleString("es-PE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return incluirSimbolo ? `S/ ${montoFormateado}` : montoFormateado;
}

/**
 * Formatea un número como moneda peruana usando Intl.NumberFormat
 * Útil para aplicaciones que requieren formato más robusto
 * @param monto - El monto a formatear
 * @returns String formateado con estilo de moneda PEN
 * @example
 * formatearSolesIntl(1234.5) // "S/ 1,234.50"
 */
export function formatearSolesIntl(monto: number): string {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    minimumFractionDigits: 2,
  }).replace("PEN", "S/"); // Reemplaza "PEN" por "S/"
}

/**
 * Convierte un string de precio a número
 * Elimina el símbolo S/ y las comas
 * @param precioString - String con formato "S/ 1,234.50"
 * @returns Número parseado
 * @example
 * parsearSoles("S/ 1,234.50") // 1234.5
 */
export function parsearSoles(precioString: string): number {
  const limpio = precioString
    .replace("S/", "")
    .replace(/,/g, "")
    .trim();
  return parseFloat(limpio) || 0;
}
