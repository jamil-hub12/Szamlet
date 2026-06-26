/**
 * Ficha 05 — RF05: Edición de Clientes
 * Lógica en: src/app/utils/validaciones.ts -> validarEdicionCliente
 * Extraída de: EditarClienteModal.tsx (función validate() inline)
 * Importada por: EditarClienteModal.tsx
 */

import { describe, it, expect } from "vitest";
import { validarEdicionCliente } from "../app/utils/validaciones";

describe("RF05 — Edición de Clientes", () => {
  it("CP01 — Flujo exitoso: Edición válida", () => {
    // ARRANGE
    const form = {
      nombre: "Juan Pérez",
      email: "juan@gmail.com",
      celular: "987654321",
      direccion: "Av. Gamarra 123, La Victoria",
    };
    const clienteActualId = "cli-1";
    const clientesExistentes = [
      { id: "cli-1", email: "juan@gmail.com" },
      { id: "cli-2", email: "maria@outlook.com" },
    ];

    // ACT
    const error = validarEdicionCliente(
      form,
      clienteActualId,
      clientesExistentes,
    );

    // ASSERT — la edición es válida, no hay errores
    expect(error).toBeNull();
  });

  it("CP02 — Campos obligatorios vacíos (E1): el sistema bloquea la actualización", () => {
    // ARRANGE
    const formSinNombre = {
      nombre: "",
      email: "juan@gmail.com",
      celular: "987654321",
      direccion: "",
    };
    const formSinCelular = {
      nombre: "Juan Pérez",
      email: "",
      celular: "",
      direccion: "",
    };
    const clienteActualId = "cli-1";
    const clientesExistentes = [{ id: "cli-1", email: "juan@gmail.com" }];

    // ACT
    const errorSinNombre = validarEdicionCliente(
      formSinNombre,
      clienteActualId,
      clientesExistentes,
    );
    const errorSinCelular = validarEdicionCliente(
      formSinCelular,
      clienteActualId,
      clientesExistentes,
    );

    // ASSERT — campos obligatorios (nombre, celular) vacíos bloquean el guardado
    expect(errorSinNombre).not.toBeNull();
    expect(errorSinNombre?.campo).toBe("nombre");
    expect(errorSinCelular).not.toBeNull();
    expect(errorSinCelular?.campo).toBe("celular");
  });
});
