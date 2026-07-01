import { describe, it, expect } from "vitest";
import {
  filtrarCatalogo,
  obtenerMensajeCatalogoVacio,
} from "../app/utils/catalogoFiltros";
import type { ProductoCatalogo } from "../app/contexts/ProductosContext";

function crearProducto(overrides: Partial<ProductoCatalogo>): ProductoCatalogo {
  return {
    id: "PROD-001",
    codigo: "PROD-001",
    modelo: "Polo básico",
    tela: "Algodón",
    disenio: "Liso",
    tallas: [],
    preciosPorTalla: {},
    fechaRegistro: "2026-06-01",
    ...overrides,
  };
}

describe("RF39 - Consulta de Catálogo de Productos", () => {
  // CP01 Visualización del catálogo
  it("CP01: muestra la lista de modelos con sus detalles básicos cuando hay productos", () => {
    // ARRANGE
    const productos: ProductoCatalogo[] = [
      crearProducto({ id: "PROD-001", modelo: "Polo básico" }),
      crearProducto({ id: "PROD-002", modelo: "Casaca deportiva" }),
    ];

    // ACT
    const resultado = filtrarCatalogo(productos, "");

    // ASSERT
    expect(resultado).toHaveLength(2);
  });

  // CP02 Búsqueda de modelo existente
  it("CP02: busca y muestra el producto correspondiente a un modelo válido", () => {
    // ARRANGE
    const productos: ProductoCatalogo[] = [
      crearProducto({ id: "PROD-001", modelo: "Polo básico" }),
      crearProducto({ id: "PROD-002", modelo: "Casaca deportiva" }),
    ];

    // ACT
    const resultado = filtrarCatalogo(productos, "casaca");

    // ASSERT
    expect(resultado).toHaveLength(1);
    expect(resultado[0].modelo).toBe("Casaca deportiva");
  });

  // CP03 Modelo no encontrado
  it("CP03: muestra mensaje de 'sin resultados' cuando el modelo buscado no existe (E1)", () => {
    // ARRANGE
    const productos: ProductoCatalogo[] = [
      crearProducto({ id: "PROD-001", modelo: "Polo básico" }),
    ];

    // ACT
    const resultado = filtrarCatalogo(productos, "modelo-inexistente-xyz");
    const mensaje = obtenerMensajeCatalogoVacio(productos.length);

    // ASSERT
    expect(resultado).toHaveLength(0);
    expect(mensaje).toBe("No se encontraron productos con ese criterio.");
  });

  // CP04 Catálogo vacío
  it("CP04: muestra mensaje informativo cuando el catálogo está vacío (E2)", () => {
    // ARRANGE
    const productos: ProductoCatalogo[] = [];

    // ACT
    const resultado = filtrarCatalogo(productos, "");
    const mensaje = obtenerMensajeCatalogoVacio(productos.length);

    // ASSERT
    expect(resultado).toHaveLength(0);
    expect(mensaje).toBe(
      "No hay productos registrados aún. Agrega el primero.",
    );
  });
});
