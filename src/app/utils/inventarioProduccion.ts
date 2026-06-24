// Funciones puras de lógica de inventario y producción (RF50)

export type ColorStock = {
  color: string;
  stock: number;
};

export type TallaStock = {
  talla: string;
  colores: ColorStock[];
};

export type ProductoInventario = {
  id: string;
  modelo: string;
  tela: string;
  disenio: string;
  tallas: TallaStock[];
};

/**
 * Indica si un producto tiene al menos un color sin stock.
 * Los productos con stock faltante se muestran en naranja en la UI.
 */
export function tieneStockFaltante(p: ProductoInventario): boolean {
  return p.tallas.some((t) => t.colores.some((c) => c.stock === 0));
}

/**
 * Cuenta el total de combinaciones color-talla sin stock
 */
export function contarColoresSinStock(p: ProductoInventario): number {
  return p.tallas.reduce(
    (acc, t) => acc + t.colores.filter((c) => c.stock === 0).length,
    0,
  );
}

/**
 * Calcula el stock total sumando todos los colores de todas las tallas
 */
export function obtenerStockTotal(p: ProductoInventario): number {
  return p.tallas.reduce(
    (acc, t) => acc + t.colores.reduce((s, c) => s + c.stock, 0),
    0,
  );
}

/**
 * Filtra productos según el filtro de producción seleccionado
 */
export function filtrarProductosInventario(
  productos: ProductoInventario[],
  filtro: "todos" | "incompletos" | "completos",
  busqueda = "",
): ProductoInventario[] {
  return productos.filter((p) => {
    const matchBusqueda =
      !busqueda ||
      p.modelo.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.tela.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.disenio.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.id.toLowerCase().includes(busqueda.toLowerCase());

    if (filtro === "incompletos") return matchBusqueda && tieneStockFaltante(p);
    if (filtro === "completos") return matchBusqueda && !tieneStockFaltante(p);
    return matchBusqueda;
  });
}
