import { useState } from "react";
import { Bell, X, Check, CheckCheck, Trash2, AlertCircle, Info, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { useNotificaciones } from "../contexts/NotificacionesContext";

export function PanelNotificaciones() {
  const {
    notificaciones,
    marcarComoLeida,
    marcarTodasComoLeidas,
    eliminarNotificacion,
    limpiarNotificaciones,
    noLeidas,
  } = useNotificaciones();

  const [abierto, setAbierto] = useState(false);

  const iconosPorTipo = {
    exito: <CheckCircle2 className="w-5 h-5 text-emerald-600" />,
    error: <XCircle className="w-5 h-5 text-red-600" />,
    info: <Info className="w-5 h-5 text-blue-600" />,
    advertencia: <AlertTriangle className="w-5 h-5 text-amber-600" />,
  };

  const colorPorTipo = {
    exito: "bg-emerald-50 border-emerald-200",
    error: "bg-red-50 border-red-200",
    info: "bg-blue-50 border-blue-200",
    advertencia: "bg-amber-50 border-amber-200",
  };

  const formatearFecha = (timestamp: string) => {
    const fecha = new Date(timestamp);
    const ahora = new Date();
    const diffMs = ahora.getTime() - fecha.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHoras = Math.floor(diffMs / 3600000);
    const diffDias = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Ahora";
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHoras < 24) return `Hace ${diffHoras} h`;
    if (diffDias === 1) return "Ayer";
    if (diffDias < 7) return `Hace ${diffDias} días`;

    return fecha.toLocaleDateString("es-PE", {
      day: "numeric",
      month: "short",
    });
  };

  return (
    <div className="relative">
      {/* Botón de notificaciones */}
      <button
        onClick={() => setAbierto(!abierto)}
        className="relative p-2 rounded-lg hover:bg-accent transition"
      >
        <Bell className="w-5 h-5 text-muted-foreground" />
        {noLeidas > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs flex items-center justify-center rounded-full">
            {noLeidas > 9 ? "9+" : noLeidas}
          </span>
        )}
      </button>

      {/* Panel de notificaciones */}
      {abierto && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setAbierto(false)}
          />

          {/* Panel */}
          <div className="absolute right-0 top-12 z-50 w-96 max-h-[600px] bg-card border border-border rounded-xl shadow-2xl flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-muted-foreground" />
                <h3 className="text-sm text-foreground font-medium">
                  Notificaciones
                  {noLeidas > 0 && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      ({noLeidas} sin leer)
                    </span>
                  )}
                </h3>
              </div>
              <div className="flex items-center gap-1">
                {notificaciones.length > 0 && noLeidas > 0 && (
                  <button
                    onClick={marcarTodasComoLeidas}
                    className="p-1.5 rounded hover:bg-accent transition"
                    title="Marcar todas como leídas"
                  >
                    <CheckCheck className="w-4 h-4 text-muted-foreground" />
                  </button>
                )}
                {notificaciones.length > 0 && (
                  <button
                    onClick={limpiarNotificaciones}
                    className="p-1.5 rounded hover:bg-accent transition"
                    title="Limpiar todo"
                  >
                    <Trash2 className="w-4 h-4 text-muted-foreground" />
                  </button>
                )}
                <button
                  onClick={() => setAbierto(false)}
                  className="p-1.5 rounded hover:bg-accent transition"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            </div>

            {/* Lista de notificaciones */}
            <div className="flex-1 overflow-y-auto">
              {notificaciones.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                  <Bell className="w-12 h-12 text-muted-foreground opacity-40 mb-3" />
                  <p className="text-sm text-muted-foreground">
                    No hay notificaciones
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Te avisaremos cuando haya cambios en los pedidos
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {notificaciones.map((notif) => (
                    <div
                      key={notif.id}
                      className={`px-4 py-3 hover:bg-accent/30 transition cursor-pointer ${
                        !notif.leida ? "bg-accent/10" : ""
                      }`}
                      onClick={() => marcarComoLeida(notif.id)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="shrink-0 mt-0.5">
                          {iconosPorTipo[notif.tipo]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h4 className="text-sm text-foreground font-medium">
                              {notif.titulo}
                            </h4>
                            {!notif.leida && (
                              <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mb-2">
                            {notif.mensaje}
                          </p>

                          {/* Información adicional de pedido */}
                          {notif.pedidoCodigo && (
                            <div
                              className={`px-2 py-1.5 rounded border text-xs mb-2 ${
                                colorPorTipo[notif.tipo]
                              }`}
                            >
                              <p className="font-mono text-foreground mb-0.5">
                                {notif.pedidoCodigo}
                              </p>
                              {notif.estadoAnterior && notif.estadoNuevo && (
                                <p className="text-muted-foreground">
                                  {notif.estadoAnterior} → {notif.estadoNuevo}
                                </p>
                              )}
                              {notif.emailEnviado !== undefined && (
                                <p
                                  className={`flex items-center gap-1 mt-1 ${
                                    notif.emailEnviado
                                      ? "text-emerald-700"
                                      : "text-red-700"
                                  }`}
                                >
                                  {notif.emailEnviado ? (
                                    <Check className="w-3 h-3" />
                                  ) : (
                                    <X className="w-3 h-3" />
                                  )}
                                  Email{" "}
                                  {notif.emailEnviado ? "enviado" : "no enviado"}
                                </p>
                              )}
                            </div>
                          )}

                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">
                              {formatearFecha(notif.timestamp)}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                eliminarNotificacion(notif.id);
                              }}
                              className="p-1 rounded hover:bg-background/80 transition"
                            >
                              <Trash2 className="w-3 h-3 text-muted-foreground" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
