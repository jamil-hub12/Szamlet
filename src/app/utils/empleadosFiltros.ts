import type { Empleado } from "../contexts/EmpleadosContext";

/**
 * Filtra la lista de empleados por nombre, email o id.
 * Extraído de AdminDashboard.tsx (sección Empleados).
 * RF46 - Gestión de Empleados del Sistema
 *
 * Nota: el filtro busca coincidencias en e.id (no en e.codigo), tal como
 * está implementado actualmente en el componente.
 */
export function filtrarEmpleados(
  empleados: Empleado[],
  busqueda: string = "",
): Empleado[] {
  if (!busqueda) return empleados;

  const termino = busqueda.toLowerCase();

  return empleados.filter(
    (e) =>
      e.nombre.toLowerCase().includes(termino) ||
      e.email.toLowerCase().includes(termino) ||
      e.id.toLowerCase().includes(termino),
  );
}

/**
 * Determina qué mensaje mostrar cuando la lista de empleados filtrada
 * queda vacía. Diferencia entre "no hay empleados registrados" (lista
 * de origen vacía) y "sin resultados de búsqueda" (hay empleados, pero
 * ninguno coincide con el término buscado).
 */
export function obtenerMensajeEmpleadosVacio(totalEmpleados: number): string {
  return totalEmpleados === 0
    ? "No hay empleados registrados. Agrega el primero."
    : "No se encontraron empleados con ese criterio.";
}
