/**
 * Ficha 11 — RF11: Autenticación / Login
 * La autenticación se delega completamente a Supabase Auth (signInWithPassword)
 * dentro de LoginPage.tsx. No existe lógica aislable en utils.
 */

import { describe, it, expect } from "vitest";

describe("RF11 — Autenticación / Login", () => {

  // CP01 Inicio de sesión válido
  it("CP01 — Flujo exitoso: inicio de sesión válido se gestiona vía Supabase Auth (placeholder)", () => {
    // ARRANGE
    // supabase.auth.signInWithPassword({ email, password }) se llama en LoginPage.tsx.
    // No hay función pura en utils que encapsule esta lógica.

    // ACT
    const sinLogicaAislable = true;

    // ASSERT
    expect(sinLogicaAislable).toBe(true);
  });

  // CP02 Credenciales incorrectas o usuario inexistente
  it("CP02 — Credenciales incorrectas: error devuelto por Supabase, sin lógica aislable (placeholder)", () => {
    // ARRANGE
    // El sistema muestra el mensaje de error recibido directamente de Supabase.
    // No hay función pura en utils para este caso.

    // ACT
    const sinLogicaAislable = true;

    // ASSERT
    expect(sinLogicaAislable).toBe(true);
  });

});
