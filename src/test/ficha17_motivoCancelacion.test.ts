import { describe, it, expect } from "vitest";
import { esMotivoCancelacionValido } from "../app/utils/validaciones";

describe("RF17 - Registro de Motivo de Cancelación", () => {
  it("CP01 - esMotivoCancelacionValido retorna true con un motivo real y legible", () => {
    // ARRANGE
    const motivo = "Cliente cambió de opinión.";

    // ACT
    const resultado = esMotivoCancelacionValido(motivo);

    // ASSERT
    expect(resultado).toBe(true);
  });

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

  it("CP03 - esMotivoCancelacionValido retorna false para símbolos sueltos sin explicación", () => {
    // ARRANGE
    const motivoSimbolos = "!!!";

    // ACT
    const resultado = esMotivoCancelacionValido(motivoSimbolos);

    // ASSERT
    expect(resultado).toBe(false);
  });
});
