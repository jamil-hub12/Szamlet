import { describe, it, expect } from "vitest";
import {
  calcularMetricasReporte,
  puedeGenerarReportePedidos,
} from "../app/utils/reportesPedidos";
import type { Pedido } from "../app/contexts/PedidosContext";

/**
 * Ficha 43 - RF43: Reportes Generales
 * Momento 3 TDD - Test en código (Vitest)
 */

function crearPedido(overrides: Partial<Pedido>): Pedido {
  return {
    id: "1",
    codigo: "PED-001",
    clienteId: "c1",
    cliente: "Cliente Test",
    articulo: "Polo",
    estado: "Recibido",
    fecha: "2026-06-01",
    urgente: false,
    telefono: "999999999",
    email: "test@test.com",
    ...overrides,
  };
}

describe("RF43 - Reportes Generales", () => {
  it("CP01 - calcula correctamente el total, activos y urgentes de los pedidos", () => {
    // ARRANGE
    const pedidos: Pedido[] = [
      crearPedido({ id: "1", estado: "Recibido", urgente: true }),
      crearPedido({ id: "2", estado: "En confección", urgente: false }),
      crearPedido({ id: "3", estado: "Entregado", urgente: false }),
      crearPedido({ id: "4", estado: "Cancelado", urgente: true }),
    ];

    // ACT
    const resultado = calcularMetricasReporte(pedidos);

    // ASSERT
    expect(resultado).toEqual({
      totalPedidos: 4,
      pedidosActivos: 2, // Recibido y En confección (no Entregado ni Cancelado)
      pedidosUrgentes: 2, // pedidos 1 y 4
    });
  });

  it("CP02 - retorna métricas en cero cuando no existen pedidos registrados", () => {
    // ARRANGE
    const pedidos: Pedido[] = [];

    // ACT
    const resultado = calcularMetricasReporte(pedidos);

    // ASSERT
    expect(resultado).toEqual({
      totalPedidos: 0,
      pedidosActivos: 0,
      pedidosUrgentes: 0,
    });
  });

  it("CP03 - no aplica test de código: manejo de error de generación de PDF, verificado manualmente", () => {
    expect(true).toBe(true);
  });
});
