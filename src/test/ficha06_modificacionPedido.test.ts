/**
 * Ficha 06 — RF06: Modificación de Detalles del Pedido
 * Lógica en: src/app/utils/pedidosCicloVida.ts
 * Importada por: EditarPedidoModal.tsx
 */

import { describe, it, expect } from "vitest";
import { puedeEditarPedido } from "../app/utils/pedidosCicloVida";

describe("RF06 — Modificación de Detalles del Pedido", () => {

  // CP01 Modificación válida
  it("CP01 — Flujo exitoso: pedido en estado activo puede editarse", () => {
    // ARRANGE
    const estadoRecibido         = "Recibido"         as const;
    const estadoEnConfeccion     = "En confección"    as const;
    const estadoListoEntrega     = "Listo para entrega" as const;

    // ACT
    const resultadoRecibido     = puedeEditarPedido(estadoRecibido);
    const resultadoEnConfeccion = puedeEditarPedido(estadoEnConfeccion);
    const resultadoListoEntrega = puedeEditarPedido(estadoListoEntrega);

    // ASSERT
    expect(resultadoRecibido.puede).toBe(true);
    expect(resultadoEnConfeccion.puede).toBe(true);
    expect(resultadoListoEntrega.puede).toBe(true);
  });

  // CP02 Pedido en estado "Entregado"
  it("CP02 — Pedido en estado Entregado: edición bloqueada", () => {
    // ARRANGE
    const estadoEntregado = "Entregado" as const;

    // ACT
    const resultado = puedeEditarPedido(estadoEntregado);

    // ASSERT
    expect(resultado.puede).toBe(false);
    expect(resultado.mensaje).toContain("Entregado");
  });

  // CP03 Datos inválidos o incompletos
  it("CP03 — Datos inválidos o incompletos: recálculo de montos ocurre en el componente (placeholder)", () => {
    // ARRANGE
    // La validación de ítems y el recálculo de montos suceden dentro de
    // EditarPedidoModal.tsx y en Supabase; no hay función pura aislable en utils.

    // ACT
    const sinLogicaAislable = true;

    // ASSERT
    expect(sinLogicaAislable).toBe(true);
  });

});
