import type { Pedido } from "../contexts/PedidosContext";
import { formatearFechaISO } from "./fechas";
import { esRangoDeFechasValido } from "./validaciones";

export function filtrarPedidos(
  pedidos: Pedido[],
  opciones: {
    busqueda?: string;
    filtroEstado?: string;
    filtroPrioridad?: "Todas" | "Urgente" | "Normal";
    fechaDesde?: string;
    fechaHasta?: string;
    ordenFecha?: "desc" | "asc";
  } = {},
): Pedido[] {
  const {
    busqueda = "",
    filtroEstado = "Todos",
    filtroPrioridad = "Todas",
    fechaDesde = "",
    fechaHasta = "",
    ordenFecha = "desc",
  } = opciones;

  // Si el rango ingresado es inválido (fecha inicial posterior a la
  // final), se ignora el filtro de fecha en vez de aplicarlo: el listado
  // se muestra sin ese filtro hasta que el usuario corrija el rango.
  const rangoValido = esRangoDeFechasValido(fechaDesde, fechaHasta);
  const fechaDesdeEfectiva = rangoValido ? fechaDesde : "";
  const fechaHastaEfectiva = rangoValido ? fechaHasta : "";

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
      const fechaPedido = formatearFechaISO(new Date(p.fecha));
      const matchDesde =
        !fechaDesdeEfectiva || fechaPedido >= fechaDesdeEfectiva;
      const matchHasta =
        !fechaHastaEfectiva || fechaPedido <= fechaHastaEfectiva;

      return matchBusqueda && matchEstado && matchPrioridad && matchDesde && matchHasta;
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

  // Si el rango ingresado es inválido (fecha inicial posterior a la
  // final), se ignora el filtro de fecha en vez de aplicarlo: el listado
  // se muestra sin ese filtro hasta que el usuario corrija el rango.
  const rangoValido = esRangoDeFechasValido(fechaDesde, fechaHasta);
  const fechaDesdeEfectiva = rangoValido ? fechaDesde : "";
  const fechaHastaEfectiva = rangoValido ? fechaHasta : "";

  return pedidos
    .filter((p) => {
      if (p.tieneEspeciales) return false;
      const matchEstado = filtroEstado === "Todos" || p.estado === filtroEstado;
      const matchPrioridad =
        filtroPrioridad === "Todas" ||
        (filtroPrioridad === "Urgente" && p.urgente) ||
        (filtroPrioridad === "Normal" && !p.urgente);
      const fechaPedido = formatearFechaISO(new Date(p.fecha));
      const matchDesde =
        !fechaDesdeEfectiva || fechaPedido >= fechaDesdeEfectiva;
      const matchHasta =
        !fechaHastaEfectiva || fechaPedido <= fechaHastaEfectiva;

      return matchEstado && matchPrioridad && matchDesde && matchHasta;
    })
    .sort((a, b) => {
      const dateA = new Date(a.fecha).getTime();
      const dateB = new Date(b.fecha).getTime();
      return ordenFecha === "desc" ? dateB - dateA : dateA - dateB;
    });
}
