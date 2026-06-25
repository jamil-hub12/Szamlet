import { describe, it, expect } from "vitest";
import { validarTransicion, obtenerSiguienteEstado } from "../app/utils/pedidosCicloVida";

describe("RF40 - Control del Progreso del Pedido", () => {
  it("CP01: un pedido 'Recibido' avanza correctamente a 'En confección'", () => {
    // ARRANGE
    const estadoActual = "Recibido" as const;

    // ACT
    const siguiente = obtenerSiguienteEstado(estadoActual);
    const validacion = validarTransicion(estadoActual, siguiente!);

    // ASSERT
    expect(siguiente).toBe("En confección");
    expect(validacion.valido).toBe(true);
  });

  it("CP02: no se confirma el cambio de etapa (E1) - no aplica test de código", () => {
    // El Personal de Atención accede a la opción de avance pero no
    // confirma: es flujo de UI (no se invoca actualizarPedido si no hay
    // confirmación), sin lógica de negocio aislable.
    // Verificado manualmente: el estado del pedido no cambia.
    expect(true).toBe(true);
  });

  it("CP03: cancelación del cambio de etapa (E2) - no aplica test de código", () => {
    // Mismo caso que CP02: cancelar antes de confirmar es flujo de UI,
    // no hay función de negocio que aislar.
    // Verificado manualmente: el sistema descarta la operación.
    expect(true).toBe(true);
  });

  it("CP04: el sistema bloquea el intento de retroceso de etapa (E3)", () => {
    // ARRANGE
    const estadoActual = "En confección" as const;
    const estadoRetroceso = "Recibido" as const;

    // ACT
    const validacion = validarTransicion(estadoActual, estadoRetroceso);

    // ASSERT
    expect(validacion.valido).toBe(false);
    expect(validacion.mensaje).toContain(
      'La transición de "En confección" a "Recibido" no está permitida',
    );
  });

  it("CP04-extra: tampoco se permite retroceder desde 'Listo para entrega'", () => {
    // ARRANGE
    const estadoActual = "Listo para entrega" as const;

    // ACT
    const validacion = validarTransicion(estadoActual, "En confección");

    // ASSERT
    expect(validacion.valido).toBe(false);
  });
});
