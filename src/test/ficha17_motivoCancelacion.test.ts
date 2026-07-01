import { describe, it, expect } from "vitest";
import { esMotivoCancelacionValido } from "../app/utils/validaciones";

describe("RF17 - Registro de Motivo de Cancelación", () => {
  // CP01 registrar motivo de cancelación
  it("CP01 - esMotivoCancelacionValido retorna true con un motivo real y legible", () => {
    // ARRANGE
    const motivo = "Cliente cambió de opinión.";

    // ACT
    const resultado = esMotivoCancelacionValido(motivo);

    // ASSERT
    expect(resultado).toBe(true);
  });

  // CP02 Motivo de cancelación vacío
  it("CP02 - esMotivoCancelacionValido retorna false cuando el motivo está vacío o solo tiene espacios", () => {
    // ARRANGE
    const motivoVacio = "";
    const motivoEspacios = "   ";

    // ACT
    const resultadoVacio = esMotivoCancelacionValido(motivoVacio);
    const resultadoEspacios = esMotivoCancelacionValido(motivoEspacios);

    // ASSERT
    expect(resultadoVacio).toBe(false);
    expect(resultadoEspacios).toBe(false);
  });

  // CP03 Motivo compuesto solo por espacios
  it("CP03 - esMotivoCancelacionValido retorna false para símbolos sueltos sin explicación", () => {
    // ARRANGE
    const motivoSimbolos = "!!!";

    // ACT
    const resultado = esMotivoCancelacionValido(motivoSimbolos);

    // ASSERT
    expect(resultado).toBe(false);
  });

  // CP04 Pedido no disponible para cancelación
  it("CP04 - esMotivoCancelacionValido retorna true cuando el motivo contiene letras y puntuación normal", () => {
    // ARRANGE
    const motivo = "Cliente no pudo recogerlo, gracias.";

    // ACT
    const resultado = esMotivoCancelacionValido(motivo);

    // ASSERT
    expect(resultado).toBe(true);
  });

  // CP05 Cancelación del formulario
  it("CP05 - esMotivoCancelacionValido retorna true cuando el motivo incluye números y texto", () => {
    // ARRANGE
    const motivo = "Pedido 123 cancelado por cambio de talla";

    // ACT
    const resultado = esMotivoCancelacionValido(motivo);

    // ASSERT
    expect(resultado).toBe(true);
  });

  // CP06 Falta de permisos para cancelar pedidos
  it("CP06 - esMotivoCancelacionValido retorna false cuando solo hay símbolos mezclados con espacios", () => {
    // ARRANGE
    const motivo = "  ...   !!!  ";

    // ACT
    const resultado = esMotivoCancelacionValido(motivo);

    // ASSERT
    expect(resultado).toBe(false);
  });

  // CP07 Falla al registrar el motivo
  it("CP07 - esMotivoCancelacionValido retorna true cuando el motivo tiene tildes y caracteres especiales válidos", () => {
    // ARRANGE
    const motivo = "Cliente cambió de opinión por demora excesiva.";

    // ACT
    const resultado = esMotivoCancelacionValido(motivo);

    // ASSERT
    expect(resultado).toBe(true);
  });
});
