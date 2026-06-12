import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useRef,
} from "react";
import { supabase } from "../../lib/supabase";
import type { Database } from "../../lib/supabase";
import {
  validarTransicion,
  puedeCancelarPedido,
  puedeEditarPedido,
  generarMensajeCambioEstado,
  type EstadoPedido,
} from "../utils/pedidosCicloVida";
import { registrarAuditoria, obtenerUsuarioActual } from "../utils/auditoria";
import {
  restaurarStockPedidoCancelado,
  actualizarStockPedidoCreado,
  type PedidoItemData,
} from "../utils/stockManager";
import {
  obtenerFechaPeruHoy,
  obtenerFechaHoraPeruISO,
} from "../../utils/fechas";

type PedidoDB = Database["public"]["Tables"]["pedidos"]["Row"];
type PedidoInsert = Database["public"]["Tables"]["pedidos"]["Insert"];
type PedidoUpdate = Database["public"]["Tables"]["pedidos"]["Update"];

export type { EstadoPedido };

export type PedidoItem = {
  id: string;
  productoId: string;
  productoCodigo?: string;
  productoNombre?: string;
  modelo: string;
  tela: string;
  disenio: string;
  talla: string;
  color: string;
  cantidad: number;
  precioUnitario?: number;
  subtotal?: number;
  esEspecial?: boolean;
};

export type Pedido = {
  id: string;
  codigo: string;
  clienteId: string;
  cliente: string;
  articulo: string;
  estado: EstadoPedido;
  fecha: string;
  urgente: boolean;
  telefono: string;
  email: string;
  notas?: string;
  motivoCancelacion?: string;
  estadoAnteriorCancelacion?: EstadoPedido;
  estadoPago?: "Pendiente" | "Pagado" | "Parcial";
  montoTotal?: number;
  montoPagado?: number;
  fechaEntrega?: string;
  metodoPago?: string;
  referenciaPago?: string;
  fechaPago?: string;
  notasPago?: string;
  tieneEspeciales?: boolean;
  items?: PedidoItem[];
};

type PedidosContextType = {
  pedidos: Pedido[];
  loading: boolean;
  error: string | null;
  agregarPedido: (data: {
    clienteId: string;
    articulo: string;
    urgente: boolean;
    notas?: string;
    fechaEntrega?: string;
    items?: PedidoItemData[];
  }) => Promise<Pedido | null>;
  actualizarPedido: (
    codigo: string,
    datos: Partial<Pedido>,
  ) => Promise<boolean>;
  actualizarPedidoConItems: (
    codigo: string,
    datosBasicos: Partial<Pedido>,
    items: Array<{
      pedido_codigo: string;
      producto_codigo: string;
      modelo: string;
      tela: string;
      disenio: string;
      talla: string;
      color: string;
      cantidad: number;
      precio_unitario?: number | null;
      subtotal?: number | null;
    }>,
  ) => Promise<boolean>;
  cancelarPedido: (codigo: string, motivo: string) => Promise<boolean>;
  reactivarPedido: (codigo: string) => Promise<boolean>;
  refetch: () => Promise<void>;
};

const PedidosContext = createContext<PedidosContextType | undefined>(undefined);

