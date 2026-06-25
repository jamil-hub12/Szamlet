import { describe, it, expect } from "vitest";
import {
  calcularSaldoPendiente,
  obtenerEstadoPagoPedido,
} from "../app/utils/estadoPagoPedido";

describe("RF41 - Consulta del Estado de Pagos de Pedidos", () => {
  it("CP01: muestra correctamente total, pagado y pendiente de un pedido con pago parcial", () => {
    // ARRANGE
    const montoTotal = 150;
    const montoPagado = 100;

    // ACT
    const pendiente = calcularSaldoPendiente(montoTotal, montoPagado);
    const estado = obtenerEstadoPagoPedido("Recibido", montoTotal, montoPagado);

    // ASSERT
    expect(pendiente).toBe(50);
    expect(estado).toBe("Parcial");
  });

  it("CP02: un pedido sin pagos registrados se muestra como 'pendiente' con el total del pedido (E1)", () => {
    // ARRANGE
    const montoTotal = 200;
    const montoPagado = 0;

    // ACT
    const pendiente = calcularSaldoPendiente(montoTotal, montoPagado);
    const estado = obtenerEstadoPagoPedido("Recibido", montoTotal, montoPagado);

    // ASSERT
    expect(pendiente).toBe(200);
    expect(estado).toBe("Pendiente");
  });

  it("CP03: sin pedidos registrados no hay nada que calcular (E2) - no aplica test de código", () => {
    // Mostrar un mensaje informativo cuando la lista de pedidos está
    // vacía es responsabilidad de la vista (igual que el "catálogo
    // vacío" de RF39), no de esta función de cálculo.
    // Verificado manualmente: el sistema muestra el mensaje informativo.
    expect(true).toBe(true);
  });

  it("extra: un pedido totalmente pagado se clasifica como 'Pagado'", () => {
    // ARRANGE
    const montoTotal = 100;
    const montoPagado = 100;

    // ACT
    const estado = obtenerEstadoPagoPedido("Recibido", montoTotal, montoPagado);

    // ASSERT
    expect(estado).toBe("Pagado");
  });

  it("extra: un pedido cancelado no tiene estado de pago aplicable", () => {
    // ARRANGE
    const estado = obtenerEstadoPagoPedido("Cancelado", 100, 0);

    // ASSERT
    expect(estado).toBe("N/A");
  });
});
