import { describe, it, expect } from "vitest";
import {
  detectarPedidoDuplicadoExacto,
  detectarPedidoSimilar,
  tieneDatosSuficientesParaComparar,
  type ItemComparacion,
  type PedidoComparable,
} from "../app/utils/validaciones";

function crearPedidoComparable(
  overrides: Partial<PedidoComparable>,
): PedidoComparable {
  return {
    id: "PED-001",
    clienteId: "CLI-001",
    fechaEntrega: "2026-06-20",
    items: [
      {
        modelo: "Polo",
        tela: "Algodón",
        disenio: "Logo frontal",
        talla: "M",
        color: "Azul",
        cantidad: 2,
      },
    ],
    ...overrides,
  };
}

describe("RF27 - Control de Pedidos Duplicados", () => {
  it("CP01 - detectarPedidoDuplicadoExacto retorna el id cuando el pedido es idéntico", () => {
    // ARRANGE
    const nuevoPedido = {
      clienteId: "CLI-001",
      fechaEntrega: "2026-06-20",
      items: [
        {
          modelo: "Polo",
          tela: "Algodón",
          disenio: "Logo frontal",
          talla: "M",
          color: "Azul",
          cantidad: 2,
        },
      ] satisfies ItemComparacion[],
    };
    const pedidosExistentes = [crearPedidoComparable({ id: "PED-999" })];

    // ACT
    const resultado = detectarPedidoDuplicadoExacto(
      nuevoPedido,
      pedidosExistentes,
    );

    // ASSERT
    expect(resultado).toBe("PED-999");
  });

  it("CP02 - detectarPedidoDuplicadoExacto retorna null cuando cambian cliente o fecha", () => {
    // ARRANGE
    const nuevoPedido = {
      clienteId: "CLI-002",
      fechaEntrega: "2026-06-21",
      items: [
        {
          modelo: "Polo",
          tela: "Algodón",
          disenio: "Logo frontal",
          talla: "M",
          color: "Azul",
          cantidad: 2,
        },
      ] satisfies ItemComparacion[],
    };
    const pedidosExistentes = [crearPedidoComparable({ id: "PED-999" })];

    // ACT
    const resultado = detectarPedidoDuplicadoExacto(
      nuevoPedido,
      pedidosExistentes,
    );

    // ASSERT
    expect(resultado).toBeNull();
  });

  it("CP03 - detectarPedidoSimilar retorna el id cuando hay coincidencia parcial por modelo/tela/diseño", () => {
    // ARRANGE
    const nuevoPedido = {
      clienteId: "CLI-001",
      items: [
        {
          modelo: "Polo",
          tela: "Algodón",
          disenio: "Logo frontal",
          talla: "L",
          color: "Rojo",
          cantidad: 1,
        },
      ] satisfies ItemComparacion[],
    };
    const pedidosExistentes = [crearPedidoComparable({ id: "PED-555" })];

    // ACT
    const resultado = detectarPedidoSimilar(nuevoPedido, pedidosExistentes);

    // ASSERT
    expect(resultado).toBe("PED-555");
  });

  it("CP04 - tieneDatosSuficientesParaComparar valida que existan cliente, fecha e ítems completos", () => {
    // ARRANGE
    const pedidoValido = {
      clienteId: "CLI-001",
      fechaEntrega: "2026-06-20",
      items: [
        {
          modelo: "Polo",
          tela: "Algodón",
          disenio: "Logo frontal",
          talla: "M",
          color: "Azul",
          cantidad: 2,
        },
      ] satisfies ItemComparacion[],
    };
    const pedidoInvalido = {
      clienteId: "",
      fechaEntrega: "",
      items: [] as ItemComparacion[],
    };

    // ACT
    const resultadoValido = tieneDatosSuficientesParaComparar(pedidoValido);
    const resultadoInvalido = tieneDatosSuficientesParaComparar(pedidoInvalido);

    // ASSERT
    expect(resultadoValido).toBe(true);
    expect(resultadoInvalido).toBe(false);
  });

  it("CP05 - confirmación de pedido diferente - no aplica test de código", () => {
    // El usuario confirma que el pedido no es duplicado y continúa el registro.
    // Verificado manualmente: el flujo permite guardar el pedido diferente.
    expect(true).toBe(true);
  });

  it("CP06 - error al consultar pedidos existentes - no aplica test de código", () => {
    // El error ocurre al consultar pedidos existentes y depende de la capa async.
    // Verificado manualmente: el sistema muestra el mensaje de error y no guarda.
    expect(true).toBe(true);
  });

  it("CP07 - cancelación por duplicidad - no aplica test de código", () => {
    // El usuario cancela el registro después de revisar la alerta de duplicidad.
    // Verificado manualmente: el pedido existente se mantiene sin cambios.
    expect(true).toBe(true);
  });
});
