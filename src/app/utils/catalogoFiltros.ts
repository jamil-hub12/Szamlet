import type { ProductoCatalogo } from "../contexts/ProductosContext";

/**
 * Filtra el catálogo de productos por modelo, tela, diseño o código.
 * Extraído de EmpleadoDashboard.tsx (sección Catálogo).
 * RF39 - Consulta de Catálogo de Productos
 */
export function filtrarCatalogo(
  productos: ProductoCatalogo[],
  busqueda: string = "",
): ProductoCatalogo[] {
  return productos.filter(
    (p) =>
      !busqueda ||
      p.modelo.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.tela.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.disenio.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.id.toLowerCase().includes(busqueda.toLowerCase()),
  );
}

/**
 * Determina qué mensaje mostrar cuando el catálogo filtrado queda vacío.
 * Replica la lógica real de EmpleadoDashboard.tsx: el mensaje difiere
 * según si el catálogo está vacío de origen o si la búsqueda no
 * encontró coincidencias.
 */
export function obtenerMensajeCatalogoVacio(totalProductos: number): string {
  return totalProductos === 0
    ? "No hay productos registrados aún. Agrega el primero."
    : "No se encontraron productos con ese criterio.";
}
