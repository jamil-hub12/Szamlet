import type { Cliente } from "../contexts/ClientesContext";
import type { Pedido } from "../contexts/PedidosContext";

/**
 * Filtra clientes por búsqueda de texto y/o estado relacional.
 * Extraído de AdminDashboard.tsx (clientesFiltrados).
 * RF10 – Búsqueda por Cliente / RF16 – Consulta de Clientes
 */
export function filtrarClientes(
  clientes: Cliente[],
  opciones: {
    busqueda?: string;
    filtroEstado?: "Todos" | "ConPedidos" | "SinPedidos" | "ConEmail" | "SinEmail";
    pedidos?: Pedido[];
  } = {},
): Cliente[] {
  const { busqueda = "", filtroEstado = "Todos", pedidos = [] } = opciones;

  return clientes
    .filter((c) => {
      const q = busqueda.toLowerCase();
      const matchBusqueda =
        !busqueda ||
        c.nombre.toLowerCase().includes(q) ||
        (c.email != null && c.email.toLowerCase().includes(q)) ||
        c.celular.includes(busqueda) ||
        c.dni.includes(busqueda) ||
        (c.ruc != null && c.ruc.includes(busqueda));

      let matchEstado = true;
      if (filtroEstado === "ConPedidos") {
        matchEstado = pedidos.some((p) => p.clienteId === c.id);
      } else if (filtroEstado === "SinPedidos") {
        matchEstado = !pedidos.some((p) => p.clienteId === c.id);
      } else if (filtroEstado === "ConEmail") {
        matchEstado = !!c.email;
      } else if (filtroEstado === "SinEmail") {
        matchEstado = !c.email;
      }

      return matchBusqueda && matchEstado;
    })
    .sort((a, b) => a.nombre.localeCompare(b.nombre));
}
