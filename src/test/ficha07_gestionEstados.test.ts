/**
 * Ficha 07 — RF07: Gestión de Estados
 * Lógica en: src/app/utils/pedidosCicloVida.ts
 * Importada por: EmpleadoDashboard.tsx y AdminDashboard.tsx
 */

import { describe, it, expect } from "vitest";
import {
  validarTransicion,
  obtenerSiguienteEstado,
} from "../app/utils/pedidosCicloVida";

describe("RF07 — Gestión de Estados", () => {

  it("CP01 — Flujo exitoso: cambio de estado progresivo permitido", () => {
    // ARRANGE
    const estadoActual1 = "Recibido"            as const;
    const estadoNuevo1  = "En confección"        as const;
    const estadoActual2 = "En confección"        as const;
    const estadoNuevo2  = "Listo para entrega"   as const;
    const estadoActual3 = "Listo para entrega"   as const;
    const estadoNuevo3  = "Entregado"            as const;

    // ACT
    const resultado1 = validarTransicion(estadoActual1, estadoNuevo1);
    const resultado2 = validarTransicion(estadoActual2, estadoNuevo2);
    const resultado3 = validarTransicion(estadoActual3, estadoNuevo3);

    // ASSERT
    expect(resultado1.valido).toBe(true);
    expect(resultado2.valido).toBe(true);
    expect(resultado3.valido).toBe(true);
  });

  it("CP02 — Intento de retroceso de estado: transición hacia atrás bloqueada", () => {
    // ARRANGE
    const estadoActual = "En confección" as const;
    const estadoRetroceso = "Recibido"  as const;

    // ACT
    const resultado = validarTransicion(estadoActual, estadoRetroceso);

    // ASSERT
    expect(resultado.valido).toBe(false);
  });

  it("CP03 — Pedido en estado Entregado: no permite ningún cambio de estado", () => {
    // ARRANGE
    const estadoFinal    = "Entregado"       as const;
    const cualquierEstado = "En confección"  as const;

    // ACT
    const resultado = validarTransicion(estadoFinal, cualquierEstado);

    // ASSERT
    expect(resultado.valido).toBe(false);
    expect(obtenerSiguienteEstado(estadoFinal)).toBeNull();
  });

});
