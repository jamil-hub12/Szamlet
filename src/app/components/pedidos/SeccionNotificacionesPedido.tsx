import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  Bell,
  CalendarDays,
  CheckCircle2,
  Filter,
  Loader2,
  Mail,
  MessageSquareText,
  RefreshCcw,
  SearchX,
  Send,
  UserRound,
  XCircle,
} from "lucide-react";
import { useNotificaciones } from "../../contexts/NotificacionesContext";
import { formatearFechaHoraPeru } from "../../utils/fechas";
import {
  aplicarFiltroNotificaciones,
  clasificarEstadoEntrega,
  filtrarNotificacionesPorPedido,
  hayFiltroActivo,
  noHayNotificacionesRegistradas,
  ordenarNotificacionesPorFecha,
  tieneContenidoDisponible,
  type EstadoEntregaNotificacion,
  type NotificacionLog,
} from "../../utils/notificacionesLog";

type FiltroNotificacionesState = {
  fecha: string;
  medio: string;
  estado: "" | EstadoEntregaNotificacion;
};

const FILTRO_INICIAL: FiltroNotificacionesState = {
  fecha: "",
  medio: "",
  estado: "",
};

const ETIQUETAS_ESTADO: Record<EstadoEntregaNotificacion, string> = {
  exitoso: "Exitoso",
  fallido: "Fallido",
  no_confirmado: "No confirmado",
};

const CLASES_ESTADO: Record<EstadoEntregaNotificacion, string> = {
  exitoso: "bg-emerald-50 text-emerald-700 border-emerald-200",
  fallido: "bg-red-50 text-red-700 border-red-200",
  no_confirmado: "bg-slate-50 text-slate-700 border-slate-200",
};

const ICONOS_ESTADO: Record<EstadoEntregaNotificacion, ReactNode> = {
  exitoso: <CheckCircle2 className="w-3.5 h-3.5" />,
  fallido: <XCircle className="w-3.5 h-3.5" />,
  no_confirmado: <AlertTriangle className="w-3.5 h-3.5" />,
};

function formatearTituloMedio(medio: string | null): string {
  if (!medio) return "Medio no disponible";
  return medio.charAt(0).toUpperCase() + medio.slice(1);
}

function obtenerMediosDisponibles(notificaciones: NotificacionLog[]): string[] {
  return Array.from(
    new Set(
      notificaciones
        .map((notificacion) => notificacion.medio?.trim())
        .filter((medio): medio is string => Boolean(medio)),
    ),
  ).sort((a, b) => a.localeCompare(b));
}

function normalizarFiltro(filtro: FiltroNotificacionesState): {
  fecha?: string;
  medio?: string;
  estado?: EstadoEntregaNotificacion;
} {
  return {
    fecha: filtro.fecha || undefined,
    medio: filtro.medio || undefined,
    estado: filtro.estado || undefined,
  };
}

function FiltroSelect({
  label,
  icon,
  children,
}: {
  label: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <label className="space-y-1.5">
      <span className="text-xs text-muted-foreground flex items-center gap-1.5">
        {icon}
        {label}
      </span>
      {children}
    </label>
  );
}

