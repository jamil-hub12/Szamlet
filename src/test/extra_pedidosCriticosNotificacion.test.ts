import { describe, it, expect } from "vitest";
import { obtenerPedidosCriticosSinNotificar } from "../app/utils/validaciones";

/**
 * Test de regresión — no corresponde a una ficha numerada del laboratorio.
 *
 * Contexto: esPedidoCritico (RF48) existía pero nunca se conectaba a
 * ningún flujo real, porque el sistema no tenía ningún mecanismo de
 * notificaciones automáticas en segundo plano. Se construyó
 * obtenerPedidosCriticosSinNotificar() y se conectó en un useEffect de
 * EmpleadoDashboard.tsx para generar una alerta por pedido crítico al
 * cargar el dashboard, evitando duplicar la misma alerta el mismo día.
 */
describe("validaciones.ts - obtenerPedidosCriticosSinNotificar", () => {
  it("detecta un pedido crítico que todavía no ha sido notificado hoy", () => {
    // ARRANGE
    const pedidos = [
      { codigo: "PED-001", fechaEntrega: "2026-06-26", estado: "Recibido" },
    ];
    const notificaciones: { pedidoCodigo?: string; titulo: string; timestamp: string }[] = [];
    const fechaHoy = "2026-06-25";

    // ACT
    const resultado = obtenerPedidosCriticosSinNotificar(
      pedidos,
      notificaciones,
      fechaHoy,
    );

    // ASSERT
    expect(resultado).toHaveLength(1);
    expect(resultado[0].codigo).toBe("PED-001");
  });

  it("no repite la alerta si ya se notificó el mismo pedido hoy", () => {
    // ARRANGE
    const pedidos = [
      { codigo: "PED-001", fechaEntrega: "2026-06-26", estado: "Recibido" },
    ];
    const notificaciones = [
      {
        pedidoCodigo: "PED-001",
        titulo: "Pedido crítico",
        timestamp: "2026-06-25T10:00:00.000Z",
      },
    ];
    const fechaHoy = "2026-06-25";

    // ACT
    const resultado = obtenerPedidosCriticosSinNotificar(
      pedidos,
      notificaciones,
      fechaHoy,
    );

    // ASSERT
    expect(resultado).toHaveLength(0);
  });

  it("vuelve a notificar el mismo pedido si la alerta anterior fue de otro día", () => {
    // ARRANGE
    const pedidos = [
      { codigo: "PED-001", fechaEntrega: "2026-06-26", estado: "Recibido" },
    ];
    const notificaciones = [
      {
        pedidoCodigo: "PED-001",
        titulo: "Pedido crítico",
        timestamp: "2026-06-24T10:00:00.000Z", // ayer
      },
    ];
    const fechaHoy = "2026-06-25";

    // ACT
    const resultado = obtenerPedidosCriticosSinNotificar(
      pedidos,
      notificaciones,
      fechaHoy,
    );

    // ASSERT
    expect(resultado).toHaveLength(1);
  });

  it("no incluye pedidos que no son críticos", () => {
    // ARRANGE
    const pedidos = [
      { codigo: "PED-002", fechaEntrega: "2026-08-01", estado: "Recibido" },
    ];
    const notificaciones: { pedidoCodigo?: string; titulo: string; timestamp: string }[] = [];
    const fechaHoy = "2026-06-25";

    // ACT
    const resultado = obtenerPedidosCriticosSinNotificar(
      pedidos,
      notificaciones,
      fechaHoy,
    );

    // ASSERT
    expect(resultado).toHaveLength(0);
  });

  it("no confunde notificaciones de otro título con la alerta de pedido crítico", () => {
    // ARRANGE
    const pedidos = [
      { codigo: "PED-001", fechaEntrega: "2026-06-26", estado: "Recibido" },
    ];
    const notificaciones = [
      {
        pedidoCodigo: "PED-001",
        titulo: "Estado actualizado", // título distinto, no cuenta como alerta crítica
        timestamp: "2026-06-25T10:00:00.000Z",
      },
    ];
    const fechaHoy = "2026-06-25";

    // ACT
    const resultado = obtenerPedidosCriticosSinNotificar(
      pedidos,
      notificaciones,
      fechaHoy,
    );

    // ASSERT
    expect(resultado).toHaveLength(1);
  });
});
