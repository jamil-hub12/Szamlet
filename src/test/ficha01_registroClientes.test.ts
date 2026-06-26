/**
 * Ficha 01 — RF01: Registro de Clientes
 * Lógica en: src/app/utils/validaciones.ts
 *   - esNombreValido, esEmailValido, esTelefonoValido, esDNIValido, esRUCValido,
 *     esDireccionValida, detectarClienteDuplicado
 * Usada por: NuevoClienteModal.tsx
 */

import { describe, it, expect } from "vitest";
import {
  esNombreValido,
  esEmailValido,
  esTelefonoValido,
  esDNIValido,
  esRUCValido,
  esDireccionValida,
  detectarClienteDuplicado,
} from "../app/utils/validaciones";

describe("RF01 — Registro de Clientes", () => {
  it("CP01 — Flujo exitoso: Registro válido", () => {
    // ARRANGE
    const nombre = "Juan Pérez";
    const email = "juan@gmail.com";
    const celular = "987654321";
    const dni = "12345678";
    const ruc = "20123456789";
    const direccion = "Av. Gamarra 123, La Victoria";

    // ACT
    const nombreOk = esNombreValido(nombre);
    const emailOk = esEmailValido(email);
    const celularOk = esTelefonoValido(celular);
    const dniOk = esDNIValido(dni);
    const rucOk = esRUCValido(ruc);
    const direccionOk = esDireccionValida(direccion);

    // ASSERT
    expect(nombreOk).toBe(true);
    expect(emailOk).toBe(true);
    expect(celularOk).toBe(true);
    expect(dniOk).toBe(true);
    expect(rucOk).toBe(true);
    expect(direccionOk).toBe(true);
  });

  it("CP02 — Campos obligatorios incompletos (E1): campos vacíos son rechazados", () => {
    // ARRANGE
    const nombreVacio = "";
    const emailVacio = "";
    const dniVacio = "";

    // ACT
    const nombreOk = esNombreValido(nombreVacio);
    const emailOk = esEmailValido(emailVacio);
    const dniOk = esDNIValido(dniVacio);

    // ASSERT
    expect(nombreOk).toBe(false);
    expect(emailOk).toBe(false);
    expect(dniOk).toBe(false);
  });

  it("CP03 — Cliente ya registrado (E2): el sistema detecta DNI o RUC duplicado", () => {
    // ARRANGE
    const clientesExistentes = [
      { dni: "12345678", ruc: "20123456789" },
      { dni: "87654321", ruc: null },
    ];

    // ACT — intenta registrar con el mismo DNI que ya existe
    const resultadoDniDuplicado = detectarClienteDuplicado(
      clientesExistentes,
      "12345678",
      "",
    );
    // ACT — intenta registrar con el mismo RUC que ya existe
    const resultadoRucDuplicado = detectarClienteDuplicado(
      clientesExistentes,
      "",
      "20123456789",
    );
    // ACT — DNI/RUC nuevos, no deberían marcarse como duplicados
    const resultadoSinDuplicado = detectarClienteDuplicado(
      clientesExistentes,
      "11223344",
      "10111222333",
    );

    // ASSERT
    expect(resultadoDniDuplicado.dniDuplicado).toBeDefined();
    expect(resultadoRucDuplicado.rucDuplicado).toBeDefined();
    expect(resultadoSinDuplicado.dniDuplicado).toBeUndefined();
    expect(resultadoSinDuplicado.rucDuplicado).toBeUndefined();
  });

  it("CP04 — Correo electrónico inválido (E3): email con formato incorrecto es rechazado", () => {
    // ARRANGE
    const sinArroba = "juangmail.com";
    const sinDominio = "juan@";
    const conEspacios = "juan perez@gmail.com";
    const dobleArroba = "juan@@gmail.com";

    // ACT
    const sinArrobaOk = esEmailValido(sinArroba);
    const sinDominioOk = esEmailValido(sinDominio);
    const conEspaciosOk = esEmailValido(conEspacios);
    const dobleArrobaOk = esEmailValido(dobleArroba);

    // ASSERT
    expect(sinArrobaOk).toBe(false);
    expect(sinDominioOk).toBe(false);
    expect(conEspaciosOk).toBe(false);
    expect(dobleArrobaOk).toBe(false);
  });
});
