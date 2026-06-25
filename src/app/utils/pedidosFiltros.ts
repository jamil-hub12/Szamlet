import type { Pedido } from "../contexts/PedidosContext";
import { formatearFechaISO } from "./fechas";

export function filtrarPedidos(
  pedidos: Pedido[],
  opciones: {
    busqueda?: string;
    filtroEstado?: string;
    filtroPrioridad?: "Todas" | "Urgente" | "Normal";
    ordenFecha?: "desc" | "asc";
  } = {},
): Pedido[] {
  const {
    busqueda = "",
    filtroEstado = "Todos",
    filtroPrioridad = "Todas",
    ordenFecha = "desc",
  } = opciones;

  return pedidos
    .filter((p) => {
      const matchBusqueda =
        p.cliente.toLowerCase().includes(busqueda.toLowerCase()) ||
        p.id.toLowerCase().includes(busqueda.toLowerCase()) ||
        p.articulo.toLowerCase().includes(busqueda.toLowerCase());
      const matchEstado = filtroEstado === "Todos" || p.estado === filtroEstado;
      const matchPrioridad =
        filtroPrioridad === "Todas" ||
        (filtroPrioridad === "Urgente" && p.urgente) ||
        (filtroPrioridad === "Normal" && !p.urgente);

      return matchBusqueda && matchEstado && matchPrioridad;
    })
    .sort((a, b) => {
      const na = parseInt(a.id.replace("PED-", ""), 10);
      const nb = parseInt(b.id.replace("PED-", ""), 10);
      return ordenFecha === "desc" ? nb - na : na - nb;
    });
}

export function filtrarPedidosAdmin(
  pedidos: Pedido[],
  opciones: {
    filtroEstado?: string;
    filtroPrioridad?: "Todas" | "Urgente" | "Normal";
    fechaDesde?: string;
    fechaHasta?: string;
    ordenFecha?: "desc" | "asc";
  } = {},
): Pedido[] {
  const {
    filtroEstado = "Todos",
    filtroPrioridad = "Todas",
    fechaDesde = "",
    fechaHasta = "",
    ordenFecha = "desc",
  } = opciones;

  return pedidos
    .filter((p) => {
      if (p.tieneEspeciales) return false;
      const matchEstado = filtroEstado === "Todos" || p.estado === filtroEstado;
      const matchPrioridad =
        filtroPrioridad === "Todas" ||
        (filtroPrioridad === "Urgente" && p.urgente) ||
        (filtroPrioridad === "Normal" && !p.urgente);
      const fechaPedido = formatearFechaISO(new Date(p.fecha));
      const matchDesde = !fechaDesde || fechaPedido >= fechaDesde;
      const matchHasta = !fechaHasta || fechaPedido <= fechaHasta;

      return matchEstado && matchPrioridad && matchDesde && matchHasta;
    })
    .sort((a, b) => {
      const dateA = new Date(a.fecha).getTime();
      const dateB = new Date(b.fecha).getTime();
      return ordenFecha === "desc" ? dateB - dateA : dateA - dateB;
    });
}
