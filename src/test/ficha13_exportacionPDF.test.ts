/**
 * Ficha 13 — RF13: Exportación PDF
 * Lógica en: src/app/utils/reportesPedidos.ts  → puedeGenerarReportePedidos()
 *            src/app/utils/reportesClientes.ts  → puedeGenerarReporteClientes()
 * Importadas por: AdminDashboard.tsx
 */

import { describe, it, expect } from "vitest";
import { puedeGenerarReportePedidos } from "../app/utils/reportesPedidos";
import { puedeGenerarReporteClientes } from "../app/utils/reportesClientes";
import type { Pedido } from "../app/contexts/PedidosContext";
import type { Cliente } from "../app/contexts/ClientesContext";

function pedidoMock(id: string): Pedido {
  return {
    id, codigo: id, clienteId: "cli-01", cliente: "Test",
    articulo: "Camisa", estado: "Recibido", fecha: "2025-01-01",
    urgente: false, telefono: "987654321", email: "test@gmail.com",
  } as Pedido;
}

function clienteMock(id: string): Cliente {
  return {
    id, codigo: `CLI-${id}`, nombre: "Test Cliente",
    email: "test@gmail.com", celular: "987654321",
    direccion: "Av. Test 123", dni: "12345678",
    ruc: null, fechaRegistro: "2025-01-01",
  };
}

describe("RF13 — Exportación PDF", () => {

  // CP01 Exportación correcta
  it("CP01 — Flujo exitoso: hay registros disponibles para exportar", () => {
    // ARRANGE
    const pedidos: Pedido[]   = [pedidoMock("PED-001")];
    const clientes: Cliente[] = [clienteMock("1")];

    // ACT
    const puedePedidos  = puedeGenerarReportePedidos(pedidos);
    const puedeClientes = puedeGenerarReporteClientes(clientes);

    // ASSERT
    expect(puedePedidos).toBe(true);
    expect(puedeClientes).toBe(true);
  });

  // CP02 Exportación sin datos disponibles
  it("CP02 — Exportación sin datos: lista vacía impide generar el PDF", () => {
    // ARRANGE
    const pedidosVacios: Pedido[]   = [];
    const clientesVacios: Cliente[] = [];

    // ACT
    const puedePedidos  = puedeGenerarReportePedidos(pedidosVacios);
    const puedeClientes = puedeGenerarReporteClientes(clientesVacios);

    // ASSERT
    expect(puedePedidos).toBe(false);
    expect(puedeClientes).toBe(false);
  });

});
