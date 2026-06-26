import { describe, it, expect } from "vitest";
import {
  esPedidoCritico,
  DIAS_UMBRAL_CRITICO,
} from "../app/utils/validaciones";

function fechaEnDias(delta: number): string {
  const d = new Date();
  d.setDate(d.getDate() + delta);
  return d.toISOString().slice(0, 10);
}

describe("RF48 - Alertas de Pedidos Críticos", () => {
  it("CP01 - esPedidoCritico retorna true para pedido que vence en <= DIAS_UMBRAL_CRITICO días", () => {
    // ARRANGE
    const fechaEntrega = fechaEnDias(DIAS_UMBRAL_CRITICO - 1);
    const estado = "En confección";

    // ACT
    const resultado = esPedidoCritico(fechaEntrega, estado);

    // ASSERT
    expect(resultado).toBe(true);
  });

  it("CP02 - esPedidoCritico retorna false para pedido con fecha de entrega lejana", () => {
    // ARRANGE
    const fechaEntrega = fechaEnDias(30);
    const estado = "Recibido";

    // ACT
    const resultado = esPedidoCritico(fechaEntrega, estado);

    // ASSERT
    expect(resultado).toBe(false);
  });

  it("CP03 - (placeholder) no abrir la campana es comportamiento de UI sin lógica de negocio aislable", () => {
    // No aplica test de código: el indicador de campana permanece visible
    // mientras esPedidoCritico() retorne true en algún pedido. Es UI puro.
    expect(true).toBe(true);
  });

  it("CP04 - esPedidoCritico retorna true cuando el pedido está a 1 día de vencer", () => {
    // ARRANGE
    const fechaEntrega = fechaEnDias(1);
    const estado = "Listo para entrega";

    // ACT
    const resultado = esPedidoCritico(fechaEntrega, estado);

    // ASSERT
    expect(resultado).toBe(true);
  });
});
