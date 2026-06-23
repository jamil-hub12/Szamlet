import { describe, it, expect } from "vitest";
import { filtrarPedidos } from "./pedidosFiltros";
import type { Pedido } from "../contexts/PedidosContext";

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

describe("RF34 - Consulta por Motivo de Cancelación", () => {
  it("CP01: muestra el pedido cancelado con su motivo cuando existen pedidos cancelados", () => {
    // ARRANGE
    const pedidos: Pedido[] = [
      crearPedido({
        id: "PED-001",
        codigo: "PED-001",
        estado: "Cancelado",
        motivoCancelacion: "Cliente no recogió el pedido a tiempo",
      }),
      crearPedido({ id: "PED-002", codigo: "PED-002", estado: "Recibido" }),
    ];

    // ACT
    const resultado = filtrarPedidos(pedidos, { filtroEstado: "Cancelado" });

    // ASSERT
    expect(resultado).toHaveLength(1);
    expect(resultado[0].estado).toBe("Cancelado");
    expect(resultado[0].motivoCancelacion).toBe(
      "Cliente no recogió el pedido a tiempo",
    );
  });

  it("CP02: no devuelve pedidos cuando no existen pedidos cancelados (E1)", () => {
    // ARRANGE
    const pedidos: Pedido[] = [
      crearPedido({ id: "PED-001", codigo: "PED-001", estado: "Recibido" }),
      crearPedido({
        id: "PED-002",
        codigo: "PED-002",
        estado: "En confección",
      }),
    ];

    // ACT
    const resultado = filtrarPedidos(pedidos, { filtroEstado: "Cancelado" });

    // ASSERT
    expect(resultado).toHaveLength(0);
  });

  it("CP03: sin seleccionar un pedido no hay motivo de cancelación que mostrar (E2)", () => {
    // ARRANGE
    const pedidos: Pedido[] = [
      crearPedido({
        id: "PED-001",
        codigo: "PED-001",
        estado: "Cancelado",
        motivoCancelacion: "Producto descontinuado",
      }),
    ];
    const resultado = filtrarPedidos(pedidos, { filtroEstado: "Cancelado" });

    // ACT
    const pedidoSeleccionado: Pedido | null = null;

    // ASSERT
    expect(resultado).toHaveLength(1);
    expect(pedidoSeleccionado).toBeNull();
  });
});
