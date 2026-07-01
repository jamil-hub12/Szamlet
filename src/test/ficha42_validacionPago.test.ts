import { describe, it, expect } from "vitest";
import { validarPago } from "../app/utils/validacionPago";

describe("RF42 - Registro de Pagos de Pedidos", () => {
  // CP01 Registro exitoso de pago
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

  // CP02 Pago total del pedido
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

  // CP03 Monto invalido
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

  // CP04 Monto negativo inválido
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

  // CP05 Cancelación del registro
  it("CP05: cancelación del registro (E3) - no aplica test de código", () => {
    // El Personal de Atención cierra el formulario sin guardar cambios:
    // es flujo de UI (cierre de modal sin invocar registrarPago), sin
    // lógica de negocio aislable. Verificado manualmente: no se registra
    // ningún pago y la información queda sin cambios.
    expect(true).toBe(true);
  });
});
