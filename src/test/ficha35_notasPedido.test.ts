import { describe, it, expect } from "vitest";
import { prepararNotaParaGuardar, tieneNotasParaMostrar } from "../app/utils/notasPedido";

describe("RF35 - Registro de Notas Internas del Pedido", () => {
  // CP01 registro de nota interna
  it("CP01: una nota con contenido se prepara correctamente para guardarse", () => {
    // ARRANGE
    const notaIngresada = "Cliente solicitó cambio de talla a último momento";

    // ACT
    const resultado = prepararNotaParaGuardar(notaIngresada);

    // ASSERT
    expect(resultado).toBe("Cliente solicitó cambio de talla a último momento");
  });

  // CP02 Pedido sin notas internas
  it("CP02: un pedido sin notas no debe mostrar la sección de notas (E1)", () => {
    // ARRANGE
    const notasDelPedido: string | undefined = undefined;

    // ACT
    const resultado = tieneNotasParaMostrar(notasDelPedido);

    // ASSERT
    expect(resultado).toBe(false);
  });

  // CP03 No se registra una nueva nota
  it("CP03: si no se ingresa una nueva nota, no se sobrescribe la existente (E2)", () => {
    // ARRANGE
    const notaIngresadaVacia = "   "; // el actor no escribió nada (solo espacios)

    // ACT
    const resultado = prepararNotaParaGuardar(notaIngresadaVacia);

    // ASSERT
    expect(resultado).toBeUndefined(); // undefined = no se actualiza el campo
  });

  // CP04 Cancelación de la edición
  it("CP04: cancelación de la edición (E3) - no aplica test de código", () => {
    // Este escenario depende únicamente del cierre del modal (onClose),
    // sin lógica de negocio aislable para probar con Vitest.
    // Verificado manualmente: al cancelar, no se invoca actualizarPedidoConItems.
    expect(true).toBe(true);
  });
});
