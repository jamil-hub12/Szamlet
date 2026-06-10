import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useRef,
} from "react";
import { supabase } from "../../lib/supabase";
import { useAuditoria } from "./AuditoriaContext";
import {
  obtenerFechaPeruHoy,
  obtenerFechaHoraPeruISO,
} from "../../utils/fechas";

type Pago = {
  id: string;
  pedidoCodigo: string;
  clienteNombre?: string;
  monto: number;
  metodoPago: "Efectivo" | "QR/Transferencia";
  referencia?: string;
  fechaPago: string;
  usuarioCodigo: string;
  usuarioNombre: string;
  notas?: string;
  createdAt: string;
};

type InfoPagoPedido = {
  montoTotal: number;
  estadoPago: "Pendiente" | "Pagado" | "Parcial";
  metodoPago?: string;
  montoPagado: number;
  fechaPago?: string;
  referenciaPago?: string;
  notasPago?: string;
};

type PagosContextType = {
  pagos: Pago[];
  cargando: boolean;
  obtenerPagosPorPedido: (pedidoCodigo: string) => Pago[];
  obtenerInfoPagoPedido: (
    pedidoCodigo: string,
  ) => Promise<InfoPagoPedido | null>;
  registrarPago: (pago: Omit<Pago, "id" | "createdAt">) => Promise<boolean>;
  obtenerEstadisticasPagos: (
    fechaDesde?: string,
    fechaHasta?: string,
  ) => {
    totalIngresos: number;
    pagosPendientes: number;
    pagosParciales: number;
    pagosCompletos: number;
    porMetodo: Record<string, number>;
  };
};

const PagosContext = createContext<PagosContextType | undefined>(undefined);

