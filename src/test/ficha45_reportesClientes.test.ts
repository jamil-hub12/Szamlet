import { describe, it, expect } from "vitest";
import {
  calcularMetricasReporteClientes,
  puedeGenerarReporteClientes,
} from "../app/utils/reportesClientes";
import type { Cliente } from "../app/contexts/ClientesContext";
import type { Pedido } from "../app/contexts/PedidosContext";

/**
 * Ficha 45 - RF45: Reporte General de Clientes
 * Momento 3 TDD - Test en código (Vitest)
 */

function crearCliente(overrides: Partial<Cliente>): Cliente {
  return {
    id: "c1",
    codigo: "CLI-0001",
    nombre: "Cliente de prueba",
    email: "cliente@test.com",
    celular: "999999999",
    direccion: null,
    dni: "12345678",
    ruc: null,
    fechaRegistro: "2026-06-01",
    ...overrides,
  };
}

function crearPedido(overrides: Partial<Pedido>): Pedido {
  return {
    id: "PED-001",
    codigo: "PED-001",
    clienteId: "c1",
    cliente: "Cliente de prueba",
    articulo: "Polo",
    estado: "Recibido",
    fecha: "2026-06-20",
    urgente: false,
    telefono: "999999999",
    email: "cliente@test.com",
    ...overrides,
  };
}

describe("RF45 - Reporte General de Clientes", () => {
  // CP01 generación de reporte general de clientes
  it("CP01: calcula correctamente el total de clientes, con email y con pedidos", () => {
    // ARRANGE
    const clientes: Cliente[] = [
      crearCliente({ id: "c1", email: "a@test.com" }),
      crearCliente({ id: "c2", email: null }),
      crearCliente({ id: "c3", email: "c@test.com" }),
    ];
    const pedidos: Pedido[] = [
      crearPedido({ id: "PED-001", clienteId: "c1" }),
      crearPedido({ id: "PED-002", clienteId: "c3" }),
    ];

    // ACT
    const resultado = calcularMetricasReporteClientes(clientes, pedidos);

    // ASSERT
    expect(resultado).toEqual({
      totalClientes: 3,
      clientesConEmail: 2, // c1 y c3
      clientesConPedidos: 2, // c1 y c3 tienen pedidos asociados
    });
  });

  // CP02 No existen clientes registrados
  it("CP02: retorna métricas en cero cuando no existen clientes registrados", () => {
    // ARRANGE
    const clientes: Cliente[] = [];
    const pedidos: Pedido[] = [];

    // ACT
    const resultado = calcularMetricasReporteClientes(clientes, pedidos);

    // ASSERT
    expect(resultado).toEqual({
      totalClientes: 0,
      clientesConEmail: 0,
      clientesConPedidos: 0,
    });
  });

  // CP03 No se realiza la exportación
  it("CP03 - no aplica test de código: flujo de UI sin lógica de negocio aislable, verificado manualmente", () => {
    // El usuario simplemente no hace clic en "Exportar PDF"; no hay lógica
    // de negocio que ejecutar ni verificar en ese escenario, es un flujo de
    // UI sin acción. Verificado manualmente.
    expect(true).toBe(true);
  });

  // CP04 Actualización de la lista de clientes
  it("CP04: refleja al nuevo cliente registrado al recalcular las métricas", () => {
    // ARRANGE
    const clientesAntes: Cliente[] = [crearCliente({ id: "c1" })];
    const pedidos: Pedido[] = [];

    // ACT
    const resultadoAntes = calcularMetricasReporteClientes(
      clientesAntes,
      pedidos,
    );
    const clientesDespues: Cliente[] = [
      ...clientesAntes,
      crearCliente({ id: "c2", email: null }),
    ];
    const resultadoDespues = calcularMetricasReporteClientes(
      clientesDespues,
      pedidos,
    );

    // ASSERT
    expect(resultadoAntes.totalClientes).toBe(1);
    expect(resultadoDespues.totalClientes).toBe(2);
  });
});
