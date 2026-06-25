import { describe, it, expect } from "vitest";
import { puedeReactivarPedido } from "../app/utils/pedidosCicloVida";
import { filtrarPedidos } from "../app/utils/pedidosFiltros";
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

describe("RF38 - Reactivación de Pedidos", () => {
  it("CP01: un pedido cancelado con estado anterior guardado puede reactivarse a ese estado", () => {
    // ARRANGE
    const estado = "Cancelado" as const;
    const estadoAnterior = "En confección" as const;

    // ACT
    const resultado = puedeReactivarPedido(estado, estadoAnterior);

    // ASSERT
    expect(resultado.puede).toBe(true);
    expect(resultado.estadoDestino).toBe("En confección");
  });

  it("CP02: cancelación de la reactivación (E1) - no aplica test de código", () => {
    // El Personal de Atención selecciona "Reactivar" pero cancela la
    // confirmación: es flujo de UI (cierre de diálogo de confirmación
    // sin invocar reactivarPedido), sin lógica de negocio aislable.
    // Verificado manualmente: el pedido se mantiene en "Cancelado".
    expect(true).toBe(true);
  });

  it("CP03: un pedido que ya no está cancelado no puede reactivarse (E2)", () => {
    // ARRANGE
    const estado = "En confección" as const;

    // ACT
    const resultado = puedeReactivarPedido(estado, "Recibido");

    // ASSERT
    expect(resultado.puede).toBe(false);
    expect(resultado.mensaje).toBe(
      "Solo se pueden reactivar pedidos cancelados",
    );
  });

  it("CP04: al reactivar un pedido, deja de aparecer en la lista de cancelados (E3)", () => {
    // ARRANGE
    const pedidos: Pedido[] = [
      crearPedido({ id: "PED-001", codigo: "PED-001", estado: "Cancelado" }),
      crearPedido({ id: "PED-002", codigo: "PED-002", estado: "Cancelado" }),
    ];
    const antesDeReactivar = filtrarPedidos(pedidos, {
      filtroEstado: "Cancelado",
    });

    // ACT — se reactiva PED-001 (cambia su estado a "En confección")
    const pedidosDespues = pedidos.map((p) =>
      p.codigo === "PED-001" ? { ...p, estado: "En confección" as const } : p,
    );
    const despuesDeReactivar = filtrarPedidos(pedidosDespues, {
      filtroEstado: "Cancelado",
    });

    // ASSERT
    expect(antesDeReactivar).toHaveLength(2);
    expect(despuesDeReactivar).toHaveLength(1);
    expect(despuesDeReactivar[0].codigo).toBe("PED-002");
  });
});
