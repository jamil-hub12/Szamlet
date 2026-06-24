import type { Cliente } from "../contexts/ClientesContext";
import type { Pedido } from "../contexts/PedidosContext";

/**
 * Calcula las métricas del reporte general de clientes.
 * Extraído de AdminDashboard.tsx (handleExportarClientesPDF).
 * RF45 - Reporte General de Clientes
 */
export type MetricasReporteClientes = {
  totalClientes: number;
  clientesConEmail: number;
  clientesConPedidos: number;
};

export function calcularMetricasReporteClientes(
  clientes: Cliente[],
  pedidos: Pedido[],
): MetricasReporteClientes {
  const totalClientes = clientes.length;
  const clientesConEmail = clientes.filter((c) => c.email).length;
  const clientesConPedidos = clientes.filter((c) =>
    pedidos.some((p) => p.clienteId === c.id),
  ).length;

  return { totalClientes, clientesConEmail, clientesConPedidos };
}

/**
 * Determina si hay datos suficientes para generar el reporte general
 * de clientes. RF45 - Excepción E1: no existen clientes registrados.
 */
export function puedeGenerarReporteClientes(clientes: Cliente[]): boolean {
  return clientes.length > 0;
}
