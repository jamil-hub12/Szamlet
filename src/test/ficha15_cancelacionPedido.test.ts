/**
 * Ficha 15 — RF15: Cancelación de Pedidos
 * Lógica en: src/app/utils/pedidosCicloVida.ts  → puedeCancelarPedido()
 * Importada por: EmpleadoDashboard.tsx
 * Validación de motivo: lógica inline motivoCancelacion.trim() en EmpleadoDashboard.tsx
 */

import { describe, it, expect } from "vitest";
import { puedeCancelarPedido } from "../app/utils/pedidosCicloVida";

// Representa la validación inline del componente: motivoCancelacion.trim()
function esMotivoCancelacionValido(motivo: string): boolean {
  return motivo.trim().length > 0;
}

describe("RF15 — Cancelación de Pedidos", () => {

  // CP01 Cancelación de pedido
  it("CP01 — Flujo exitoso: pedido no entregado puede cancelarse con motivo válido", () => {
    // ARRANGE
    const estado = "Recibido" as const;
    const motivo = "Cliente solicitó cancelación por cambio de diseño";

    // ACT
    const puedeCancelar  = puedeCancelarPedido(estado);
    const motivoEsValido = esMotivoCancelacionValido(motivo);

    // ASSERT
    expect(puedeCancelar.puede).toBe(true);
    expect(motivoEsValido).toBe(true);
  });

  // CP02 Pedido entregado
  it("CP02 — Pedido entregado: cancelación bloqueada", () => {
    // ARRANGE
    const estado = "Entregado" as const;

    // ACT
    const resultado = puedeCancelarPedido(estado);

    // ASSERT
    expect(resultado.puede).toBe(false);
    expect(resultado.mensaje).toContain("entregado");
  });

  // CP03 Motivo vacío
  it("CP03 — Motivo vacío: cancelación bloqueada hasta completar el campo", () => {
    // ARRANGE
    const motivoVacio    = "";
    const motivoEspacios = "   ";

    // ACT
    const resultadoVacio    = esMotivoCancelacionValido(motivoVacio);
    const resultadoEspacios = esMotivoCancelacionValido(motivoEspacios);

    // ASSERT
    expect(resultadoVacio).toBe(false);
    expect(resultadoEspacios).toBe(false);
  });

});
