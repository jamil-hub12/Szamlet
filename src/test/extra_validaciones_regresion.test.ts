import { describe, it, expect } from "vitest";
import { esRUCValido, esTelefonoValido, esDNIValido } from "../app/utils/validaciones";

/**
 * Test de regresión — no corresponde a una ficha numerada del laboratorio.
 *
 * Contexto: estas funciones existían en validaciones.ts pero no estaban
 * conectadas a ningún formulario real (cada uno tenía su propia regex
 * inline duplicada). Al conectarlas en NuevoClienteModal (EmpleadoDashboard)
 * y EditarClienteModal, se detectó que esRUCValido() era menos estricta
 * que la regla real ya usada en el formulario (debía exigir que el RUC
 * empiece con "10" o "20", no solo tener 11 dígitos). Se corrigió la
 * función para igualar la regla real, y se agrega este test para
 * cubrir esa corrección.
 */
describe("validaciones.ts - esRUCValido, esTelefonoValido, esDNIValido", () => {
  it("esRUCValido: acepta RUC de 11 dígitos que empieza en 10", () => {
    expect(esRUCValido("10123456789")).toBe(true);
  });

  it("esRUCValido: acepta RUC de 11 dígitos que empieza en 20", () => {
    expect(esRUCValido("20123456789")).toBe(true);
  });

  it("esRUCValido: rechaza RUC de 11 dígitos que no empieza en 10 ni 20", () => {
    expect(esRUCValido("30123456789")).toBe(false);
  });

  it("esRUCValido: rechaza RUC con menos de 11 dígitos", () => {
    expect(esRUCValido("1012345678")).toBe(false);
  });

  it("esTelefonoValido: acepta celular peruano válido (9 dígitos, empieza en 9)", () => {
    expect(esTelefonoValido("987654321")).toBe(true);
  });

  it("esTelefonoValido: rechaza número que no empieza en 9", () => {
    expect(esTelefonoValido("123456789")).toBe(false);
  });

  it("esDNIValido: acepta DNI de 8 dígitos", () => {
    expect(esDNIValido("12345678")).toBe(true);
  });

  it("esDNIValido: rechaza DNI con menos de 8 dígitos", () => {
    expect(esDNIValido("1234567")).toBe(false);
  });
});
