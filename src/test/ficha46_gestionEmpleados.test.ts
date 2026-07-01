import { describe, it, expect } from "vitest";
import {
  filtrarEmpleados,
  obtenerMensajeEmpleadosVacio,
} from "../app/utils/empleadosFiltros";
import type { Empleado } from "../app/contexts/EmpleadosContext";
import { validateForm } from "../app/components/empleados/NuevoEmpleadoModal";
import type {
  FormData,
  Empleado as EmpleadoForm,
} from "../app/components/empleados/NuevoEmpleadoModal";

/**
 * Ficha 46 - RF46: Gestión de Empleados del Sistema
 * Momento 3 TDD - Test en código (Vitest)
 *
 * CP01-CP04: src/app/utils/empleadosFiltros.ts (filtrarEmpleados, obtenerMensajeEmpleadosVacio)
 * CP05: src/app/components/empleados/NuevoEmpleadoModal.tsx (validateForm)
 */

function crearEmpleado(overrides: Partial<Empleado>): Empleado {
  return {
    id: "e1",
    codigo: "EMP-0001",
    nombre: "Empleado de prueba",
    email: "empleado@test.com",
    telefono: "999999999",
    rol: "Atención al cliente",
    fechaIngreso: "2026-01-01",
    estado: "Activo",
    permisos: [],
    ...overrides,
  };
}

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

describe("RF46 — Gestión de Empleados del Sistema", () => {
  // CP01 Visualización de empleados
  it("CP01: muestra la lista completa cuando no hay búsqueda aplicada", () => {
    // ARRANGE
    const empleados: Empleado[] = [
      crearEmpleado({ id: "e1", nombre: "Ana Pérez" }),
      crearEmpleado({ id: "e2", nombre: "Luis Gómez" }),
    ];

    // ACT
    const resultado = filtrarEmpleados(empleados, "");

    // ASSERT
    expect(resultado).toHaveLength(2);
  });

  // CP02 Búsqueda de empleado existente
  it("CP02: filtra y muestra el empleado correspondiente al buscar por nombre", () => {
    // ARRANGE
    const empleados: Empleado[] = [
      crearEmpleado({ id: "e1", nombre: "Ana Pérez" }),
      crearEmpleado({ id: "e2", nombre: "Luis Gómez" }),
    ];

    // ACT
    const resultado = filtrarEmpleados(empleados, "ana");

    // ASSERT
    expect(resultado).toHaveLength(1);
    expect(resultado[0].nombre).toBe("Ana Pérez");
  });

  // CP03 Empleado no encontrado
  it("CP03: muestra mensaje de sin resultados cuando la búsqueda no encuentra coincidencias", () => {
    // ARRANGE
    const empleados: Empleado[] = [
      crearEmpleado({ id: "e1", nombre: "Ana Pérez" }),
    ];

    // ACT
    const resultadoFiltrado = filtrarEmpleados(empleados, "xyz-inexistente");
    const mensaje = obtenerMensajeEmpleadosVacio(empleados.length);

    // ASSERT
    expect(resultadoFiltrado).toHaveLength(0);
    expect(mensaje).toBe("No se encontraron empleados con ese criterio.");
  });

  // CP04 Lista vacía de empleados
  it("CP04: muestra mensaje de sin resultados cuando no existen empleados registrados", () => {
    // ARRANGE
    const empleados: Empleado[] = [];

    // ACT
    const resultadoFiltrado = filtrarEmpleados(empleados, "");
    const mensaje = obtenerMensajeEmpleadosVacio(empleados.length);

    // ASSERT
    expect(resultadoFiltrado).toHaveLength(0);
    expect(mensaje).toBe("No hay empleados registrados. Agrega el primero.");
  });

  // CP05 Registro de empleado con datos incompletos
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
    const empleadosExistentes: EmpleadoForm[] = [];

    // ACT
    const errores = validateForm(formularioIncompleto, empleadosExistentes);

    // ASSERT
    expect(errores.nombre).toBe("El nombre es obligatorio.");
    expect(errores.email).toBe("El correo es obligatorio.");
    expect(errores.telefono).toBe("El teléfono es obligatorio.");
    expect(errores.rol).toBe("Selecciona un rol.");
    expect(errores.password).toBe("La contraseña es obligatoria.");
  });
});
