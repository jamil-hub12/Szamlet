import { esMontoValido } from "./validaciones";

/**
 * Valida los datos de un pago antes de registrarlo.
 * Extraído de RegistrarPagoModal.tsx (handleGuardar).
 * RF42 - Registro de Pagos de Pedidos
 */
export function validarPago(
  montoIngresado: string,
  montoTotal: number,
  montoPagado: number,
  pedidoVencido: boolean = false,
  esPedidoSinPrecio: boolean = false,
): { valido: boolean; mensaje: string; montoRestante?: number } {
  const montoNumerico = parseFloat(montoIngresado);

  if (isNaN(montoNumerico) || montoNumerico <= 0) {
    return {
      valido: false,
      mensaje: "El monto del pago debe ser mayor a 0",
    };
  }

  if (!esMontoValido(montoIngresado)) {
    return {
      valido: false,
      mensaje: "El monto no puede tener más de 2 decimales",
    };
  }

  if (pedidoVencido) {
    return {
      valido: false,
      mensaje:
        "No se puede registrar pago: este pedido está vencido (fecha de entrega pasada) y no se pueden registrar pagos sobre pedidos vencidos.",
    };
  }

  if (!esPedidoSinPrecio) {
    const montoRestanteActual = montoTotal - montoPagado;
    if (montoNumerico > montoRestanteActual) {
      return {
        valido: false,
        mensaje: "El monto no puede ser mayor al saldo pendiente",
        montoRestante: montoRestanteActual,
      };
    }
  }

  return {
    valido: true,
    mensaje: "El monto es válido",
  };
}
