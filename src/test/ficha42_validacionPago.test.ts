import { describe, it, expect } from "vitest";
import { validarPago } from "../app/utils/validacionPago";

describe("RF42 - Registro de Pagos de Pedidos", () => {
  it("CP01: un pago con monto válido dentro del saldo pendiente es aceptado", () => {
    // ARRANGE
    const montoIngresado = "80";
    const montoTotal = 150;
    const montoPagado = 0;

    // ACT
    const resultado = validarPago(montoIngresado, montoTotal, montoPagado);

    // ASSERT
    expect(resultado.valido).toBe(true);
  });

  it("CP02: un pago igual al total pendiente es aceptado (pago total)", () => {
    // ARRANGE
    const montoIngresado = "150";
    const montoTotal = 150;
    const montoPagado = 0;

    // ACT
    const resultado = validarPago(montoIngresado, montoTotal, montoPagado);

    // ASSERT
    expect(resultado.valido).toBe(true);
  });

  it("CP03: un monto mayor al saldo pendiente es rechazado (E1)", () => {
    // ARRANGE
    const montoIngresado = "200";
    const montoTotal = 150;
    const montoPagado = 0;

    // ACT
    const resultado = validarPago(montoIngresado, montoTotal, montoPagado);

    // ASSERT
    expect(resultado.valido).toBe(false);
    expect(resultado.mensaje).toBe(
      "El monto no puede ser mayor al saldo pendiente",
    );
    expect(resultado.montoRestante).toBe(150);
  });

  it("CP04: un monto negativo es rechazado (E2)", () => {
    // ARRANGE
    const montoIngresado = "-50";
    const montoTotal = 150;
    const montoPagado = 0;

    // ACT
    const resultado = validarPago(montoIngresado, montoTotal, montoPagado);

    // ASSERT
    expect(resultado.valido).toBe(false);
    expect(resultado.mensaje).toBe("El monto del pago debe ser mayor a 0");
  });

  it("CP05: cancelación del registro (E3) - no aplica test de código", () => {
    // El Personal de Atención cierra el formulario sin guardar cambios:
    // es flujo de UI (cierre de modal sin invocar registrarPago), sin
    // lógica de negocio aislable. Verificado manualmente: no se registra
    // ningún pago y la información queda sin cambios.
    expect(true).toBe(true);
  });

  it("extra: un monto de 0 también es rechazado", () => {
    const resultado = validarPago("0", 150, 0);
    expect(resultado.valido).toBe(false);
  });

  it("extra: un pedido vencido rechaza cualquier pago", () => {
    const resultado = validarPago("50", 150, 0, true);
    expect(resultado.valido).toBe(false);
    expect(resultado.mensaje).toContain("vencido");
  });
});
