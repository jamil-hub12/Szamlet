import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { supabase } from "../../lib/supabase";
import type { Database } from "../../lib/supabase";
import { registrarAuditoria, obtenerUsuarioActual } from "../utils/auditoria";

type ProductoDB = Database["public"]["Tables"]["productos"]["Row"];
type ProductoInsert = Database["public"]["Tables"]["productos"]["Insert"];
type VarianteDB = Database["public"]["Tables"]["producto_variantes"]["Row"];
type ColorDB = Database["public"]["Tables"]["producto_colores"]["Row"];

export type ColorProducto = {
  id: string;
  color: string;
  stock: number;
};

export type TallaProducto = {
  id: string;
  talla: string;
  colores: ColorProducto[];
};

export type ProductoCatalogo = {
  id: string;
  codigo: string;
  modelo: string;
  tela: string;
  disenio: string;
  tallas: TallaProducto[];
  fechaRegistro: string;
};

type ProductosContextType = {
  productos: ProductoCatalogo[];
  loading: boolean;
  error: string | null;
  agregarProducto: (data: {
    modelo: string;
    tela: string;
    disenio: string;
    tallas: { talla: string; colores: { color: string; stock: number }[] }[];
  }) => Promise<ProductoCatalogo | null>;
  actualizarProducto: (
    id: string,
    data: Partial<ProductoDB>,
  ) => Promise<boolean>;
  actualizarStock: (colorId: string, stock: number) => Promise<boolean>;
  eliminarProducto: (id: string) => Promise<boolean>;
  refetch: () => Promise<void>;
};

const ProductosContext = createContext<ProductosContextType | undefined>(
  undefined,
);

