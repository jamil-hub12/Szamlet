import { describe, it, expect } from "vitest";
import { validateForm } from "./NuevoEmpleadoModal";
import type { FormData, Empleado } from "./NuevoEmpleadoModal";

/**
 * Ficha 46 - RF46: Gestión de Empleados del Sistema
 * Momento 3 TDD - Test en código (Vitest)
 *
 * CP05 - Registro de empleado con datos incompletos (E3)
 */

function crearFormularioValido(overrides: Partial<FormData> = {}): FormData {
  return {
    nombre: "Ana Pérez",
    email: "ana@gmail.com",
    telefono: "987654321",
    rol: "Atención al cliente",
    password: "Clave1234",
    confirmPassword: "Clave1234",
    ...overrides,
  };
}

describe("RF46 - Gestión de Empleados del Sistema (NuevoEmpleadoModal46)", () => {
  it("CP05: bloquea el registro y muestra validación cuando faltan campos obligatorios", () => {
    // ARRANGE
    const formularioIncompleto: FormData = crearFormularioValido({
      nombre: "",
      email: "",
      telefono: "",
      rol: "",
      password: "",
      confirmPassword: "",
    });
    const empleadosExistentes: Empleado[] = [];

    // ACT
    const errores = validateForm(formularioIncompleto, empleadosExistentes);

    // ASSERT
    expect(errores.nombre).toBe("El nombre es obligatorio.");
    expect(errores.email).toBe("El correo es obligatorio.");
    expect(errores.telefono).toBe("El teléfono es obligatorio.");
    expect(errores.rol).toBe("Selecciona un rol.");
    expect(errores.password).toBe("La contraseña es obligatoria.");
  });

  it("CP05b: no genera errores cuando el formulario está completo y es válido", () => {
    // ARRANGE
    const formularioValido = crearFormularioValido();
    const empleadosExistentes: Empleado[] = [];

    // ACT
    const errores = validateForm(formularioValido, empleadosExistentes);

    // ASSERT
    expect(Object.keys(errores)).toHaveLength(0);
  });
});
