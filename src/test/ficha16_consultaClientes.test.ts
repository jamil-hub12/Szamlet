/**
 * Ficha 16 — RF16: Consulta de Clientes
 * Lógica en: src/app/utils/clientesFiltros.ts  → filtrarClientes()
 * Importada por: AdminDashboard.tsx
 */

import { describe, it, expect } from "vitest";
import { filtrarClientes } from "../app/utils/clientesFiltros";
import type { Cliente } from "../app/contexts/ClientesContext";

function clienteMock(
  id: string,
  nombre: string,
  dni: string,
  ruc: string | null = null,
  email: string | null = null,
): Cliente {
  return {
    id, codigo: `CLI-${id}`, nombre, email,
    celular: "987654321", direccion: "Av. Test 123",
    dni, ruc, fechaRegistro: "2025-01-01",
  };
}

describe("RF16 — Consulta de Clientes", () => {

  // CP01 Consulta de clientes
  it("CP01 — Flujo exitoso: búsqueda por nombre retorna clientes coincidentes", () => {
    // ARRANGE
    const clientes: Cliente[] = [
      clienteMock("1", "Ana García",   "12345678", null,          "ana@gmail.com"),
      clienteMock("2", "Carlos López", "99887766", "20999999999"),
      clienteMock("3", "María Pérez",  "11223344", null,          "maria@gmail.com"),
    ];
    const terminoBusqueda = "ana";

    // ACT
    const resultado = filtrarClientes(clientes, { busqueda: terminoBusqueda });

    // ASSERT
    expect(resultado).toHaveLength(1);
    expect(resultado[0].nombre).toBe("Ana García");
  });

  // CP02 Sin coincidencias en la búsqueda
  it("CP02 — Sin coincidencias en búsqueda: retorna lista vacía", () => {
    // ARRANGE
    const clientes: Cliente[] = [
      clienteMock("1", "Ana García",   "12345678"),
      clienteMock("2", "Carlos López", "99887766"),
    ];
    const terminoInexistente = "xyz_inexistente";

    // ACT
    const resultado = filtrarClientes(clientes, { busqueda: terminoInexistente });

    // ASSERT
    expect(resultado).toHaveLength(0);
  });

});
