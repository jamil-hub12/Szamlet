import { describe, it, expect } from "vitest";
import {
  clasificarError,
  obtenerMensajeDeError,
  type TipoError,
} from "../app/utils/validaciones";

describe("RF29 - Gestión de Errores", () => {
  it("CP01 - clasificarError reconoce errores de validación", () => {
    // ARRANGE
    const error = new Error("Campo requerido: nombre");

    // ACT
    const resultado = clasificarError(error);

    // ASSERT
    expect(resultado).toBe("validacion");
  });

  it("CP02 - clasificarError reconoce errores de conexión y permiso", () => {
    // ARRANGE
    const errorConexion = new Error("Network timeout while fetching data");
    const errorPermiso = new Error("RLS policy violation: forbidden");

    // ACT
    const resultadoConexion = clasificarError(errorConexion);
    const resultadoPermiso = clasificarError(errorPermiso);

    // ASSERT
    expect(resultadoConexion).toBe("conexion");
    expect(resultadoPermiso).toBe("permiso");
  });

  it("CP03 - clasificarError reconoce duplicados y fallback de procesamiento", () => {
    // ARRANGE
    const errorDuplicado = new Error("Unique constraint violated");
    const errorDesconocido = new Error("Unexpected token x");

    // ACT
    const resultadoDuplicado = clasificarError(errorDuplicado);
    const resultadoDesconocido = clasificarError(errorDesconocido);

    // ASSERT
    expect(resultadoDuplicado).toBe("duplicado");
    expect(resultadoDesconocido).toBe("procesamiento");
  });

  it("CP04 - obtenerMensajeDeError devuelve un mensaje amigable sin exponer detalles técnicos", () => {
    // ARRANGE
    const error: unknown = new Error("stack trace interno");

    // ACT
    const mensaje = obtenerMensajeDeError(error);

    // ASSERT
    expect(mensaje.length).toBeGreaterThan(0);
    expect(mensaje.toLowerCase()).not.toContain("stack");
    expect(mensaje.toLowerCase()).not.toContain("trace");
  });

  it("CP05 - obtención de mensaje usa una categoría conocida", () => {
    // ARRANGE
    const categoria: TipoError = "validacion";

    // ACT
    const mensaje = obtenerMensajeDeError(new Error("required field"));

    // ASSERT
    expect(categoria).toBe("validacion");
    expect(mensaje).toContain("válidos");
  });

  it("CP06 - obtenerMensajeDeError devuelve un mensaje general para fallas internas", () => {
    // ARRANGE
    const errorInterno = new Error("Unexpected internal processing failure");

    // ACT
    const mensaje = obtenerMensajeDeError(errorInterno);

    // ASSERT
    expect(mensaje).toContain("error inesperado");
  });

  it("CP07 - obtenerMensajeDeError permite reintentar tras un error temporal", () => {
    // ARRANGE
    const errorTemporal = new Error("Network timeout");

    // ACT
    const mensaje = obtenerMensajeDeError(errorTemporal);

    // ASSERT
    expect(mensaje).toContain("conexión");
    expect(mensaje).toContain("intenta nuevamente");
  });
});
