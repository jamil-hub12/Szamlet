import type { Pedido } from "../contexts/PedidosContext";

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
