import { describe, it, expect } from "vitest";
import {
  filtrarPedidos,
  filtrarPedidosAdmin,
} from "../app/utils/pedidosFiltros";
import type { Pedido } from "../app/contexts/PedidosContext";

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

describe("RF37 - Visualización de Pedidos Cancelados", () => {
  // CP01 visualización de pedidos cancelados
  it("CP01: muestra la lista de pedidos cancelados con su motivo (Personal de Atención)", () => {
    // ARRANGE
    const pedidos: Pedido[] = [
      crearPedido({
        id: "PED-001",
        codigo: "PED-001",
        estado: "Cancelado",
        motivoCancelacion: "Cliente canceló por demora",
      }),
      crearPedido({ id: "PED-002", codigo: "PED-002", estado: "Recibido" }),
    ];

    // ACT
    const resultado = filtrarPedidos(pedidos, { filtroEstado: "Cancelado" });

    // ASSERT
    expect(resultado).toHaveLength(1);
    expect(resultado[0].motivoCancelacion).toBe("Cliente canceló por demora");
  });

  // CP01-Admin visualización de pedidos cancelados
  it("CP01-Admin: el Administrador también puede visualizar pedidos cancelados", () => {
    // ARRANGE
    const pedidos: Pedido[] = [
      crearPedido({ id: "PED-001", codigo: "PED-001", estado: "Cancelado" }),
      crearPedido({ id: "PED-002", codigo: "PED-002", estado: "Entregado" }),
    ];

    // ACT
    const resultado = filtrarPedidosAdmin(pedidos, {
      filtroEstado: "Cancelado",
    });

    // ASSERT
    expect(resultado).toHaveLength(1);
    expect(resultado[0].estado).toBe("Cancelado");
  });

  // CP02 No existen pedidos cancelados
  it("CP02: muestra mensaje informativo cuando no existen pedidos cancelados (E1)", () => {
    // ARRANGE
    const pedidos: Pedido[] = [
      crearPedido({ id: "PED-001", codigo: "PED-001", estado: "Recibido" }),
    ];

    // ACT
    const resultado = filtrarPedidos(pedidos, { filtroEstado: "Cancelado" });

    // ASSERT
    expect(resultado).toHaveLength(0);
  });

  // CP03 No se aplica el filtro de cancelados
  it("CP03: sin aplicar filtro de cancelados, se muestra la lista general (E2)", () => {
    // ARRANGE
    const pedidos: Pedido[] = [
      crearPedido({ id: "PED-001", codigo: "PED-001", estado: "Recibido" }),
      crearPedido({ id: "PED-002", codigo: "PED-002", estado: "Cancelado" }),
      crearPedido({
        id: "PED-003",
        codigo: "PED-003",
        estado: "En confección",
      }),
    ];

    // ACT
    const resultado = filtrarPedidos(pedidos, { filtroEstado: "Todos" });

    // ASSERT
    expect(resultado).toHaveLength(3);
  });

  // CP04 Actualización del listado de pedidos cancelados
  it("CP04: la lista se actualiza al registrarse un nuevo pedido cancelado (E3)", () => {
    // ARRANGE
    const pedidosAntes: Pedido[] = [
      crearPedido({ id: "PED-001", codigo: "PED-001", estado: "Cancelado" }),
    ];
    const resultadoAntes = filtrarPedidos(pedidosAntes, {
      filtroEstado: "Cancelado",
    });

    // ACT — se registra un nuevo pedido cancelado en el sistema
    const pedidosDespues: Pedido[] = [
      ...pedidosAntes,
      crearPedido({ id: "PED-002", codigo: "PED-002", estado: "Cancelado" }),
    ];
    const resultadoDespues = filtrarPedidos(pedidosDespues, {
      filtroEstado: "Cancelado",
    });

    // ASSERT
    expect(resultadoAntes).toHaveLength(1);
    expect(resultadoDespues).toHaveLength(2);
  });
});