export function ProductosProvider({ children }: { children: ReactNode }) {
  const [productos, setProductos] = useState<ProductoCatalogo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProductos = async () => {
    try {
      setLoading(true);
      setError(null);

      // Obtener productos
      const { data: productosData, error: productosError } = await supabase
        .from("productos")
        .select("*")
        .order("codigo", { ascending: true });

      if (productosError) throw productosError;

      // Obtener variantes
      const { data: variantesData, error: variantesError } = await supabase
        .from("producto_variantes")
        .select("*");

      if (variantesError) throw variantesError;

      // Obtener colores
      const { data: coloresData, error: coloresError } = await supabase
        .from("producto_colores")
        .select("*");

      if (coloresError) throw coloresError;

      // Construir estructura de productos
      const productosConTallas: ProductoCatalogo[] = (productosData || []).map(
        (producto) => {
          const variantes = (variantesData || []).filter(
            (v) => v.producto_id === producto.id,
          );

          const tallas: TallaProducto[] = variantes.map((variante) => {
            const colores = (coloresData || [])
              .filter((c) => c.variante_id === variante.id)
              .map((c) => ({
                id: c.id,
                color: c.color,
                stock: c.stock,
              }));

            return {
              id: variante.id,
              talla: variante.talla,
              colores,
            };
          });

          return {
            id: producto.id,
            codigo: producto.codigo,
            modelo: producto.modelo,
            tela: producto.tela,
            disenio: producto.disenio,
            tallas,
          };
        },
      );

      setProductos(productosConTallas);
    } catch (err) {
      console.error("Error al cargar productos:", err);
      setError(err instanceof Error ? err.message : "Error desconocido");
      setProductos([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProductos();

    console.log("📡 Configurando suscripción a cambios de productos...");
    const subscription = supabase
      .channel("productos-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "productos" },
        (payload) => {
          console.log("🔔 Cambio en productos:", payload.eventType);
          fetchProductos();
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "producto_variantes" },
        (payload) => {
          console.log("🔔 Cambio en variantes:", payload.eventType);
          fetchProductos();
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "producto_colores" },
        (payload) => {
          console.log(
            "🔔 Cambio en stock (producto_colores):",
            payload.eventType,
            payload,
          );
          fetchProductos();
        },
      )
      .subscribe((status, err) => {
        if (status === "SUBSCRIBED") {
          console.log("✅ Suscripción a productos activa");
        } else if (status === "CHANNEL_ERROR") {
          console.warn(
            "⚠️ Error en canal de productos (real-time deshabilitado):",
            err,
          );
          console.warn("💡 Los cambios se reflejarán al recargar la página");
        } else if (status === "TIMED_OUT") {
          console.warn("⏱️ Timeout en suscripción de productos");
        } else if (status === "CLOSED") {
          console.log("🔌 Canal de productos cerrado");
        }
      });

    return () => {
      console.log("📡 Desuscribiendo de cambios de productos");
      subscription.unsubscribe();
    };
  }, []);

  const agregarProducto = async (data: {
    modelo: string;
    tela: string;
    disenio: string;
    tallas: { talla: string; colores: { color: string; stock: number }[] }[];
  }): Promise<ProductoCatalogo | null> => {
    try {
      // Insertar producto
      const { data: nuevoProducto, error: productoError } = await supabase
        .from("productos")
        .insert({
          modelo: data.modelo,
          tela: data.tela,
          disenio: data.disenio,
        })
        .select()
        .single();

      if (productoError) throw productoError;

      // Insertar variantes y colores
      for (const talla of data.tallas) {
        const { data: nuevaVariante, error: varianteError } = await supabase
          .from("producto_variantes")
          .insert({
            producto_id: nuevoProducto.id,
            talla: talla.talla,
          })
          .select()
          .single();

        if (varianteError) throw varianteError;

        // Insertar colores
        const coloresInsert = talla.colores.map((c) => ({
          variante_id: nuevaVariante.id,
          color: c.color,
          stock: c.stock,
        }));

        const { error: coloresError } = await supabase
          .from("producto_colores")
          .insert(coloresInsert);

        if (coloresError) throw coloresError;
      }

      await fetchProductos();

      // Registrar en auditoría
      const usuario = await obtenerUsuarioActual();
      const usuarioFinal = usuario || { codigo: "SISTEMA", nombre: "Sistema" };

      await registrarAuditoria({
        usuarioCodigo: usuarioFinal.codigo,
        usuarioNombre: usuarioFinal.nombre,
        accion: "crear",
        modulo: "productos",
        entidadId: nuevoProducto.codigo,
        entidadNombre: `${data.modelo} - ${data.tela} - ${data.disenio}`,
        detalles: {
          tallasCount: data.tallas.length,
          coloresCount: data.tallas.reduce(
            (acc, t) => acc + t.colores.length,
            0,
          ),
        },
      });

      return productos.find((p) => p.id === nuevoProducto.id) || null;
    } catch (err) {
      console.error("Error al agregar producto:", err);
      setError(
        err instanceof Error ? err.message : "Error al agregar producto",
      );
      return null;
    }
  };

  const actualizarProducto = async (
    id: string,
    data: Partial<ProductoDB>,
  ): Promise<boolean> => {
    try {
      const productoActual = productos.find((p) => p.id === id);

      const { error: updateError } = await supabase
        .from("productos")
        .update(data)
        .eq("id", id);

      if (updateError) throw updateError;

      await fetchProductos();

      // Registrar en auditoría
      const usuario = await obtenerUsuarioActual();
      const usuarioFinal = usuario || { codigo: "SISTEMA", nombre: "Sistema" };

      await registrarAuditoria({
        usuarioCodigo: usuarioFinal.codigo,
        usuarioNombre: usuarioFinal.nombre,
        accion: "editar",
        modulo: "productos",
        entidadId: productoActual?.codigo || id,
        entidadNombre: productoActual
          ? `${productoActual.modelo} - ${productoActual.tela}`
          : "Producto",
        detalles: {
          cambios: data,
        },
      });

      return true;
    } catch (err) {
      console.error("Error al actualizar producto:", err);
      setError(
        err instanceof Error ? err.message : "Error al actualizar producto",
      );
      return false;
    }
  };

  const actualizarStock = async (
    colorId: string,
    stock: number,
  ): Promise<boolean> => {
    try {
      const { error: updateError } = await supabase
        .from("producto_colores")
        .update({ stock })
        .eq("id", colorId);

      if (updateError) throw updateError;

      await fetchProductos();
      return true;
    } catch (err) {
      console.error("Error al actualizar stock:", err);
      setError(
        err instanceof Error ? err.message : "Error al actualizar stock",
      );
      return false;
    }
  };

  const eliminarProducto = async (id: string): Promise<boolean> => {
    try {
      const productoAEliminar = productos.find((p) => p.id === id);

      const { error: deleteError } = await supabase
        .from("productos")
        .delete()
        .eq("id", id);

      if (deleteError) throw deleteError;

      setProductos((prev) => prev.filter((p) => p.id !== id));

      // Registrar en auditoría
      const usuario = await obtenerUsuarioActual();
      const usuarioFinal = usuario || { codigo: "SISTEMA", nombre: "Sistema" };

      await registrarAuditoria({
        usuarioCodigo: usuarioFinal.codigo,
        usuarioNombre: usuarioFinal.nombre,
        accion: "eliminar",
        modulo: "productos",
        entidadId: productoAEliminar?.codigo || id,
        entidadNombre: productoAEliminar
          ? `${productoAEliminar.modelo} - ${productoAEliminar.tela}`
          : "Producto",
        detalles: {
          disenio: productoAEliminar?.disenio,
        },
      });
      return true;
    } catch (err) {
      console.error("Error al eliminar producto:", err);
      setError(
        err instanceof Error ? err.message : "Error al eliminar producto",
      );
      return false;
    }
  };

  return (
    <ProductosContext.Provider
      value={{
        productos,
        loading,
        error,
        agregarProducto,
        actualizarProducto,
        actualizarStock,
        eliminarProducto,
        refetch: fetchProductos,
      }}
    >
      {children}
    </ProductosContext.Provider>
  );
}

export function useProductos() {
  const context = useContext(ProductosContext);
  if (context === undefined) {
    throw new Error("useProductos debe usarse dentro de ProductosProvider");
  }
  return context;
}