export function SeccionNotificacionesPedido({
  pedidoCodigo,
}: {
  pedidoCodigo: string;
}) {
  const { obtenerHistorialNotificacionesPedido } = useNotificaciones();
  const [historial, setHistorial] = useState<NotificacionLog[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtro, setFiltro] =
    useState<FiltroNotificacionesState>(FILTRO_INICIAL);

  useEffect(() => {
    let activo = true;

    const cargarHistorial = async () => {
      setCargando(true);
      setError(null);

      const resultado =
        await obtenerHistorialNotificacionesPedido(pedidoCodigo);

      if (!activo) return;

      if (resultado.error) {
        setError(resultado.error);
        setHistorial([]);
      } else {
        setHistorial(resultado.data ?? []);
      }

      setCargando(false);
    };

    setFiltro(FILTRO_INICIAL);
    void cargarHistorial();

    return () => {
      activo = false;
    };
  }, [obtenerHistorialNotificacionesPedido, pedidoCodigo]);

  const historialPedido = useMemo(
    () =>
      ordenarNotificacionesPorFecha(
        filtrarNotificacionesPorPedido(historial, pedidoCodigo),
      ),
    [historial, pedidoCodigo],
  );

  const mediosDisponibles = useMemo(
    () => obtenerMediosDisponibles(historialPedido),
    [historialPedido],
  );

  const historialFiltrado = useMemo(
    () =>
      aplicarFiltroNotificaciones(historialPedido, normalizarFiltro(filtro)),
    [filtro, historialPedido],
  );

  const limpiarFiltros = () => setFiltro(FILTRO_INICIAL);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-sm font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
          <Bell className="w-4 h-4" />
          Historial de Notificaciones
        </h4>

        {hayFiltroActivo(normalizarFiltro(filtro)) && !cargando && !error && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] border bg-muted text-muted-foreground">
            <Filter className="w-3 h-3" />
            Filtros activos
          </span>
        )}
      </div>

      <div className="bg-muted/30 border border-border rounded-xl p-4 space-y-4">
        {cargando ? (
          <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
            <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
            <div>
              <p className="text-sm text-foreground font-medium">
                Cargando historial...
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Recuperando los envios asociados a este pedido.
              </p>
            </div>
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4">
            <div className="flex gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0 space-y-3">
                <div>
                  <h5 className="text-sm font-semibold text-red-900">
                    No se pudo cargar el historial
                  </h5>
                  <p className="text-xs text-red-700 mt-1">{error}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setCargando(true);
                    void (async () => {
                      const resultado =
                        await obtenerHistorialNotificacionesPedido(
                          pedidoCodigo,
                        );

                      if (resultado.error) {
                        setError(resultado.error);
                        setHistorial([]);
                      } else {
                        setHistorial(resultado.data ?? []);
                      }

                      setCargando(false);
                    })();
                  }}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-red-600 text-white text-xs font-medium hover:bg-red-700 transition"
                >
                  <RefreshCcw className="w-3.5 h-3.5" />
                  Reintentar
                </button>
              </div>
            </div>
          </div>
        ) : noHayNotificacionesRegistradas(historialPedido) ? (
          <div className="flex flex-col items-center justify-center py-10 px-6 text-center gap-3">
            <Bell className="w-10 h-10 text-muted-foreground/40" />
            <div>
              <p className="text-sm text-foreground font-medium">
                No hay notificaciones registradas para este pedido.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Cuando el equipo envie cambios de estado, apareceran aqui.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <FiltroSelect
                label="Fecha"
                icon={<CalendarDays className="w-3.5 h-3.5" />}
              >
                <input
                  type="date"
                  value={filtro.fecha}
                  onChange={(event) =>
                    setFiltro((current) => ({
                      ...current,
                      fecha: event.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                />
              </FiltroSelect>

              <FiltroSelect
                label="Medio"
                icon={<Send className="w-3.5 h-3.5" />}
              >
                <select
                  value={filtro.medio}
                  onChange={(event) =>
                    setFiltro((current) => ({
                      ...current,
                      medio: event.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                >
                  <option value="">Todos los medios</option>
                  {mediosDisponibles.map((medio) => (
                    <option key={medio} value={medio}>
                      {formatearTituloMedio(medio)}
                    </option>
                  ))}
                </select>
              </FiltroSelect>

              <FiltroSelect
                label="Estado de entrega"
                icon={<Filter className="w-3.5 h-3.5" />}
              >
                <select
                  value={filtro.estado}
                  onChange={(event) =>
                    setFiltro((current) => ({
                      ...current,
                      estado: event.target.value as
                        | ""
                        | EstadoEntregaNotificacion,
                    }))
                  }
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                >
                  <option value="">Todos los estados</option>
                  <option value="exitoso">Exitoso</option>
                  <option value="fallido">Fallido</option>
                  <option value="no_confirmado">No confirmado</option>
                </select>
              </FiltroSelect>
            </div>

            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                {historialFiltrado.length} notificacion
                {historialFiltrado.length === 1 ? "" : "es"} visible
                {hayFiltroActivo(normalizarFiltro(filtro))
                  ? " con filtros aplicados"
                  : ""}
                .
              </p>

              {hayFiltroActivo(normalizarFiltro(filtro)) && (
                <button
                  type="button"
                  onClick={limpiarFiltros}
                  className="text-xs text-primary hover:underline"
                >
                  Limpiar filtros
                </button>
              )}
            </div>

            {historialFiltrado.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center gap-3 border border-dashed border-border rounded-xl bg-background/50">
                <SearchX className="w-10 h-10 text-muted-foreground/50" />
                <div>
                  <p className="text-sm text-foreground font-medium">
                    No hay resultados para estos filtros.
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Prueba con otra fecha, medio o estado de entrega.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {historialFiltrado.map((notificacion) => {
                  const estadoClasificado = clasificarEstadoEntrega(
                    notificacion.estadoEntrega,
                  );
                  const contenidoDisponible = tieneContenidoDisponible(
                    notificacion.contenido,
                  );

                  return (
                    <article
                      key={notificacion.id}
                      className="rounded-xl border border-border bg-background/80 p-4 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1.5 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs border bg-muted text-muted-foreground">
                              <Mail className="w-3.5 h-3.5" />
                              {formatearTituloMedio(notificacion.medio)}
                            </span>

                            <span
                              className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs border ${CLASES_ESTADO[estadoClasificado]}`}
                            >
                              {ICONOS_ESTADO[estadoClasificado]}
                              {ETIQUETAS_ESTADO[estadoClasificado]}
                            </span>
                          </div>

                          <p className="text-sm font-medium text-foreground">
                            {contenidoDisponible
                              ? notificacion.contenido
                              : "Contenido no disponible"}
                          </p>
                        </div>

                        <div className="text-right shrink-0">
                          <p className="text-xs text-muted-foreground">
                            {formatearFechaHoraPeru(notificacion.fecha)}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <UserRound className="w-3.5 h-3.5" />
                          <span>
                            Destinatario:{" "}
                            {notificacion.destinatario ?? "No disponible"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MessageSquareText className="w-3.5 h-3.5" />
                          <span>
                            Pedido: {notificacion.pedidoCodigo || pedidoCodigo}
                          </span>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
