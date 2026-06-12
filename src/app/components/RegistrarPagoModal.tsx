import { useState, useEffect } from "react";
import {
  X,
  Coins,
  CreditCard,
  Calendar,
  AlertCircle,
  Clock,
} from "lucide-react";
import { usePagos } from "../contexts/PagosContext";
import { formatearSoles } from "../utils/formatoMoneda";
import {
  obtenerFechaHoraPeruISO,
  formatearFechaHoraPeru,
} from "../../utils/fechas";
import {
  esValidaFechaMaximaHoy,
  obtenerMensajeErrorFecha,
  esPedidoVencido,
  diasHastaVencimiento,
} from "../utils/validaciones";
import { obtenerFechaPeruHoy } from "../../utils/fechas";
import type { EstadoPedido } from "../contexts/PedidosContext";

type Props = {
  pedidoCodigo: string;
  montoTotal: number;
  montoPagado: number;
  onClose: () => void;
  onSuccess: () => void;
  usuarioCodigo: string;
  usuarioNombre: string;
  fechaEntrega?: string;
  estado?: EstadoPedido;
};

export function RegistrarPagoModal({
  pedidoCodigo,
  montoTotal,
  montoPagado,
  onClose,
  onSuccess,
  usuarioCodigo,
  usuarioNombre,
  fechaEntrega,
  estado,
}: Props) {
  const { registrarPago } = usePagos();

  // Verificar si el pedido está vencido
  const pedidoVencido = esPedidoVencido(fechaEntrega, estado);
  const diasRestantes = diasHastaVencimiento(fechaEntrega, estado);

  // Detectar si el pedido no tiene monto total (pedido antiguo)
  const esPedidoSinPrecio = montoTotal === 0;
  const montoRestante = montoTotal - montoPagado;

  const [monto, setMonto] = useState<string>(
    esPedidoSinPrecio ? "" : montoRestante.toFixed(2),
  );
  const [montoTotalPedido, setMontoTotalPedido] = useState<string>(
    esPedidoSinPrecio ? "" : montoTotal.toFixed(2),
  );
  const [mostrarConfiguracionPrecio, setMostrarConfiguracionPrecio] =
    useState(esPedidoSinPrecio);
  const [metodoPago, setMetodoPago] = useState<"Efectivo" | "QR/Transferencia">(
    "Efectivo",
  );
  const [notas, setNotas] = useState("");
  const [referencia, setReferencia] = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!esPedidoSinPrecio) {
      setMonto(montoRestante.toFixed(2));
    }
  }, [montoRestante, esPedidoSinPrecio]);

  const handleConfigurarPrecio = async () => {
    const montoTotalNum = parseFloat(montoTotalPedido);

    if (isNaN(montoTotalNum) || montoTotalNum <= 0) {
      alert("❌ El monto total debe ser mayor a 0");
      return;
    }

    // Actualizar el monto total del pedido en la base de datos
    const { supabase } = await import("../../lib/supabase");
    const { error } = await supabase
      .from("pedidos")
      .update({ monto_total: montoTotalNum })
      .eq("codigo", pedidoCodigo);

    if (error) {
      console.error("Error al actualizar monto total:", error);
      alert("❌ Error al guardar el monto total del pedido");
      return;
    }

    // Continuar con el registro del pago
    setMostrarConfiguracionPrecio(false);
    setMonto(montoTotalNum.toFixed(2));
  };

  const handleGuardar = async () => {
    const montoNumerico = parseFloat(monto);

    if (isNaN(montoNumerico) || montoNumerico <= 0) {
      alert("❌ El monto del pago debe ser mayor a 0");
      return;
    }

    // Validar si el pedido está vencido
    if (pedidoVencido) {
      alert(
        "❌ No se puede registrar pago\n\nEste pedido está vencido (fecha de entrega pasada) y no se pueden registrar pagos sobre pedidos vencidos.",
      );
      return;
    }

    // Validar solo si no es un pedido sin precio
    if (!esPedidoSinPrecio) {
      const montoRestanteActual =
        parseFloat(montoTotalPedido || montoTotal.toString()) - montoPagado;
      if (montoNumerico > montoRestanteActual) {
        alert(
          `❌ El monto no puede ser mayor al saldo pendiente (${formatearSoles(montoRestanteActual)})`,
        );
        return;
      }
    }

    setGuardando(true);

    const exito = await registrarPago({
      pedidoCodigo,
      monto: montoNumerico,
      metodoPago,
      referencia:
        metodoPago === "QR/Transferencia"
          ? referencia.trim() || undefined
          : undefined,
      usuarioCodigo,
      usuarioNombre,
      fechaPago: obtenerFechaHoraPeruISO(),
      notas: notas.trim() || undefined,
    });

    setGuardando(false);

    if (exito) {
      onSuccess();
      onClose();
    } else {
      alert("❌ Error al registrar el pago");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-xl w-full max-w-lg shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <Coins className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Registrar Pago
              </h2>
              <p className="text-sm text-muted-foreground">
                Pedido {pedidoCodigo}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-accent rounded-lg transition"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Alerta para pedidos vencidos */}
          {pedidoVencido && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-red-900 mb-1">
                    Pedido Vencido
                  </h4>
                  <p className="text-xs text-red-700">
                    Este pedido ya pasó su fecha de entrega y no se pueden
                    registrar pagos. Contacta con administración si necesitas
                    realizar un pago.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Alerta para pedidos próximos a vencer */}
          {!pedidoVencido &&
            fechaEntrega &&
            diasRestantes !== null &&
            diasRestantes > 0 &&
            diasRestantes <= 3 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex gap-3">
                  <Clock className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-semibold text-yellow-900 mb-1">
                      Pedido próximo a vencer
                    </h4>
                    <p className="text-xs text-yellow-700">
                      Vencimiento en {diasRestantes}{" "}
                      {diasRestantes === 1 ? "día" : "días"}. Registra el pago
                      antes de esa fecha.
                    </p>
                  </div>
                </div>
              </div>
            )}

          {/* Alerta para pedidos sin precio */}
          {mostrarConfiguracionPrecio && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex gap-3">
                <div className="w-5 h-5 rounded-full bg-orange-500 text-white flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-xs">!</span>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-orange-900 mb-1">
                    Pedido sin precio configurado
                  </h4>
                  <p className="text-xs text-orange-700">
                    Este pedido fue creado antes del sistema de pagos. Por
                    favor, establece el monto total del pedido para poder
                    registrar pagos.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Configuración de precio (solo para pedidos antiguos) */}
          {mostrarConfiguracionPrecio ? (
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Monto Total del Pedido *
              </label>
              <div className="relative">
                <Coins className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={montoTotalPedido}
                  onChange={(e) => setMontoTotalPedido(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 bg-background border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="0.00"
                  autoFocus
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Ingresa el precio total de este pedido
              </p>
              <button
                onClick={handleConfigurarPrecio}
                className="w-full mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition"
              >
                Establecer Precio y Continuar
              </button>
            </div>
          ) : (
            <>
              {/* Resumen */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Monto Total:</span>
                  <span className="font-semibold text-foreground">
                    {formatearSoles(
                      parseFloat(montoTotalPedido || montoTotal.toString()),
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Pagado:</span>
                  <span className="font-semibold text-green-600">
                    {formatearSoles(montoPagado)}
                  </span>
                </div>
                <div className="flex justify-between text-sm border-t border-border pt-2">
                  <span className="text-muted-foreground font-medium">
                    Saldo Pendiente:
                  </span>
                  <span className="font-bold text-orange-600">
                    {formatearSoles(
                      parseFloat(montoTotalPedido || montoTotal.toString()) -
                        montoPagado,
                    )}
                  </span>
                </div>
              </div>

              {/* Monto */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Monto a Pagar *
                </label>
                <div className="relative">
                  <Coins className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max={montoRestante}
                    value={monto}
                    onChange={(e) => setMonto(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 bg-background border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="0.00"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Máximo: {formatearSoles(montoRestante)}
                </p>
              </div>

              {/* Método de Pago */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Forma de Pago *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setMetodoPago("Efectivo")}
                    className={`p-4 rounded-lg border-2 transition ${
                      metodoPago === "Efectivo"
                        ? "border-primary bg-primary/5 text-foreground"
                        : "border-input bg-background text-muted-foreground hover:border-primary/50"
                    }`}
                  >
                    <Coins className="w-6 h-6 mx-auto mb-1" />
                    <span className="text-sm font-medium">Efectivo</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMetodoPago("QR/Transferencia")}
                    className={`p-4 rounded-lg border-2 transition ${
                      metodoPago === "QR/Transferencia"
                        ? "border-primary bg-primary/5 text-foreground"
                        : "border-input bg-background text-muted-foreground hover:border-primary/50"
                    }`}
                  >
                    <CreditCard className="w-6 h-6 mx-auto mb-1" />
                    <span className="text-sm font-medium">
                      QR/Transferencia
                    </span>
                  </button>
                </div>
              </div>
              {/* Referencia (solo QR/Transferencia) */}
              {metodoPago === "QR/Transferencia" && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    N° de operación / Referencia
                  </label>
                  <input
                    type="text"
                    value={referencia}
                    onChange={(e) => setReferencia(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Ej. 123456789"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Número de operación del comprobante
                  </p>
                </div>
              )}
              {/* Notas */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Notas (Opcional)
                </label>
                <textarea
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 bg-background border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  placeholder="Información adicional sobre el pago..."
                />
              </div>

              {/* Fecha y Hora */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 rounded-lg p-3">
                <Calendar className="w-4 h-4" />
                <span>
                  Fecha de registro: {formatearFechaHoraPeru(new Date())}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {!mostrarConfiguracionPrecio && (
          <div className="flex gap-3 p-4 border-t border-border">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-input rounded-lg text-foreground hover:bg-accent transition"
              disabled={guardando}
            >
              Cancelar
            </button>
            <button
              onClick={handleGuardar}
              disabled={guardando}
              className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition disabled:opacity-50"
            >
              {guardando ? "Guardando..." : "Registrar Pago"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
