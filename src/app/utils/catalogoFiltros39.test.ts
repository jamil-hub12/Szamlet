import { describe, it, expect } from "vitest";
import {
  filtrarCatalogo,
  obtenerMensajeCatalogoVacio,
} from "./catalogoFiltros";
import type { ProductoCatalogo } from "../contexts/ProductosContext";

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

  it("CP04: muestra mensaje informativo cuando el catálogo está vacío (E2)", () => {
    // ARRANGE
    const productos: ProductoCatalogo[] = [];

    // ACT
    const resultado = filtrarCatalogo(productos, "");
    const mensaje = obtenerMensajeCatalogoVacio(productos.length);

    // ASSERT
    expect(resultado).toHaveLength(0);
    // Nota: el mensaje real del sistema es "No hay productos registrados
    // aún. Agrega el primero." — la ficha lo describe como "mensaje
    // informativo de catálogo vacío" en términos generales, el texto
    // exacto difiere pero el comportamiento (mensaje distinto al de
    // búsqueda sin resultados) es correcto.
    expect(mensaje).toBe(
      "No hay productos registrados aún. Agrega el primero.",
    );
  });
});
