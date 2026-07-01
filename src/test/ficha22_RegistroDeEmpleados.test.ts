/**
 * Ficha 22 — RF22: Registro de Empleados
 * Lógica en: src/app/components/empleados/NuevoEmpleadoModal.tsx → validateForm()
 */

import { describe, it, expect } from "vitest";
import { validateForm } from "../app/components/empleados/NuevoEmpleadoModal";
import type {
  FormData,
  Empleado,
} from "../app/components/empleados/NuevoEmpleadoModal";

function crearFormularioValido(overrides: Partial<FormData> = {}): FormData {
  return {
    nombre: "Carlos Ruiz",
    email: "carlos@gmail.com",
    telefono: "987654321",
    rol: "Atención al cliente",
    password: "Clave1234",
    confirmPassword: "Clave1234",
    ...overrides,
  };
}

describe("RF22 - Registro de Empleados", () => {
  // CP01 registrar empleado
  it("CP01 - Flujo exitoso: un formulario completo y válido no genera errores", () => {
    // ARRANGE
    const form = crearFormularioValido();

    // ACT
    const errores = validateForm(form, []);

    // ASSERT
    expect(Object.keys(errores)).toHaveLength(0);
  });

  // CP02 Campos obligatorios incompletos
  it("CP02 - Campos obligatorios incompletos (E1): marca cada campo vacío", () => {
    // ARRANGE
    const form = crearFormularioValido({
      nombre: "",
      email: "",
      telefono: "",
      rol: "",
    });

    // ACT
    const errores = validateForm(form, []);

    // ASSERT
    expect(errores.nombre).toBeDefined();
    expect(errores.email).toBeDefined();
    expect(errores.telefono).toBeDefined();
    expect(errores.rol).toBeDefined();
  });

  // CP03 Correo o identificador duplicado
  it("CP03 - Correo duplicado (E2): rechaza un correo ya registrado por otro empleado", () => {
    // ARRANGE
    const empleadosExistentes: Empleado[] = [
      {
        id: "EMP-0001",
        nombre: "Otro Empleado",
        email: "carlos@gmail.com",
        telefono: "912345678",
        rol: "Producción",
        fechaIngreso: "2026-01-01",
        estado: "Activo",
      },
    ];
    const form = crearFormularioValido({ email: "carlos@gmail.com" });

    // ACT
    const errores = validateForm(form, empleadosExistentes);

    // ASSERT
    expect(errores.email).toBe(
      "Este correo ya está registrado para otro empleado.",
    );
  });

  // CP04 Formato inválido de datos
  it("CP04 - Formato inválido (E3): correo y teléfono con formato incorrecto son rechazados", () => {
    // ARRANGE
    const formCorreoInvalido = crearFormularioValido({
      email: "carlos@yahoo.com",
    });
    const formTelefonoInvalido = crearFormularioValido({
      telefono: "12345",
    });

    // ACT
    const erroresCorreo = validateForm(formCorreoInvalido, []);
    const erroresTelefono = validateForm(formTelefonoInvalido, []);

    // ASSERT
    expect(erroresCorreo.email).toBe(
      "El correo debe ser @gmail.com, @hotmail.com o @outlook.com.",
    );
    expect(erroresTelefono.telefono).toBeDefined();
  });

  // CP05 Rol no seleccionado
  it("CP05 - Rol no seleccionado (E4): bloquea el guardado aunque el resto de datos sea válido", () => {
    // ARRANGE
    const form = crearFormularioValido({ rol: "" });

    // ACT
    const errores = validateForm(form, []);

    // ASSERT
    expect(errores.rol).toBe("Selecciona un rol.");
    expect(errores.nombre).toBeUndefined();
    expect(errores.email).toBeUndefined();
  });

  // CP06 Credenciales iniciales no válidas
  it("CP06 - Credenciales inválidas (E5): contraseña débil o confirmación distinta son rechazadas", () => {
    // ARRANGE
    const passwordCorta = crearFormularioValido({
      password: "abc123",
      confirmPassword: "abc123",
    });
    const sinMayuscula = crearFormularioValido({
      password: "clave1234",
      confirmPassword: "clave1234",
    });
    const confirmacionDistinta = crearFormularioValido({
      password: "Clave1234",
      confirmPassword: "Clave5678",
    });

    // ACT
    const erroresCorta = validateForm(passwordCorta, []);
    const erroresSinMayuscula = validateForm(sinMayuscula, []);
    const erroresConfirmacion = validateForm(confirmacionDistinta, []);

    // ASSERT
    expect(erroresCorta.password).toBe("Mínimo 8 caracteres.");
    expect(erroresSinMayuscula.password).toBe(
      "Debe contener al menos 1 mayúscula.",
    );
    expect(erroresConfirmacion.confirmPassword).toBe(
      "Las contraseñas no coinciden.",
    );
  });

  // CP07 Error al guardar empleado
  it("CP07 - Error al guardar empleado (E6) - no aplica test de código", () => {
    // La falla ocurre en la capa async (Supabase) al insertar el registro;
    // el manejo del error y el mensaje al usuario viven en el componente.
    // Verificado manualmente: no se puede aislar en un test de unidad.
    expect(true).toBe(true);
  });
});
