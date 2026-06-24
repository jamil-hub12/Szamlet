import type { Pedido } from "../contexts/PedidosContext";

/**
 * Calcula las métricas globales del reporte general de pedidos.
 * Extraído de AdminDashboard.tsx (handleExportarPedidosPDF).
 * RF43 - Reportes Generales
 */
export type MetricasReportePedidos = {
  totalPedidos: number;
  pedidosActivos: number;
  pedidosUrgentes: number;
};

export function calcularMetricasReporte(
  pedidos: Pedido[],
): MetricasReportePedidos {
  const totalPedidos = pedidos.length;
  const pedidosActivos = pedidos.filter(
    (p) => p.estado !== "Entregado" && p.estado !== "Cancelado",
  ).length;
  const pedidosUrgentes = pedidos.filter((p) => p.urgente).length;

  return { totalPedidos, pedidosActivos, pedidosUrgentes };
}

/**
 * Determina si hay datos suficientes para generar el reporte general
 * de pedidos. RF43 - Excepción E1: no existen pedidos registrados.
 */
export function puedeGenerarReportePedidos(pedidos: Pedido[]): boolean {
  return pedidos.length > 0;
}
