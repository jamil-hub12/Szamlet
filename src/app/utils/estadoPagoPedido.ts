/**
 * Calcula el saldo pendiente y clasifica el estado de pago de un pedido.
 * Extraído de EmpleadoDashboard.tsx (lógica repetida en varias secciones
 * del módulo de Pagos).
 * RF41 - Consulta del Estado de Pagos de Pedidos
 */
export type EstadoPagoCalculado = "Pagado" | "Parcial" | "Pendiente" | "N/A";

export function calcularSaldoPendiente(
  montoTotal?: number,
  montoPagado?: number,
): number {
  return (montoTotal || 0) - (montoPagado || 0);
}

export function obtenerEstadoPagoPedido(
  estadoPedido: string,
  montoTotal?: number,
  montoPagado?: number,
): EstadoPagoCalculado {
  if (estadoPedido === "Cancelado") return "N/A";

  const total = montoTotal || 0;
  const pagado = montoPagado || 0;
  const pendiente = total - pagado;

  if (pendiente <= 0 && total > 0) return "Pagado";
  if (pagado > 0 && pendiente > 0) return "Parcial";
  return "Pendiente";
}
