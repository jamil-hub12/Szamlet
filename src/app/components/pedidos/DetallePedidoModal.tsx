import {
  X,
  Package,
  Calendar,
  User,
  Phone,
  Mail,
  FileText,
  Download,
  Coins,
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import type { Pedido } from "../../contexts/PedidosContext";
import { formatearSoles } from "../../utils/formatoMoneda";
import {
  formatearFechaHoraPeru,
  formatearFechaCorta,
} from "../../utils/fechas";
import {
  esPedidoVencido,
  diasHastaVencimiento,
  esPedidoProximoAVencer,
} from "../../utils/validaciones";
import { tieneNotasParaMostrar } from "../../utils/notasPedido";
import { calcularSaldoPendiente } from "../../utils/estadoPagoPedido";
import { SeccionNotificacionesPedido } from "./SeccionNotificacionesPedido";

type Cliente = {
  id: string;
  codigo: string;
  nombre: string;
  email: string | null;
  celular: string;
  dni: string;
  direccion: string | null;
  ruc: string | null;
};

export function DetallePedidoModal({
  pedido,
  cliente,
  onClose,
  onExportar,
}: {
  pedido: Pedido;
  cliente: Cliente;
  onClose: () => void;
  onExportar: () => void;
}) {
  // Calcular estado de pago
  const montoTotal = pedido.montoTotal || 0;
  const montoPagado = pedido.montoPagado || 0;
  const montoPendiente = calcularSaldoPendiente(montoTotal, montoPagado);

  let estadoPago = "Pendiente";
  let estadoPagoColor = "bg-red-50 text-red-700 border-red-200";
  let estadoPagoIcon = <XCircle className="w-4 h-4" />;

  if (montoPendiente <= 0 && montoTotal > 0) {
    estadoPago = "Pagado";
    estadoPagoColor = "bg-green-50 text-green-700 border-green-200";
    estadoPagoIcon = <CheckCircle className="w-4 h-4" />;
  } else if (montoPagado > 0 && montoPendiente > 0) {
    estadoPago = "Parcial";
    estadoPagoColor = "bg-yellow-50 text-yellow-700 border-yellow-200";
    estadoPagoIcon = <Clock className="w-4 h-4" />;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative z-10 bg-card border border-border rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border shrink-0">
          <div>
            <h3 className="text-foreground text-lg">Detalle del Pedido</h3>
            <p className="text-sm text-muted-foreground font-mono">
              {pedido.codigo}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onExportar}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition text-sm"
            >
              <Download className="w-4 h-4" />
              Exportar PDF
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-accent transition"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Alerta de vencimiento */}
          {esPedidoVencido(pedido.fechaEntrega, pedido.estado) && (
            <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
              <div className="flex gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-red-900 mb-1">
                    ⚠️ Pedido Vencido
                  </h4>
                  <p className="text-xs text-red-700">
                    Este pedido pasó su fecha de entrega ({pedido.fechaEntrega})
                    y no puede recibir pagos. Si necesitas registrar un pago,
                    contacta con administración.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Alerta de próximo vencimiento */}
          {pedido.fechaEntrega &&
            esPedidoProximoAVencer(pedido.fechaEntrega, pedido.estado) && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex gap-3">
                  <Clock className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-semibold text-yellow-900 mb-1">
                      Pedido próximo a vencer
                    </h4>
                    <p className="text-xs text-yellow-700">
                      Vencimiento en{" "}
                      {diasHastaVencimiento(pedido.fechaEntrega, pedido.estado)}
                      {diasHastaVencimiento(
                        pedido.fechaEntrega,
                        pedido.estado,
                      ) === 1
                        ? " día"
                        : " días"}
                      . Asegúrate de completar el pago antes de esa fecha.
                    </p>
                  </div>
                </div>
              </div>
            )}

          {/* Grid de información */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Información del cliente */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
                <User className="w-4 h-4" />
                Información del Cliente
              </h4>
              <div className="bg-muted/30 border border-border rounded-xl p-4 space-y-2.5">
                <div>
                  <p className="text-xs text-muted-foreground">Nombre</p>
                  <p className="text-sm text-foreground font-medium">
                    {cliente.nombre}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Código</p>
                  <p className="text-sm text-foreground font-mono">
                    {cliente.codigo}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">DNI</p>
                    <p className="text-sm text-foreground">{cliente.dni}</p>
                  </div>
                  {cliente.ruc && (
                    <div>
                      <p className="text-xs text-muted-foreground">RUC</p>
                      <p className="text-sm text-foreground">{cliente.ruc}</p>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="w-3.5 h-3.5" />
                  <span>{cliente.celular}</span>
                </div>
                {cliente.email && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="w-3.5 h-3.5" />
                    <span>{cliente.email}</span>
                  </div>
                )}
                {cliente.direccion && (
                  <div>
                    <p className="text-xs text-muted-foreground">Dirección</p>
                    <p className="text-sm text-foreground">
                      {cliente.direccion}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Información del pedido */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
                <Package className="w-4 h-4" />
                Información del Pedido
              </h4>
              <div className="bg-muted/30 border border-border rounded-xl p-4 space-y-2.5">
                <div>
                  <p className="text-xs text-muted-foreground">Artículo</p>
                  <p className="text-sm text-foreground font-medium">
                    {pedido.articulo}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Fecha</p>
                    <div className="flex items-center gap-1.5 text-sm text-foreground">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{formatearFechaCorta(pedido.fecha)}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Estado</p>
                    <p className="text-sm text-foreground font-medium">
                      {pedido.estado}
                    </p>
                  </div>
                </div>
                {pedido.urgente && (
                  <div className="px-3 py-2 rounded-lg bg-red-50 border border-red-200">
                    <p className="text-xs text-red-700 font-medium">
                      ⚠️ PEDIDO URGENTE
                    </p>
                  </div>
                )}
                {pedido.fechaEntrega && (
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Fecha de Entrega
                    </p>
                    <p className="text-sm text-foreground">
                      {formatearFechaCorta(pedido.fechaEntrega)}
                    </p>
                  </div>
                )}
                {tieneNotasParaMostrar(pedido.notas) && (
                  <div>
                    <p className="text-xs text-muted-foreground">Notas</p>
                    <p className="text-sm text-foreground">{pedido.notas}</p>
                  </div>
                )}
                {pedido.motivoCancelacion && (
                  <div className="px-3 py-2 rounded-lg bg-red-50 border border-red-200">
                    <p className="text-xs text-muted-foreground mb-1">
                      Motivo de Cancelación
                    </p>
                    <p className="text-sm text-red-700">
                      {pedido.motivoCancelacion}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Información de pago */}
          {montoTotal > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
                <Coins className="w-4 h-4" />
                Información de Pago
              </h4>
              <div className="bg-muted/30 border border-border rounded-xl p-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Monto Total</p>
                    <p className="text-lg text-foreground font-semibold">
                      {formatearSoles(montoTotal)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Monto Pagado
                    </p>
                    <p className="text-lg text-emerald-600 font-semibold">
                      {formatearSoles(montoPagado)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Monto Pendiente
                    </p>
                    <p className="text-lg text-red-600 font-semibold">
                      {formatearSoles(montoPendiente)}
                    </p>
                  </div>
                </div>
                <div className="pt-3 border-t border-border">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      Estado de Pago
                    </p>
                    {pedido.estado === "Cancelado" ? (
                      <span className="text-xs text-muted-foreground">-</span>
                    ) : (
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border ${estadoPagoColor}`}
                      >
                        {estadoPagoIcon}
                        {estadoPago}
                      </span>
                    )}
                  </div>
                  {pedido.metodoPago && (
                    <div className="mt-2">
                      <p className="text-xs text-muted-foreground">
                        Método de Pago
                      </p>
                      <p className="text-sm text-foreground">
                        {pedido.metodoPago}
                      </p>
                    </div>
                  )}
                  {pedido.referenciaPago && (
                    <div className="mt-2">
                      <p className="text-xs text-muted-foreground">
                        Referencia
                      </p>
                      <p className="text-sm text-foreground font-mono">
                        {pedido.referenciaPago}
                      </p>
                    </div>
                  )}
                  {pedido.fechaPago && (
                    <div className="mt-2">
                      <p className="text-xs text-muted-foreground">
                        Fecha de Pago
                      </p>
                      <p className="text-sm text-foreground">
                        {formatearFechaCorta(pedido.fechaPago)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <SeccionNotificacionesPedido pedidoCodigo={pedido.codigo} />

          {/* Items del pedido (si existen) */}
          {pedido.items && pedido.items.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Detalles del Pedido
              </h4>
              <div className="bg-muted/30 border border-border rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium">
                        Producto
                      </th>
                      <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium">
                        Talla
                      </th>
                      <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium">
                        Color
                      </th>
                      <th className="text-right px-4 py-3 text-xs text-muted-foreground font-medium">
                        Cantidad
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {pedido.items.map((item, index) => (
                      <tr
                        key={index}
                        className="border-b border-border last:border-0"
                      >
                        <td className="px-4 py-3 text-foreground">
                          {item.productoNombre || item.productoId}
                        </td>
                        <td className="px-4 py-3 text-foreground">
                          {item.talla}
                        </td>
                        <td className="px-4 py-3 text-foreground">
                          {item.color}
                        </td>
                        <td className="px-4 py-3 text-foreground text-right font-mono">
                          {item.cantidad}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-muted/30 shrink-0">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-lg bg-accent text-foreground hover:bg-accent/80 transition text-sm"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
