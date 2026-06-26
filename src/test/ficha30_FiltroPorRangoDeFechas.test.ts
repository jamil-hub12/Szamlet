import { describe, it, expect } from "vitest";
import { esRangoDeFechasValido } from "../app/utils/validaciones";

describe("RF30 - Filtro por Rango de Fechas", () => {
  it("CP01 - esRangoDeFechasValido retorna true cuando el rango es correcto", () => {
    // ARRANGE
    const fechaDesde = "2026-06-01";
    const fechaHasta = "2026-06-30";

    // ACT
    const resultado = esRangoDeFechasValido(fechaDesde, fechaHasta);

    // ASSERT
    expect(resultado).toBe(true);
  });

  it("CP02 - esRangoDeFechasValido retorna false cuando el formato es inválido", () => {
    // ARRANGE
    const fechaDesde = "20255-06-01";
    const fechaHasta = "2026-06-30";

    // ACT
    const resultado = esRangoDeFechasValido(fechaDesde, fechaHasta);

    // ASSERT
    expect(resultado).toBe(false);
  });

  it("CP03 - esRangoDeFechasValido retorna false cuando la fecha inicial es posterior a la final", () => {
    // ARRANGE
    const fechaDesde = "2026-07-01";
    const fechaHasta = "2026-06-30";

    // ACT
    const resultado = esRangoDeFechasValido(fechaDesde, fechaHasta);

    // ASSERT
    expect(resultado).toBe(false);
  });

  it("CP04 - esRangoDeFechasValido retorna true si falta una de las fechas", () => {
    // ARRANGE
    const fechaDesde = "2026-06-01";
    const fechaHasta = "";

    // ACT
    const resultado = esRangoDeFechasValido(fechaDesde, fechaHasta);

    // ASSERT
    expect(resultado).toBe(true);
  });
});
