import { describe, it, expect } from "vitest";
import {
  esEmailValido,
  esTelefonoValido,
  esDNIValido,
  esRUCValido,
  esNombreValido,
  esCantidadValida,
  esMontoValido,
} from "../app/utils/validaciones";

describe("RF25 - Validación de Formatos", () => {
  // CP01 validar formatos correctos
  it("CP01 - Flujo exitoso: todos los formatos válidos pasan la validación", () => {
    // ARRANGE
    const nombre = "María López";
    const email = "maria@gmail.com";
    const telefono = "987654321";
    const dni = "12345678";
    const ruc = "20123456789";

    // ACT
    const nombreOk = esNombreValido(nombre);
    const emailOk = esEmailValido(email);
    const telefonoOk = esTelefonoValido(telefono);
    const dniOk = esDNIValido(dni);
    const rucOk = esRUCValido(ruc);

    // ASSERT
    expect(nombreOk).toBe(true);
    expect(emailOk).toBe(true);
    expect(telefonoOk).toBe(true);
    expect(dniOk).toBe(true);
    expect(rucOk).toBe(true);
  });

  // CP02 Campo obligatorio vacío
  it("CP02 - Campo obligatorio vacío (E1): campos vacíos son rechazados", () => {
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

  // CP03 Formato de documento inválido
  it("CP03 - Formato de documento inválido (E2): DNI/RUC con longitud o caracteres incorrectos", () => {
    // ARRANGE
    const dniCorto = "1234";
    const dniConLetras = "1234abcd";
    const rucSinPrefijoValido = "30123456789";

    // ACT
    const dniCortoOk = esDNIValido(dniCorto);
    const dniConLetrasOk = esDNIValido(dniConLetras);
    const rucOk = esRUCValido(rucSinPrefijoValido);

    // ASSERT
    expect(dniCortoOk).toBe(false);
    expect(dniConLetrasOk).toBe(false);
    expect(rucOk).toBe(false);
  });

  // CP04 Correo electrónico inválido
  it("CP04 - Correo electrónico inválido (E3): el sistema rechaza correos sin estructura válida", () => {
    // ARRANGE
    const sinArroba = "mariagmail.com";
    const sinDominio = "maria@";
    const conEspacios = "maria lopez@gmail.com";

    // ACT
    const sinArrobaOk = esEmailValido(sinArroba);
    const sinDominioOk = esEmailValido(sinDominio);
    const conEspaciosOk = esEmailValido(conEspacios);

    // ASSERT
    expect(sinArrobaOk).toBe(false);
    expect(sinDominioOk).toBe(false);
    expect(conEspaciosOk).toBe(false);
  });

  // CP05 Teléfono inválido
  it("CP05 - Teléfono inválido (E4): incompleto, con letras o longitud incorrecta", () => {
    // ARRANGE
    const incompleto = "98765";
    const conLetras = "98765abcd";
    const longitudIncorrecta = "9876543210";

    // ACT
    const incompletoOk = esTelefonoValido(incompleto);
    const conLetrasOk = esTelefonoValido(conLetras);
    const longitudIncorrectaOk = esTelefonoValido(longitudIncorrecta);

    // ASSERT
    expect(incompletoOk).toBe(false);
    expect(conLetrasOk).toBe(false);
    expect(longitudIncorrectaOk).toBe(false);
  });

  // CP06 Cantidad o valor numérico inválido
  it("CP06 - Cantidad o valor numérico inválido (E6): texto, cero, negativo o fuera de rango", () => {
    // ARRANGE
    const cantidadCero = 0;
    const cantidadNegativa = -5;
    const cantidadDecimal = 2.5;
    const montoNegativo = -10;
    const montoConTextoInvalido = "abc";

    // ACT
    const cantidadCeroOk = esCantidadValida(cantidadCero);
    const cantidadNegativaOk = esCantidadValida(cantidadNegativa);
    const cantidadDecimalOk = esCantidadValida(cantidadDecimal);
    const montoNegativoOk = esMontoValido(montoNegativo);
    const montoTextoOk = esMontoValido(montoConTextoInvalido);

    // ASSERT
    expect(cantidadCeroOk).toBe(false);
    expect(cantidadNegativaOk).toBe(false);
    expect(cantidadDecimalOk).toBe(false);
    expect(montoNegativoOk).toBe(false);
    expect(montoTextoOk).toBe(false);
  });

  // CP07 Corrección de datos antes de guardar
  it("CP07 - Corrección de datos antes de guardar (E7): el dato corregido vuelve a validarse y pasa", () => {
    // ARRANGE — correo inválido que el usuario corrige después del error
    const emailInvalido = "maria@";
    const emailCorregido = "maria@gmail.com";

    // ACT
    const primeraValidacion = esEmailValido(emailInvalido);
    const segundaValidacion = esEmailValido(emailCorregido);

    // ASSERT — la primera validación falla, la segunda (tras corregir) pasa
    expect(primeraValidacion).toBe(false);
    expect(segundaValidacion).toBe(true);
  });
});
