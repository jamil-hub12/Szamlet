/**
 * Ficha 10 — RF10: Búsqueda por Cliente / Código de Pedido
 * Lógica en: src/app/utils/pedidosFiltros.ts  → filtrarPedidos()
 * Importada por: EmpleadoDashboard.tsx y AdminDashboard.tsx
 */

import { describe, it, expect } from "vitest";
import { filtrarPedidos } from "../app/utils/pedidosFiltros";
import type { Pedido } from "../app/contexts/PedidosContext";

function pedidoMock(id: string, cliente: string): Pedido {
  return {
    id,
    codigo: id,
    clienteId: "cli-01",
    cliente,
    articulo: "Camisa",
    estado: "Recibido",
    fecha: "2025-01-01",
    urgente: false,
    telefono: "987654321",
    email: "test@gmail.com",
  } as Pedido;
}

describe("RF10 — Búsqueda por Cliente / Código de Pedido", () => {

  it("CP01 — Flujo exitoso: búsqueda por nombre retorna los pedidos coincidentes", () => {
    // ARRANGE
    const pedidos: Pedido[] = [
      pedidoMock("PED-001", "Ana García"),
      pedidoMock("PED-002", "Carlos López"),
      pedidoMock("PED-003", "Ana Torres"),
    ];
    const terminoBusqueda = "ana";

    // ACT
    const resultado = filtrarPedidos(pedidos, { busqueda: terminoBusqueda });

    // ASSERT
    expect(resultado).toHaveLength(2);
    expect(resultado.map((p) => p.id)).toEqual(
      expect.arrayContaining(["PED-001", "PED-003"]),
    );
  });

  it("CP02 — Sin coincidencias: búsqueda sin resultados retorna lista vacía", () => {
    // ARRANGE
    const pedidos: Pedido[] = [
      pedidoMock("PED-001", "Ana García"),
      pedidoMock("PED-002", "Carlos López"),
    ];
    const terminoInexistente = "xyz_inexistente";

    // ACT
    const resultado = filtrarPedidos(pedidos, { busqueda: terminoInexistente });

    // ASSERT
    expect(resultado).toHaveLength(0);
  });

});