export function PedidosProvider({ children }: { children: ReactNode }) {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const skipNextSubscriptionUpdate = useRef(0);
  const isModifyingRef = useRef(false);

  const fetchPedidos = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: pedidosData, error: pedidosError } = await supabase
        .from("pedidos")
        .select(
          `
          *,
          clientes:cliente_id (
            codigo,
            nombre,
            celular,
            email
          )
        `,
        )
        .order("codigo", { ascending: false });

      if (pedidosError) throw pedidosError;

      const { data: itemsData, error: itemsError } = await supabase
        .from("pedido_items")
        .select("*");

      if (itemsError) {
        console.warn(
          "⚠️ No se pudieron cargar los items de pedidos:",
          itemsError,
        );
      }

      const pedidosConvertidos: Pedido[] = (pedidosData || []).map(
        (pedido: any) => {
          const itemsPedido = (itemsData || [])
            .filter((item: any) => item.pedido_codigo === pedido.codigo)
            .map((item: any) => ({
              id: item.id,
              productoId: item.producto_codigo,
              productoCodigo: item.producto_codigo,
              productoNombre: `${item.modelo} - ${item.tela} - ${item.disenio}`,
              modelo: item.modelo,
              tela: item.tela,
              disenio: item.disenio,
              talla: item.talla,
              color: item.color,
              cantidad: item.cantidad,
              precioUnitario: item.precio_unitario
                ? parseFloat(item.precio_unitario)
                : undefined,
              subtotal: item.subtotal ? parseFloat(item.subtotal) : undefined,
              esEspecial: item.es_especial ?? false,
            }));

          return {
            id: pedido.codigo,
            codigo: pedido.codigo,
            clienteId: pedido.cliente_id,
            cliente: pedido.clientes?.nombre || "Cliente desconocido",
            articulo: pedido.articulo,
            estado: pedido.estado as EstadoPedido,
            fecha: pedido.fecha,
            urgente: pedido.urgente,
            telefono: pedido.clientes?.celular || "",
            email: pedido.clientes?.email || "",
            notas: pedido.notas || undefined,
            motivoCancelacion: pedido.motivo_cancelacion || undefined,
            estadoAnteriorCancelacion:
              pedido.estado_anterior_cancelacion || undefined,
            estadoPago: pedido.estado_pago || "Pendiente",
            montoTotal: pedido.monto_total
              ? parseFloat(pedido.monto_total)
              : undefined,
            montoPagado: pedido.monto_pagado
              ? parseFloat(pedido.monto_pagado)
              : 0,
            fechaEntrega: pedido.fecha_entrega || undefined,
            metodoPago: pedido.metodo_pago || undefined,
            referenciaPago: pedido.referencia_pago || undefined,
            fechaPago: pedido.fecha_pago || undefined,
            notasPago: pedido.notas_pago || undefined,
            tieneEspeciales: pedido.tiene_especiales ?? false,
            items: itemsPedido.length > 0 ? itemsPedido : undefined,
          };
        },
      );

      setPedidos(pedidosConvertidos);

      // Auto-marcar como Vencido los pedidos que pasaron su fecha de entrega
      const hoy = obtenerFechaPeruHoy();
      const estadosActivos: EstadoPedido[] = [
        "Recibido",
        "En confección",
        "Listo para entrega",
      ];
      const aVencer = pedidosConvertidos.filter(
        (p) =>
          estadosActivos.includes(p.estado) &&
          p.fechaEntrega &&
          p.fechaEntrega < hoy,
      );

      if (aVencer.length > 0) {
        const codigos = aVencer.map((p) => p.codigo);
        await supabase
          .from("pedidos")
          .update({
            estado: "Vencido",
            estado_anterior_cancelacion: undefined, // no sobrescribir
          })
          .in("codigo", codigos);

        // Actualizar estado local sin refetch completo
        setPedidos((prev) =>
          prev.map((p) =>
            codigos.includes(p.codigo) ? { ...p, estado: "Vencido" } : p,
          ),
        );
      }
    } catch (err) {
      console.error("Error al cargar pedidos:", err);
      setError(err instanceof Error ? err.message : "Error desconocido");
      setPedidos([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPedidos();

    const subscription = supabase
      .channel("pedidos-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pedidos" },
        () => {
          if (isModifyingRef.current) {
            console.debug("⏭️ Ignorando evento durante modificación");
            return;
          }
          fetchPedidos();
        },
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const agregarPedido = async (data: {
    clienteId: string;
    articulo: string;
    urgente: boolean;
    notas?: string;
    fechaEntrega?: string;
    items?: PedidoItemData[];
  }): Promise<Pedido | null> => {
    try {
      isModifyingRef.current = true;

      const tieneEspeciales = data.items?.some((i) => i.esEspecial) ?? false;

      const insertData: PedidoInsert = {
        cliente_id: data.clienteId,
        articulo: data.articulo,
        urgente: data.urgente,
        notas: data.notas || null,
        fecha: obtenerFechaPeruHoy(),
        fecha_entrega: data.fechaEntrega || null,
        estado: "Recibido",
        tiene_especiales: tieneEspeciales,
      };

      const { data: nuevoPedido, error: insertError } = await supabase
        .from("pedidos")
        .insert(insertData)
        .select(
          `
          *,
          clientes:cliente_id (
            codigo,
            nombre,
            celular,
            email
          )
        `,
        )
        .single();

      if (insertError) throw insertError;

      let montoTotal = 0;
      if (data.items && data.items.length > 0) {
        montoTotal = data.items.reduce((sum, item) => {
          const precioUnitario = item.precioUnitario || 0;
          const cantidad = item.cantidad || 0;
          return sum + precioUnitario * cantidad;
        }, 0);
      }

      const pedidoConvertido: Pedido = {
        id: nuevoPedido.codigo,
        codigo: nuevoPedido.codigo,
        clienteId: nuevoPedido.cliente_id,
        cliente: (nuevoPedido as any).clientes?.nombre || "Cliente desconocido",
        articulo: nuevoPedido.articulo,
        estado: nuevoPedido.estado as EstadoPedido,
        fecha: nuevoPedido.fecha,
        urgente: nuevoPedido.urgente,
        telefono: (nuevoPedido as any).clientes?.celular || "",
        email: (nuevoPedido as any).clientes?.email || "",
        notas: nuevoPedido.notas || undefined,
        estadoPago: "Pendiente",
        montoTotal: montoTotal > 0 ? montoTotal : undefined,
        montoPagado: 0,
        fechaEntrega: data.fechaEntrega || undefined,
        tieneEspeciales,
      };

      if (montoTotal > 0) {
        const { error: updateError } = await supabase
          .from("pedidos")
          .update({ monto_total: montoTotal })
          .eq("codigo", nuevoPedido.codigo);

        if (updateError) {
          console.warn("⚠️ No se pudo actualizar el montoTotal:", updateError);
        }
      }

      const usuario = await obtenerUsuarioActual();
      const usuarioFinal = usuario || { codigo: "SISTEMA", nombre: "Sistema" };

      if (data.items && data.items.length > 0) {
        const resultadoStock = await actualizarStockPedidoCreado(
          pedidoConvertido.codigo,
          data.items,
          usuarioFinal.codigo,
          usuarioFinal.nombre,
        );

        if (!resultadoStock.exito) {
          await supabase
            .from("pedidos")
            .delete()
            .eq("codigo", pedidoConvertido.codigo);
          setError(`Error al actualizar stock: ${resultadoStock.mensaje}`);
          return null;
        }
      }

      await registrarAuditoria({
        usuarioCodigo: usuarioFinal.codigo,
        usuarioNombre: usuarioFinal.nombre,
        accion: "crear",
        modulo: "pedidos",
        entidadId: pedidoConvertido.codigo,
        entidadNombre: `${pedidoConvertido.cliente} - ${pedidoConvertido.articulo}`,
        detalles: {
          urgente: pedidoConvertido.urgente,
          notas: pedidoConvertido.notas,
          itemsCount: data.items?.length || 0,
          stockActualizado: data.items && data.items.length > 0,
        },
      });

      setPedidos((prev) => [pedidoConvertido, ...prev]);

      setTimeout(() => {
        isModifyingRef.current = false;
        fetchPedidos();
      }, 800);

      return pedidoConvertido;
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Error al agregar pedido";
      console.error("❌ Error al agregar pedido:", err);
      setError(errorMsg);
      isModifyingRef.current = false;
      return null;
    }
  };

  const actualizarPedido = async (
    codigo: string,
    datos: Partial<Pedido>,
  ): Promise<boolean> => {
    try {
      isModifyingRef.current = true;

      const pedidoActual = pedidos.find((p) => p.codigo === codigo);
      if (!pedidoActual) {
        setError("Pedido no encontrado");
        return false;
      }

      if (
        datos.articulo !== undefined ||
        datos.urgente !== undefined ||
        datos.notas !== undefined ||
        datos.fechaEntrega !== undefined
      ) {
        const validacionEdicion = puedeEditarPedido(pedidoActual.estado);
        if (!validacionEdicion.puede) {
          setError(validacionEdicion.mensaje);
          return false;
        }
      }

      if (datos.estado !== undefined && datos.estado !== pedidoActual.estado) {
        const validacion = validarTransicion(pedidoActual.estado, datos.estado);
        if (!validacion.valido) {
          setError(validacion.mensaje);
          return false;
        }
      }

      const updateData: PedidoUpdate = {};

      if (datos.estado !== undefined) updateData.estado = datos.estado;
      if (datos.articulo !== undefined) updateData.articulo = datos.articulo;
      if (datos.urgente !== undefined) updateData.urgente = datos.urgente;
      if (datos.notas !== undefined) updateData.notas = datos.notas;
      if (datos.fechaEntrega !== undefined)
        updateData.fecha_entrega = datos.fechaEntrega || null;

      const { error: updateError } = await supabase
        .from("pedidos")
        .update(updateData)
        .eq("codigo", codigo);

      if (updateError) throw updateError;

      const usuario = await obtenerUsuarioActual();
      const usuarioFinal = usuario || { codigo: "SISTEMA", nombre: "Sistema" };

      if (datos.estado !== undefined && datos.estado !== pedidoActual.estado) {
        await registrarAuditoria({
          usuarioCodigo: usuarioFinal.codigo,
          usuarioNombre: usuarioFinal.nombre,
          accion: "cambiar_estado",
          modulo: "pedidos",
          entidadId: codigo,
          entidadNombre: `${pedidoActual.cliente} - ${pedidoActual.articulo}`,
          detalles: {
            estadoAnterior: pedidoActual.estado,
            estadoNuevo: datos.estado,
            mensaje: generarMensajeCambioEstado(
              pedidoActual.estado,
              datos.estado,
              codigo,
            ),
          },
        });
      }

      if (
        datos.articulo !== undefined ||
        datos.urgente !== undefined ||
        datos.notas !== undefined ||
        datos.fechaEntrega !== undefined
      ) {
        await registrarAuditoria({
          usuarioCodigo: usuarioFinal.codigo,
          usuarioNombre: usuarioFinal.nombre,
          accion: "editar",
          modulo: "pedidos",
          entidadId: codigo,
          entidadNombre: `${pedidoActual.cliente} - ${pedidoActual.articulo}`,
          detalles: {
            cambios: updateData,
            articuloAnterior:
              datos.articulo !== undefined ? pedidoActual.articulo : undefined,
            urgenteAnterior:
              datos.urgente !== undefined ? pedidoActual.urgente : undefined,
            notasAnteriores:
              datos.notas !== undefined ? pedidoActual.notas : undefined,
            fechaEntregaAnterior:
              datos.fechaEntrega !== undefined
                ? pedidoActual.fechaEntrega
                : undefined,
          },
        });
      }

      setPedidos((prev) =>
        prev.map((p) => (p.codigo === codigo ? { ...p, ...datos } : p)),
      );

      setTimeout(() => {
        isModifyingRef.current = false;
        fetchPedidos();
      }, 800);

      return true;
    } catch (err) {
      console.error("Error al actualizar pedido:", err);
      setError(
        err instanceof Error ? err.message : "Error al actualizar pedido",
      );
      isModifyingRef.current = false;
      return false;
    }
  };

  const actualizarPedidoConItems = async (
    codigo: string,
    datosBasicos: Partial<Pedido>,
    items: Array<{
      pedido_codigo: string;
      producto_codigo: string;
      modelo: string;
      tela: string;
      disenio: string;
      talla: string;
      color: string;
      cantidad: number;
      precio_unitario?: number | null;
      subtotal?: number | null;
    }>,
  ): Promise<boolean> => {
    try {
      isModifyingRef.current = true;

      const pedidoActual = pedidos.find((p) => p.codigo === codigo);
      if (!pedidoActual) {
        setError("Pedido no encontrado");
        isModifyingRef.current = false;
        return false;
      }

      if (
        datosBasicos.articulo !== undefined ||
        datosBasicos.urgente !== undefined ||
        datosBasicos.notas !== undefined ||
        datosBasicos.fechaEntrega !== undefined
      ) {
        const validacionEdicion = puedeEditarPedido(pedidoActual.estado);
        if (!validacionEdicion.puede) {
          setError(validacionEdicion.mensaje);
          isModifyingRef.current = false;
          return false;
        }
      }

      // PASO 1: Obtener items actuales
      const { data: itemsActuales } = await supabase
        .from("pedido_items")
        .select("*")
        .eq("pedido_codigo", codigo);

      // PASO 2: Eliminar items existentes
      const { error: deleteError } = await supabase
        .from("pedido_items")
        .delete()
        .eq("pedido_codigo", codigo);

      if (deleteError) {
        setError(`Error al eliminar items: ${deleteError.message}`);
        isModifyingRef.current = false;
        return false;
      }

      // Verificación post-DELETE
      const { data: itemsAfterDelete } = await supabase
        .from("pedido_items")
        .select("*")
        .eq("pedido_codigo", codigo);

      if (itemsAfterDelete && itemsAfterDelete.length > 0) {
        setError(
          `Error crítico: DELETE no eliminó los items (quedan ${itemsAfterDelete.length})`,
        );
        isModifyingRef.current = false;
        return false;
      }

      // PASO 3: Insertar nuevos items
      if (items.length > 0) {
        const { error: insertError } = await supabase
          .from("pedido_items")
          .insert(items);

        if (insertError) {
          setError(`Error al guardar items: ${insertError.message}`);
          isModifyingRef.current = false;
          return false;
        }
      }

      // PASO 4: Actualizar datos básicos del pedido
      const updateData: PedidoUpdate = {};

      if (datosBasicos.articulo !== undefined)
        updateData.articulo = datosBasicos.articulo;
      if (datosBasicos.urgente !== undefined)
        updateData.urgente = datosBasicos.urgente;
      if (datosBasicos.notas !== undefined)
        updateData.notas = datosBasicos.notas;
      if (datosBasicos.fechaEntrega !== undefined)
        updateData.fecha_entrega = datosBasicos.fechaEntrega || null;

      if (Object.keys(updateData).length > 0) {
        const { error: updateError } = await supabase
          .from("pedidos")
          .update(updateData)
          .eq("codigo", codigo);

        if (updateError) {
          setError(`Error al actualizar pedido: ${updateError.message}`);
          isModifyingRef.current = false;
          return false;
        }
      }

      // PASO 5: Registrar auditoría
      const usuario = await obtenerUsuarioActual();
      const usuarioFinal = usuario || { codigo: "SISTEMA", nombre: "Sistema" };

      await registrarAuditoria({
        usuarioCodigo: usuarioFinal.codigo,
        usuarioNombre: usuarioFinal.nombre,
        accion: "editar",
        modulo: "pedidos",
        entidadId: codigo,
        entidadNombre: `${pedidoActual.cliente} - ${datosBasicos.articulo || pedidoActual.articulo}`,
        detalles: {
          cambios: updateData,
          itemsEliminados: itemsActuales?.length || 0,
          itemsInsertados: items.length,
        },
      });

      // PASO 6: Actualizar estado local  ← FIX: removido setItems() inexistente
      setPedidos((prev) =>
        prev.map((p) => (p.codigo === codigo ? { ...p, ...datosBasicos } : p)),
      );

      // PASO 7: Desactivar flag y refetch
      setTimeout(() => {
        isModifyingRef.current = false;
        fetchPedidos();
      }, 1500);

      return true;
    } catch (err) {
      console.error("❌ Error en actualizarPedidoConItems:", err);
      setError(
        err instanceof Error ? err.message : "Error al actualizar pedido",
      );
      isModifyingRef.current = false;
      return false;
    }
  };

  const cancelarPedido = async (
    codigo: string,
    motivo: string,
  ): Promise<boolean> => {
    try {
      isModifyingRef.current = true;

      const pedidoActual = pedidos.find((p) => p.codigo === codigo);
      if (!pedidoActual) {
        setError("Pedido no encontrado");
        return false;
      }

      const validacion = puedeCancelarPedido(pedidoActual.estado);
      if (!validacion.puede) {
        setError(validacion.mensaje);
        return false;
      }

      const usuario = await obtenerUsuarioActual();
      const usuarioFinal = usuario || { codigo: "SISTEMA", nombre: "Sistema" };

      const resultadoStock = await restaurarStockPedidoCancelado(
        codigo,
        usuarioFinal.codigo,
        usuarioFinal.nombre,
      );

      if (!resultadoStock.exito) {
        setError(`Error al restaurar stock: ${resultadoStock.mensaje}`);
        return false;
      }

      const { error: updateError } = await supabase
        .from("pedidos")
        .update({
          estado: "Cancelado",
          motivo_cancelacion: motivo,
          estado_anterior_cancelacion: pedidoActual.estado,
        })
        .eq("codigo", codigo);

      if (updateError) throw updateError;

      await registrarAuditoria({
        usuarioCodigo: usuarioFinal.codigo,
        usuarioNombre: usuarioFinal.nombre,
        accion: "cancelar",
        modulo: "pedidos",
        entidadId: codigo,
        entidadNombre: `${pedidoActual.cliente} - ${pedidoActual.articulo}`,
        detalles: {
          estadoAnterior: pedidoActual.estado,
          motivo: motivo,
          stockRestaurado: true,
        },
      });

      setPedidos((prev) =>
        prev.map((p) =>
          p.codigo === codigo
            ? {
                ...p,
                estado: "Cancelado" as EstadoPedido,
                motivoCancelacion: motivo,
              }
            : p,
        ),
      );

      setTimeout(() => {
        isModifyingRef.current = false;
        fetchPedidos();
      }, 800);

      return true;
    } catch (err) {
      console.error("Error al cancelar pedido:", err);
      setError(err instanceof Error ? err.message : "Error al cancelar pedido");
      isModifyingRef.current = false;
      return false;
    }
  };

  const reactivarPedido = async (codigo: string): Promise<boolean> => {
    try {
      isModifyingRef.current = true;

      const pedidoActual = pedidos.find((p) => p.codigo === codigo);
      if (!pedidoActual) {
        setError("Pedido no encontrado");
        return false;
      }

      if (pedidoActual.estado !== "Cancelado") {
        setError("Solo se pueden reactivar pedidos cancelados");
        return false;
      }

      if (!pedidoActual.estadoAnteriorCancelacion) {
        setError(
          "No se puede reactivar este pedido (no tiene estado anterior guardado)",
        );
        return false;
      }

      const usuario = await obtenerUsuarioActual();
      const usuarioFinal = usuario || { codigo: "SISTEMA", nombre: "Sistema" };

      // FIX: soloStock=true para no reinsertar items que ya existen en pedido_items
      const resultadoStock = await actualizarStockPedidoCreado(
        codigo,
        pedidoActual.items?.map((item) => ({
          productoCodigo: item.productoId,
          modelo: item.modelo,
          tela: item.tela,
          disenio: item.disenio,
          talla: item.talla,
          color: item.color,
          cantidad: item.cantidad,
        })) || [],
        usuarioFinal.codigo,
        usuarioFinal.nombre,
        true, // soloStock: solo actualiza stock, NO inserta en pedido_items
      );

      if (!resultadoStock.exito) {
        setError(`Error al actualizar stock: ${resultadoStock.mensaje}`);
        return false;
      }

      const { error: updateError } = await supabase
        .from("pedidos")
        .update({
          estado: pedidoActual.estadoAnteriorCancelacion,
          motivo_cancelacion: null,
          estado_anterior_cancelacion: null,
        })
        .eq("codigo", codigo);

      if (updateError) throw updateError;

      await registrarAuditoria({
        usuarioCodigo: usuarioFinal.codigo,
        usuarioNombre: usuarioFinal.nombre,
        accion: "reactivar",
        modulo: "pedidos",
        entidadId: codigo,
        entidadNombre: `${pedidoActual.cliente} - ${pedidoActual.articulo}`,
        detalles: {
          estadoAnterior: "Cancelado",
          estadoNuevo: pedidoActual.estadoAnteriorCancelacion,
          stockActualizado: true,
        },
      });

      setPedidos((prev) =>
        prev.map((p) =>
          p.codigo === codigo
            ? {
                ...p,
                estado: pedidoActual.estadoAnteriorCancelacion as EstadoPedido,
                motivoCancelacion: undefined,
                estadoAnteriorCancelacion: undefined,
              }
            : p,
        ),
      );

      setTimeout(() => {
        isModifyingRef.current = false;
        fetchPedidos();
      }, 800);

      return true;
    } catch (err) {
      console.error("Error al reactivar pedido:", err);
      setError(
        err instanceof Error ? err.message : "Error al reactivar pedido",
      );
      isModifyingRef.current = false;
      return false;
    }
  };

  return (
    <PedidosContext.Provider
      value={{
        pedidos,
        loading,
        error,
        agregarPedido,
        actualizarPedido,
        actualizarPedidoConItems,
        cancelarPedido,
        reactivarPedido,
        refetch: fetchPedidos,
      }}
    >
      {children}
    </PedidosContext.Provider>
  );
}

export function usePedidos() {
  const context = useContext(PedidosContext);
  if (context === undefined) {
    throw new Error("usePedidos debe usarse dentro de un PedidosProvider");
  }
  return context;
}
