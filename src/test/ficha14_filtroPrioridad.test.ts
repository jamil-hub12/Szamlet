/**
 * Ficha 14 — RF14: Filtro de Prioridad
 * Lógica en: src/app/utils/pedidosFiltros.ts  → filtrarPedidos()
 * Importada por: EmpleadoDashboard.tsx y AdminDashboard.tsx
 */

import { describe, it, expect } from "vitest";
import { filtrarPedidos } from "../app/utils/pedidosFiltros";
import type { Pedido } from "../app/contexts/PedidosContext";

function pedidoMock(id: string, urgente: boolean): Pedido {
  return {
    id, codigo: id, clienteId: "cli-01", cliente: "Test",
    articulo: "Camisa", estado: "Recibido", fecha: "2025-01-01",
    urgente, telefono: "987654321", email: "test@gmail.com",
  } as Pedido;
}

describe("RF14 — Filtro de Prioridad", () => {

  // CP01 Filtrado con datos
  it("CP01 — Flujo exitoso: filtro 'Urgente' retorna solo pedidos urgentes", () => {
    // ARRANGE
    const pedidos: Pedido[] = [
      pedidoMock("PED-001", true),
      pedidoMock("PED-002", false),
      pedidoMock("PED-003", true),
    ];
    const filtroPrioridad = "Urgente" as const;

    // ACT
    const resultado = filtrarPedidos(pedidos, { filtroPrioridad });

    // ASSERT
    expect(resultado).toHaveLength(2);
    expect(resultado.every((p) => p.urgente)).toBe(true);
  });

  // CP02 Filtro sin resultados
  it("CP02 — Sin pedidos con esa prioridad: filtro retorna lista vacía", () => {
    // ARRANGE
    const soloNormales: Pedido[] = [
      pedidoMock("PED-010", false),
      pedidoMock("PED-011", false),
    ];
    const filtroPrioridad = "Urgente" as const;

    // ACT
    const resultado = filtrarPedidos(soloNormales, { filtroPrioridad });

    // ASSERT
    expect(resultado).toHaveLength(0);
  });

});
