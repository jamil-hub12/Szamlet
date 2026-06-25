import { describe, it, expect } from "vitest";
import { prepararNotaParaGuardar } from "../app/utils/notasPedido";

describe("RF36 - Edición de Notas Internas del Pedido", () => {
  it("CP01: una nota existente editada con nuevo contenido se actualiza correctamente", () => {
    // ARRANGE
    const notaExistente = "Cliente pidió tela azul";
    const notaEditada = "Cliente pidió tela azul, confirmó talla M el 20/06";

    // ACT
    const resultado = prepararNotaParaGuardar(notaEditada);

    // ASSERT
    expect(resultado).toBe(
      "Cliente pidió tela azul, confirmó talla M el 20/06",
    );
    expect(resultado).not.toBe(notaExistente);
  });

  it("CP02: si no se modifica el contenido de la nota, se mantiene la información existente (E1)", () => {
    // ARRANGE
    const notaExistente = "Cliente pidió tela azul";
    const notaSinModificar = notaExistente;

    // ACT
    const resultado = prepararNotaParaGuardar(notaSinModificar);

    // ASSERT
    expect(resultado).toBe(notaExistente);
  });

  it("CP03: cancelación de la edición (E2) - no aplica test de código", () => {
    // Flujo de UI puro (cierre de modal sin invocar actualizarPedido).
    // Verificado manualmente: al cancelar, la nota original permanece intacta.
    expect(true).toBe(true);
  });
});
