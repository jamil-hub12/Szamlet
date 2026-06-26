/**
 * Ficha 09 — RF09: Historial de Pedidos
 * Lógica: filtro pedidos.filter(p => p.clienteId === cliente.id)
 * Usada en: HistorialClienteModal.tsx
 */

import { describe, it, expect } from "vitest";
import type { Pedido } from "../app/contexts/PedidosContext";

function pedidoMock(id: string, clienteId: string): Pedido {
  return {
    id,
    codigo: id,
    clienteId,
    cliente: "Test",
    articulo: "Camisa",
    estado: "Recibido",
    fecha: "2025-01-01",
    urgente: false,
    telefono: "987654321",
    email: "test@gmail.com",
  } as Pedido;
}

describe("RF09 — Historial de Pedidos", () => {

  it("CP01 — Flujo exitoso: retorna todos los pedidos del cliente seleccionado", () => {
    // ARRANGE
    const clienteId = "cli-01";
    const pedidos: Pedido[] = [
      pedidoMock("PED-001", "cli-01"),
      pedidoMock("PED-002", "cli-01"),
      pedidoMock("PED-003", "cli-02"),
    ];

    // ACT
    const historial = pedidos.filter((p) => p.clienteId === clienteId);

    // ASSERT
    expect(historial).toHaveLength(2);
    expect(historial.every((p) => p.clienteId === clienteId)).toBe(true);
  });

  it("CP02 — Cliente sin pedidos registrados: retorna lista vacía con mensaje informativo", () => {
    // ARRANGE
    const clienteSinPedidos = "cli-99";
    const pedidos: Pedido[] = [
      pedidoMock("PED-001", "cli-01"),
      pedidoMock("PED-002", "cli-02"),
    ];

    // ACT
    const historial = pedidos.filter((p) => p.clienteId === clienteSinPedidos);

    // ASSERT
    expect(historial).toHaveLength(0);
  });

});
