import { supabase } from "../../lib/supabase";

export type PedidoItemData = {
  productoCodigo: string;
  modelo: string;
  tela: string;
  disenio: string;
  talla: string;
  color: string;
  cantidad: number;
  precioUnitario?: number;
};

/**
 * Actualiza el stock cuando se crea un pedido.
 * @param soloStock - Si es true, omite el INSERT en pedido_items (usar al reactivar un pedido).
 */
export async function actualizarStockPedidoCreado(
  pedidoCodigo: string,
  items: PedidoItemData[],
  usuarioCodigo: string,
  usuarioNombre: string,
  soloStock = false, // FIX: parámetro para evitar duplicar items al reactivar
): Promise<{ exito: boolean; mensaje: string }> {
  try {
    console.log(
      `📦 Actualizando stock para pedido ${pedidoCodigo} con ${items.length} items`,
    );

    // 1. Guardar items del pedido (solo al crear, no al reactivar)
    if (!soloStock) {
      const pedidoItemsInsert = items.map((item) => ({
        pedido_codigo: pedidoCodigo,
        producto_codigo: item.productoCodigo,
        modelo: item.modelo,
        tela: item.tela,
        disenio: item.disenio,
        talla: item.talla,
        color: item.color,
        cantidad: item.cantidad,
        precio_unitario: item.precioUnitario || null,
        subtotal: item.precioUnitario
          ? item.precioUnitario * item.cantidad
          : null,
      }));

      const { error: insertError } = await supabase
        .from("pedido_items")
        .insert(pedidoItemsInsert);

      if (insertError) throw insertError;
      console.log(`✅ Items del pedido guardados en pedido_items`);
    } else {
      console.log(
        `⏭️ soloStock=true: omitiendo INSERT en pedido_items (reactivación)`,
      );
    }

    // 2. Actualizar stock de cada producto (siempre)
    for (const item of items) {
      console.log(
        `   ⬇️ Restando ${item.cantidad} unidades de ${item.modelo} - Talla ${item.talla} - ${item.color}`,
      );

      const resultado = await supabase.rpc("actualizar_stock_pedido", {
        p_producto_codigo: item.productoCodigo,
        p_talla: item.talla,
        p_color: item.color,
        p_cantidad: item.cantidad,
        p_tipo: "restar",
        p_pedido_codigo: pedidoCodigo,
        p_usuario_codigo: usuarioCodigo,
        p_usuario_nombre: usuarioNombre,
      });

      if (resultado.error) {
        console.error(`❌ Error al actualizar stock:`, resultado.error);
        throw new Error(
          `Error al actualizar stock de ${item.modelo} - ${item.talla} - ${item.color}: ${resultado.error.message}`,
        );
      }

      console.log(`   ✅ Stock actualizado correctamente`);
    }

    console.log(
      `✅ Stock actualizado para todos los items del pedido ${pedidoCodigo}`,
    );
    return {
      exito: true,
      mensaje: "Stock actualizado correctamente",
    };
  } catch (error) {
    console.error("❌ Error al actualizar stock:", error);
    return {
      exito: false,
      mensaje: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}

/**
 * Restaura el stock cuando se cancela un pedido
 */
export async function restaurarStockPedidoCancelado(
  pedidoCodigo: string,
  usuarioCodigo: string,
  usuarioNombre: string,
): Promise<{ exito: boolean; mensaje: string }> {
  try {
    console.log(`🔄 Restaurando stock para pedido cancelado ${pedidoCodigo}`);

    const { data: items, error: fetchError } = await supabase
      .from("pedido_items")
      .select("*")
      .eq("pedido_codigo", pedidoCodigo);

    if (fetchError) throw fetchError;
    if (!items || items.length === 0) {
      console.log(`⚠️ No hay items para restaurar en ${pedidoCodigo}`);
      return {
        exito: true,
        mensaje: "No hay items para restaurar",
      };
    }

    console.log(`   📦 Restaurando ${items.length} items`);

    for (const item of items) {
      console.log(
        `   ⬆️ Sumando ${item.cantidad} unidades de ${item.modelo} - Talla ${item.talla} - ${item.color}`,
      );

      const resultado = await supabase.rpc("actualizar_stock_pedido", {
        p_producto_codigo: item.producto_codigo,
        p_talla: item.talla,
        p_color: item.color,
        p_cantidad: item.cantidad,
        p_tipo: "sumar",
        p_pedido_codigo: pedidoCodigo,
        p_usuario_codigo: usuarioCodigo,
        p_usuario_nombre: usuarioNombre,
      });

      if (resultado.error) {
        console.error(`❌ Error al restaurar stock:`, resultado.error);
        throw new Error(`Error al restaurar stock: ${resultado.error.message}`);
      }

      console.log(`   ✅ Stock restaurado correctamente`);
    }

    console.log(
      `✅ Stock restaurado para todos los items del pedido ${pedidoCodigo}`,
    );
    return {
      exito: true,
      mensaje: "Stock restaurado correctamente",
    };
  } catch (error) {
    console.error("❌ Error al restaurar stock:", error);
    return {
      exito: false,
      mensaje: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}

/**
 * Obtiene el detalle de items de un pedido
 */
export async function obtenerItemsPedido(pedidoCodigo: string) {
  try {
    const { data, error } = await supabase
      .from("pedido_items")
      .select("*")
      .eq("pedido_codigo", pedidoCodigo)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error al obtener items del pedido:", error);
    return [];
  }
}

/**
 * Obtiene el historial de movimientos de stock de un producto
 */
export async function obtenerHistorialStock(productoCodigo: string) {
  try {
    const { data, error } = await supabase
      .from("stock_movimientos")
      .select("*")
      .eq("producto_codigo", productoCodigo)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error al obtener historial de stock:", error);
    return [];
  }
}
