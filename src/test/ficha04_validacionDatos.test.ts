/**
 * Ficha 04 — RF04: Validación de Datos
 * Lógica en: src/app/utils/validaciones.ts
 *   - esEmailValido, esTelefonoValido, esDNIValido, esRUCValido (formato)
 *   - soloNumeros, esMontoValido (consistencia de datos numéricos)
 * Usada transversalmente por los formularios del sistema (Clientes, Pedidos,
 * Productos, Empleados, Pagos).
 *
 * Nota: RF04 reutiliza las mismas funciones de validaciones.ts que RF01,
 * pero valida la regla transversal de "formato correcto antes de guardar",
 * no el flujo de registro de clientes en sí (eso es RF01).
 */

import { describe, it, expect } from "vitest";
import {
  esEmailValido,
  esTelefonoValido,
  esDNIValido,
  esRUCValido,
  soloNumeros,
  esMontoValido,
} from "../app/utils/validaciones";

describe("RF04 — Validación de Datos", () => {
  // CP01 Validación correcta
  it("CP01 — Flujo exitoso: Validación correcta", () => {
    // ARRANGE
    const email = "cliente@gmail.com";
    const telefono = "987654321";
    const dni = "12345678";
    const ruc = "20123456789";
    const monto = "150.50";

    // ACT
    const emailOk = esEmailValido(email);
    const telefonoOk = esTelefonoValido(telefono);
    const dniOk = esDNIValido(dni);
    const rucOk = esRUCValido(ruc);
    const montoOk = esMontoValido(monto);

    // ASSERT — todos los campos con formato correcto pasan la validación
    expect(emailOk).toBe(true);
    expect(telefonoOk).toBe(true);
    expect(dniOk).toBe(true);
    expect(rucOk).toBe(true);
    expect(montoOk).toBe(true);
  });

  // CP02 Campos obligatorios vacíos
  it("CP02 — Campos obligatorios vacíos (E1): el sistema bloquea el registro", () => {
    // ARRANGE
    const emailVacio = "";
    const telefonoVacio = "";
    const dniVacio = "";

    // ACT
    const emailOk = esEmailValido(emailVacio);
    const telefonoOk = esTelefonoValido(telefonoVacio);
    const dniOk = esDNIValido(dniVacio);

    // ASSERT — los campos vacíos no cumplen el formato esperado
    expect(emailOk).toBe(false);
    expect(telefonoOk).toBe(false);
    expect(dniOk).toBe(false);
  });

  // CP03 Formato inválido de datos
  it("CP03 — Formato inválido de datos (E2): correo, teléfono o DNI con formato incorrecto", () => {
    // ARRANGE
    const emailMalFormado = "cliente@@gmail.com";
    const telefonoMalFormado = "12345"; // no empieza en 9, menos de 9 dígitos
    const dniMalFormado = "123456"; // menos de 8 dígitos

    // ACT
    const emailOk = esEmailValido(emailMalFormado);
    const telefonoOk = esTelefonoValido(telefonoMalFormado);
    const dniOk = esDNIValido(dniMalFormado);

    // ASSERT — el sistema detecta el error de formato y no permite continuar
    expect(emailOk).toBe(false);
    expect(telefonoOk).toBe(false);
    expect(dniOk).toBe(false);
  });

  // CP04 Datos inconsistentes
  it("CP04 — Datos inconsistentes (E3): texto en campos numéricos o valores negativos", () => {
    // ARRANGE
    const textoEnCampoNumerico = "abc123";
    const montoNegativo = -50;
    const montoConMasDeDosDecimales = "10.999";

    // ACT
    const esNumericoOk = soloNumeros(textoEnCampoNumerico);
    const montoNegativoOk = esMontoValido(montoNegativo);
    const montoDecimalesOk = esMontoValido(montoConMasDeDosDecimales);

    // ASSERT — el sistema detecta los valores inválidos y bloquea el registro
    expect(esNumericoOk).toBe(false);
    expect(montoNegativoOk).toBe(false);
    expect(montoDecimalesOk).toBe(false);
  });
});
