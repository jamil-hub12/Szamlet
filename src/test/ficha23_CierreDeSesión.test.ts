import { describe, it, expect } from "vitest";
import { debeRevalidarSesionPorStorage } from "../app/utils/validaciones";

describe("RF23 - Cierre de Sesión", () => {
  it("CP01 - debeRevalidarSesionPorStorage retorna true cuando localStorage se limpia por completo", () => {
    // ARRANGE
    const key = null;
    const newValue = null;

    // ACT
    const resultado = debeRevalidarSesionPorStorage(key, newValue);

    // ASSERT
    expect(resultado).toBe(true);
  });

  it("CP02 - debeRevalidarSesionPorStorage retorna true cuando se elimina la clave de sesión de Supabase", () => {
    // ARRANGE
    const key = "sb-proyecto-auth-token";
    const newValue = null;

    // ACT
    const resultado = debeRevalidarSesionPorStorage(key, newValue);

    // ASSERT
    expect(resultado).toBe(true);
  });

  it("CP03 - debeRevalidarSesionPorStorage retorna false para claves ajenas a Supabase", () => {
    // ARRANGE
    const key = "otra-clave";
    const newValue = null;

    // ACT
    const resultado = debeRevalidarSesionPorStorage(key, newValue);

    // ASSERT
    expect(resultado).toBe(false);
  });
});
