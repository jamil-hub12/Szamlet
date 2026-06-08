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
  productoNombre?: string;
  modelo: string;
  tela: string;
  disenio: string;
  talla: string;
  color: string;
  cantidad: number;
  precioUnitario?: number;
  subtotal?: number;
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
    items?: PedidoItemData[]; // Items detallados de productos
  }) => Promise<Pedido | null>;
  actualizarPedido: (
    codigo: string,
    datos: Partial<Pedido>,
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
  const skipNextSubscriptionUpdate = useRef(false);

  const fetchPedidos = async () => {
    try {
      setLoading(true);
      setError(null);

      // Obtener pedidos con información del cliente
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

      // Obtener items de todos los pedidos
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
          // Filtrar items de este pedido
          const itemsPedido = (itemsData || [])
            .filter((item: any) => item.pedido_codigo === pedido.codigo)
            .map((item: any) => ({
              id: item.id,
              productoId: item.producto_codigo,
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
            items: itemsPedido.length > 0 ? itemsPedido : undefined,
          };
        },
      );

      setPedidos(pedidosConvertidos);
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
          if (!skipNextSubscriptionUpdate.current) {
            fetchPedidos();
          } else {
            skipNextSubscriptionUpdate.current = false;
          }
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
    items?: PedidoItemData[];
  }): Promise<Pedido | null> => {
    try {
      const insertData: PedidoInsert = {
        cliente_id: data.clienteId,
        articulo: data.articulo,
        urgente: data.urgente,
        notas: data.notas || null,
        fecha: obtenerFechaPeruHoy(),
        estado: "Recibido", // Estado inicial del ciclo de vida
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

      // Calcular montoTotal basado en los items
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
      };

      // Actualizar el pedido en BD con el montoTotal calculado
      if (montoTotal > 0) {
        const { error: updateError } = await supabase
          .from("pedidos")
          .update({ monto_total: montoTotal })
          .eq("codigo", nuevoPedido.codigo);

        if (updateError) {
          console.warn("⚠️ No se pudo actualizar el montoTotal:", updateError);
        }
      }

      // Actualizar stock si se enviaron items detallados
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
          // Si falla el stock, eliminar el pedido creado
          await supabase
            .from("pedidos")
            .delete()
            .eq("codigo", pedidoConvertido.codigo);
          setError(`Error al actualizar stock: ${resultadoStock.mensaje}`);
          return null;
        }
      }

      // Registrar en auditoría
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

      // Evitar que la suscripción haga un fetch completo
      skipNextSubscriptionUpdate.current = true;
      setTimeout(() => {
        skipNextSubscriptionUpdate.current = false;
      }, 1000);

      setPedidos((prev) => [pedidoConvertido, ...prev]);
      return pedidoConvertido;
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Error al agregar pedido";
      console.error("❌ Error al agregar pedido:", err);
      console.error("Detalles del error:", errorMsg);
      setError(errorMsg);
      return null;
    }
  };

  const actualizarPedido = async (
    codigo: string,
    datos: Partial<Pedido>,
  ): Promise<boolean> => {
    try {
      // Obtener el pedido actual
      const pedidoActual = pedidos.find((p) => p.codigo === codigo);
      if (!pedidoActual) {
        setError("Pedido no encontrado");
        return false;
      }

      // Validar si se puede editar el pedido
      if (
        datos.articulo !== undefined ||
        datos.urgente !== undefined ||
        datos.notas !== undefined
      ) {
        const validacionEdicion = puedeEditarPedido(pedidoActual.estado);
        if (!validacionEdicion.puede) {
          setError(validacionEdicion.mensaje);
          return false;
        }
      }

      // Validar transición de estado si se está cambiando
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

      const { error: updateError } = await supabase
        .from("pedidos")
        .update(updateData)
        .eq("codigo", codigo);

      if (updateError) throw updateError;

      const usuario = await obtenerUsuarioActual();
      const usuarioFinal = usuario || { codigo: "SISTEMA", nombre: "Sistema" };

      // Registrar en auditoría si cambió el estado
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

      // Registrar en auditoría si se editaron otros campos
      if (
        datos.articulo !== undefined ||
        datos.urgente !== undefined ||
        datos.notas !== undefined
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
          },
        });
      }

      setPedidos((prev) =>
        prev.map((p) => (p.codigo === codigo ? { ...p, ...datos } : p)),
      );
      return true;
    } catch (err) {
      console.error("Error al actualizar pedido:", err);
      setError(
        err instanceof Error ? err.message : "Error al actualizar pedido",
      );
      return false;
    }
  };

  const cancelarPedido = async (
    codigo: string,
    motivo: string,
  ): Promise<boolean> => {
    try {
      // Obtener el pedido actual
      const pedidoActual = pedidos.find((p) => p.codigo === codigo);
      if (!pedidoActual) {
        setError("Pedido no encontrado");
        return false;
      }

      // Validar si se puede cancelar el pedido
      const validacion = puedeCancelarPedido(pedidoActual.estado);
      if (!validacion.puede) {
        setError(validacion.mensaje);
        return false;
      }

      // Obtener usuario actual
      const usuario = await obtenerUsuarioActual();
      const usuarioFinal = usuario || { codigo: "SISTEMA", nombre: "Sistema" };

      // Restaurar stock antes de cancelar
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

      // Registrar en auditoría
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
      return true;
    } catch (err) {
      console.error("Error al cancelar pedido:", err);
      setError(err instanceof Error ? err.message : "Error al cancelar pedido");
      return false;
    }
  };

  const reactivarPedido = async (codigo: string): Promise<boolean> => {
    try {
      // Obtener el pedido actual
      const pedidoActual = pedidos.find((p) => p.codigo === codigo);
      if (!pedidoActual) {
        setError("Pedido no encontrado");
        return false;
      }

      // Verificar que esté cancelado
      if (pedidoActual.estado !== "Cancelado") {
        setError("Solo se pueden reactivar pedidos cancelados");
        return false;
      }

      // Verificar que tenga un estado anterior guardado
      if (!pedidoActual.estadoAnteriorCancelacion) {
        setError(
          "No se puede reactivar este pedido (no tiene estado anterior guardado)",
        );
        return false;
      }

      // Obtener usuario actual
      const usuario = await obtenerUsuarioActual();
      const usuarioFinal = usuario || { codigo: "SISTEMA", nombre: "Sistema" };

      // Descontar el stock nuevamente (revertir la restauración)
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
      );

      if (!resultadoStock.exito) {
        setError(`Error al actualizar stock: ${resultadoStock.mensaje}`);
        return false;
      }

      // Reactivar el pedido al estado anterior
      const { error: updateError } = await supabase
        .from("pedidos")
        .update({
          estado: pedidoActual.estadoAnteriorCancelacion,
          motivo_cancelacion: null,
          estado_anterior_cancelacion: null,
        })
        .eq("codigo", codigo);

      if (updateError) throw updateError;

      // Registrar en auditoría
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

      return true;
    } catch (err) {
      console.error("Error al reactivar pedido:", err);
      setError(
        err instanceof Error ? err.message : "Error al reactivar pedido",
      );
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
