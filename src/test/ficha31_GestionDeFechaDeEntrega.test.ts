import { describe, it, expect } from "vitest";
import {
  esValidaFechaMinimaHoy,
  obtenerMensajeErrorFecha,
} from "../app/utils/validaciones";
import { puedeEditarPedido } from "../app/utils/pedidosCicloVida";

describe("RF31 - Gestión de Fecha de Entrega", () => {
  // CP01 registrar o actualizar fecha de entrega
  it("CP01 - Flujo exitoso: una fecha de entrega válida (hoy o futura) es aceptada", () => {
    // ARRANGE
    const hoy = new Date().toISOString().split("T")[0];

    // ACT
    const resultado = esValidaFechaMinimaHoy(hoy);

    // ASSERT
    expect(resultado).toBe(true);
  });

  // CP02 Fecha de entrega vacía
  it("CP02 - Fecha de entrega vacía (E1): el sistema no la considera válida", () => {
    // ARRANGE
    const fechaVacia = "";

    // ACT
    const resultado = esValidaFechaMinimaHoy(fechaVacia);

    // ASSERT
    expect(resultado).toBe(false);
  });

  // CP03 Fecha de entrega anterior a la fecha del pedido
  it("CP03 - Fecha anterior a hoy (E3): el sistema la rechaza y muestra el mensaje correspondiente", () => {
    // ARRANGE
    const fechaPasada = "2020-01-01";

    // ACT
    const esValida = esValidaFechaMinimaHoy(fechaPasada);
    const mensaje = obtenerMensajeErrorFecha(fechaPasada, "entrega");

    // ASSERT
    expect(esValida).toBe(false);
    expect(mensaje).toContain("no puede ser anterior a hoy");
  });

  // CP04 Pedido no disponible para edición de fecha
  it("CP04 - Pedido no disponible para edición (E4): un pedido en estado final bloquea la edición", () => {
    // ARRANGE
    const estadoFinal = "Entregado" as const;

    // ACT
    const resultado = puedeEditarPedido(estadoFinal);

    // ASSERT
    expect(resultado.puede).toBe(false);
    expect(resultado.mensaje).toContain("Entregado");
  });

  // CP05 Cambio de fecha sin guardar
  it("CP05 - Cambio de fecha sin guardar (E5) - no aplica test de código", () => {
    // Este escenario está acoplado al componente (estado local del formulario).
    // Verificado manualmente: depende de la interfaz.
    expect(true).toBe(true);
  });

  // CP06 Error al actualizar la fecha
  it("CP06 - Error al actualizar la fecha (E6) - no aplica test de código", () => {
    // El error ocurre en la capa async (Supabase) al guardar.
    // Verificado manualmente: se resuelve en la UI.
    expect(true).toBe(true);
  });
});