export function PagosProvider({ children }: { children: ReactNode }) {
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [cargando, setCargando] = useState(true);
  const { registrarAccion } = useAuditoria();
  const skipNextSubscriptionUpdate = useRef(false);

  const fetchPagos = async () => {
    try {
      const { data, error } = await supabase
        .from("pagos")
        .select(
          `
          *,
          pedidos!inner(
            cliente_id,
            clientes!inner(
              nombre
            )
          )
        `,
        )
        .order("fecha_pago", { ascending: false });

      if (error) throw error;

      if (data) {
        const pagosFormateados = data.map((p: any) => ({
          id: p.id,
          pedidoCodigo: p.pedido_codigo,
          clienteNombre: p.pedidos?.clientes?.nombre,
          monto: parseFloat(p.monto),
          metodoPago: p.metodo_pago,
          referencia: p.referencia,
          fechaPago: p.fecha_pago,
          usuarioCodigo: p.usuario_codigo,
          usuarioNombre: p.usuario_nombre,
          notas: p.notas,
          createdAt: p.created_at,
        }));
        setPagos(pagosFormateados);
      }
    } catch (error) {
      console.error("Error al cargar pagos:", error);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    fetchPagos();

    // Suscripción en tiempo real
    const subscription = supabase
      .channel("pagos-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pagos" },
        () => {
          console.log("🔔 Cambio en pagos detectado");
          if (!skipNextSubscriptionUpdate.current) {
            fetchPagos();
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

  const obtenerPagosPorPedido = (pedidoCodigo: string): Pago[] => {
    return pagos.filter((p) => p.pedidoCodigo === pedidoCodigo);
  };

  const obtenerInfoPagoPedido = async (
    pedidoCodigo: string,
  ): Promise<InfoPagoPedido | null> => {
    try {
      const { data, error } = await supabase
        .from("pedidos")
        .select(
          "monto_total, estado_pago, metodo_pago, monto_pagado, fecha_pago, referencia_pago, notas_pago",
        )
        .eq("codigo", pedidoCodigo)
        .single();

      if (error) throw error;

      if (data) {
        return {
          montoTotal: parseFloat(data.monto_total) || 0,
          estadoPago: data.estado_pago || "Pendiente",
          metodoPago: data.metodo_pago,
          montoPagado: parseFloat(data.monto_pagado) || 0,
          fechaPago: data.fecha_pago,
          referenciaPago: data.referencia_pago,
          notasPago: data.notas_pago,
        };
      }

      return null;
    } catch (error) {
      console.error("Error al obtener info de pago:", error);
      return null;
    }
  };

  const registrarPago = async (
    pago: Omit<Pago, "id" | "createdAt">,
  ): Promise<boolean> => {
    try {
      // Establecer flag ANTES de insertar
      skipNextSubscriptionUpdate.current = true;
      setTimeout(() => {
        skipNextSubscriptionUpdate.current = false;
      }, 1000);

      // 1. Insertar registro en tabla pagos
      const { error: errorPago } = await supabase.from("pagos").insert({
        pedido_codigo: pago.pedidoCodigo,
        monto: pago.monto,
        metodo_pago: pago.metodoPago,
        referencia: pago.referencia,
        fecha_pago: pago.fechaPago,
        usuario_codigo: pago.usuarioCodigo,
        usuario_nombre: pago.usuarioNombre,
        notas: pago.notas,
      });

      if (errorPago) throw errorPago;

      // 2. Actualizar totales en pedidos
      const { data: pedidoActual } = await supabase
        .from("pedidos")
        .select("monto_pagado, monto_total")
        .eq("codigo", pago.pedidoCodigo)
        .single();

      if (pedidoActual) {
        const montoPagadoAnterior = parseFloat(pedidoActual.monto_pagado) || 0;
        const nuevoMontoPagado = montoPagadoAnterior + pago.monto;

        console.log("💰 Actualizando pedido:", {
          codigo: pago.pedidoCodigo,
          montoPagadoAnterior,
          pagoNuevo: pago.monto,
          nuevoMontoPagado,
          montoTotal: pedidoActual.monto_total,
        });

        const { error: errorUpdate } = await supabase
          .from("pedidos")
          .update({
            monto_pagado: nuevoMontoPagado,
            metodo_pago: pago.metodoPago,
            fecha_pago: pago.fechaPago,
            referencia_pago: pago.referencia,
            notas_pago: pago.notas,
          })
          .eq("codigo", pago.pedidoCodigo);

        if (errorUpdate) {
          console.error("❌ Error al actualizar pedido:", errorUpdate);
          throw errorUpdate;
        }

        console.log("✅ Pedido actualizado correctamente");
      }

      // 3. Registrar en auditoría
      await registrarAccion({
        usuarioCodigo: pago.usuarioCodigo,
        usuarioNombre: pago.usuarioNombre,
        accion: "crear",
        modulo: "pedidos",
        entidadId: pago.pedidoCodigo,
        entidadNombre: `Pago de ${pago.monto.toFixed(2)} - ${pago.metodoPago}`,
        detalles: {
          monto: pago.monto,
          metodoPago: pago.metodoPago,
          referencia: pago.referencia,
          notas: pago.notas,
        },
      });

      console.log("✅ Pago registrado correctamente");

      await fetchPagos();
      return true;
    } catch (error) {
      console.error("❌ Error al registrar pago:", error);
      return false;
    }
  };

  const obtenerEstadisticasPagos = (
    fechaDesde?: string,
    fechaHasta?: string,
  ) => {
    let pagosFiltrados = pagos;

    if (fechaDesde) {
      pagosFiltrados = pagosFiltrados.filter((p) => p.fechaPago >= fechaDesde);
    }

    if (fechaHasta) {
      pagosFiltrados = pagosFiltrados.filter((p) => p.fechaPago <= fechaHasta);
    }

    const totalIngresos = pagosFiltrados.reduce((sum, p) => sum + p.monto, 0);

    const porMetodo = pagosFiltrados.reduce(
      (acc, p) => {
        acc[p.metodoPago] = (acc[p.metodoPago] || 0) + p.monto;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      totalIngresos,
      pagosPendientes: 0,
      pagosParciales: 0,
      pagosCompletos: 0,
      porMetodo,
    };
  };

  return (
    <PagosContext.Provider
      value={{
        pagos,
        cargando,
        obtenerPagosPorPedido,
        obtenerInfoPagoPedido,
        registrarPago,
        obtenerEstadisticasPagos,
      }}
    >
      {children}
    </PagosContext.Provider>
  );
}

export function usePagos() {
  const context = useContext(PagosContext);
  if (context === undefined) {
    throw new Error("usePagos debe usarse dentro de PagosProvider");
  }
  return context;
}
