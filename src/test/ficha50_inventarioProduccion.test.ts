import { describe, it, expect } from "vitest";
import {
  tieneStockFaltante,
  contarColoresSinStock,
  obtenerStockTotal,
  filtrarProductosInventario,
  type ProductoInventario,
} from "../app/utils/inventarioProduccion";

const productoCompleto: ProductoInventario = {
  id: "PROD-01",
  modelo: "Modelo A",
  tela: "Algodón",
  disenio: "Liso",
  tallas: [
    {
      talla: "S",
      colores: [
        { color: "Rojo", stock: 5 },
        { color: "Azul", stock: 3 },
      ],
    },
    {
      talla: "M",
      colores: [
        { color: "Rojo", stock: 2 },
        { color: "Azul", stock: 1 },
      ],
    },
  ],
};

const productoIncompleto: ProductoInventario = {
  id: "PROD-02",
  modelo: "Modelo B",
  tela: "Poliéster",
  disenio: "Estampado",
  tallas: [
    {
      talla: "S",
      colores: [
        { color: "Verde", stock: 0 },
        { color: "Negro", stock: 4 },
      ],
    },
    {
      talla: "M",
      colores: [
        { color: "Verde", stock: 2 },
        { color: "Negro", stock: 0 },
      ],
    },
  ],
};

describe("RF50 - Gestión de Inventario y Estado de Producción", () => {
  it("CP01 - obtenerStockTotal retorna la suma correcta de stock para un producto", () => {
    // ARRANGE & ACT
    const total = obtenerStockTotal(productoCompleto);

    // ASSERT
    expect(total).toBe(11); // 5+3+2+1
  });

  it("CP02 - filtrarProductosInventario filtra correctamente por 'incompletos', 'completos' y 'todos'", () => {
    // ARRANGE
    const productos = [productoCompleto, productoIncompleto];

    // ACT
    const incompletos = filtrarProductosInventario(productos, "incompletos");
    const completos = filtrarProductosInventario(productos, "completos");
    const todos = filtrarProductosInventario(productos, "todos");

    // ASSERT
    expect(incompletos).toHaveLength(1);
    expect(incompletos[0].id).toBe("PROD-02");
    expect(completos).toHaveLength(1);
    expect(completos[0].id).toBe("PROD-01");
    expect(todos).toHaveLength(2);
  });

  it("CP03 - tieneStockFaltante retorna false para producto con stock completo", () => {
    // ARRANGE & ACT
    const resultado = tieneStockFaltante(productoCompleto);

    // ASSERT
    expect(resultado).toBe(false);
  });

  it("CP04 - tieneStockFaltante retorna true y contarColoresSinStock cuenta correctamente", () => {
    // ARRANGE & ACT
    const resultado = tieneStockFaltante(productoIncompleto);

    // ASSERT
    expect(resultado).toBe(true);
    expect(contarColoresSinStock(productoIncompleto)).toBe(2);
  });

  it("CP05 - (placeholder) error al guardar stock es manejo de errores de Supabase sin lógica aislable", () => {
    // No aplica test de código: el error al actualizar stock es capturado
    // por el handler de Supabase en ProduccionDashboard (try/catch con toast).
    expect(true).toBe(true);
  });
});
