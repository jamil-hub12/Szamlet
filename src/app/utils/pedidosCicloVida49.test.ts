import { describe, it, expect } from "vitest";
import {
  ETAPAS_PRINCIPALES,
  obtenerEtapasCompletadas,
  estaEnFlujoNormal,
} from "./pedidosCicloVida";

describe("RF49 - Trazabilidad de Pedidos", () => {
  it("CP01 - obtenerEtapasCompletadas retorna todas las etapas hasta la actual", () => {
    // ARRANGE
    const estadoActual = "Listo para entrega";

    // ACT
    const etapas = obtenerEtapasCompletadas(estadoActual);

    // ASSERT
    expect(etapas).toEqual(["Recibido", "En confección", "Listo para entrega"]);
    expect(etapas.length).toBe(3);
  });

  it("CP02 - obtenerEtapasCompletadas para pedido recién creado devuelve solo la etapa inicial", () => {
    // ARRANGE
    const estadoActual = "Recibido";

    // ACT
    const etapas = obtenerEtapasCompletadas(estadoActual);

    // ASSERT
    expect(etapas).toEqual(["Recibido"]);
    expect(etapas.length).toBe(1);
  });

  it("CP03 - estaEnFlujoNormal distingue estados del flujo principal de Cancelado/Vencido", () => {
    // ARRANGE & ACT & ASSERT
    expect(estaEnFlujoNormal("Recibido")).toBe(true);
    expect(estaEnFlujoNormal("Entregado")).toBe(true);
    expect(estaEnFlujoNormal("Cancelado")).toBe(false);
    expect(estaEnFlujoNormal("Vencido")).toBe(false);
  });

  it("CP04 - (placeholder) volver al detalle sin seleccionar etapa es flujo de UI sin lógica aislable", () => {
    // No aplica test de código: navegar de regreso al detalle del pedido sin
    // seleccionar una etapa es comportamiento de UI puro verificado manualmente.
    expect(ETAPAS_PRINCIPALES.length).toBe(4);
  });
});
