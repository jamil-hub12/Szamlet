import { describe, it, expect } from "vitest";
import { filtrarPedidosAdmin } from "./pedidosFiltros";
import type { Pedido } from "../contexts/PedidosContext";

/**
 * Ficha 44 - RF44: Reportes por Estado
 * Momento 3 TDD - Test en código (Vitest)
 *
 * Usa filtrarPedidosAdmin, ya existente en pedidosFiltros.ts, que es la
 * misma función que AdminDashboard.tsx usa para construir pedidosFiltrados
 * antes de exportar el reporte a PDF (handleExportarPedidosPDF).
 */

function crearPedido(overrides: Partial<Pedido>): Pedido {
  return {
    id: "PED-001",
    codigo: "PED-001",
    clienteId: "CLI-001",
    cliente: "Cliente de prueba",
    articulo: "Polo",
    estado: "Recibido",
    fecha: "2026-06-20",
    urgente: false,
    telefono: "999999999",
    email: "cliente@test.com",
    ...overrides,
  };
}

describe("RF44 - Reportes por Estado", () => {
  // CP01 - Flujo exitoso: generación de reporte por estado
  it("CP01: filtra y muestra únicamente los pedidos con estado 'En confección'", () => {
    // ARRANGE
    const pedidos: Pedido[] = [
      crearPedido({
        id: "PED-001",
        codigo: "PED-001",
        estado: "En confección",
      }),
      crearPedido({ id: "PED-002", codigo: "PED-002", estado: "Recibido" }),
      crearPedido({
        id: "PED-003",
        codigo: "PED-003",
        estado: "En confección",
      }),
      crearPedido({ id: "PED-004", codigo: "PED-004", estado: "Entregado" }),
    ];

    // ACT
    const resultado = filtrarPedidosAdmin(pedidos, {
      filtroEstado: "En confección",
    });

    // ASSERT
    expect(resultado).toHaveLength(2);
    expect(resultado.every((p) => p.estado === "En confección")).toBe(true);
  });

  // CP02 - No existen pedidos para el estado seleccionado (E1)
  it("CP02: no devuelve pedidos cuando no existen registros con el estado seleccionado", () => {
    // ARRANGE
    const pedidos: Pedido[] = [
      crearPedido({ id: "PED-001", codigo: "PED-001", estado: "Recibido" }),
      crearPedido({ id: "PED-002", codigo: "PED-002", estado: "Entregado" }),
    ];

    // ACT
    const resultado = filtrarPedidosAdmin(pedidos, {
      filtroEstado: "Listo para entrega",
    });

    // ASSERT
    expect(resultado).toHaveLength(0);
  });

  // CP03 - No se aplica ningún filtro (E2)
  it("CP03: mantiene la lista general de pedidos cuando no se aplica filtro de estado", () => {
    // ARRANGE
    const pedidos: Pedido[] = [
      crearPedido({ id: "PED-001", codigo: "PED-001", estado: "Recibido" }),
      crearPedido({
        id: "PED-002",
        codigo: "PED-002",
        estado: "En confección",
      }),
      crearPedido({ id: "PED-003", codigo: "PED-003", estado: "Entregado" }),
    ];

    // ACT
    const resultado = filtrarPedidosAdmin(pedidos, { filtroEstado: "Todos" });

    // ASSERT
    expect(resultado).toHaveLength(3);
  });

  // CP04 - Cambio de filtro de estado (E3)
  it("CP04: actualiza la lista al cambiar de un filtro de estado a otro", () => {
    // ARRANGE
    const pedidos: Pedido[] = [
      crearPedido({ id: "PED-001", codigo: "PED-001", estado: "Recibido" }),
      crearPedido({
        id: "PED-002",
        codigo: "PED-002",
        estado: "En confección",
      }),
      crearPedido({
        id: "PED-003",
        codigo: "PED-003",
        estado: "En confección",
      }),
    ];

    // ACT
    const resultadoRecibido = filtrarPedidosAdmin(pedidos, {
      filtroEstado: "Recibido",
    });
    const resultadoEnConfeccion = filtrarPedidosAdmin(pedidos, {
      filtroEstado: "En confección",
    });

    // ASSERT
    expect(resultadoRecibido).toHaveLength(1);
    expect(resultadoEnConfeccion).toHaveLength(2);
  });
});
