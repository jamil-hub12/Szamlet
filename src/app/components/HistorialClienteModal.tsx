import { useState } from "react";
import { X, Package, Calendar, Clock, CheckCircle2, XCircle, AlertCircle, Loader2 } from "lucide-react";
import type { Pedido, EstadoPedido } from "../contexts/PedidosContext";
import { DetallePedidoModal } from "./DetallePedidoModal";

type Cliente = {
  id: string;
  codigo: string;
  nombre: string;
  email: string | null;
  celular: string;
  dni: string;
};

const estadoConfig: Record<EstadoPedido, { color: string; icon: JSX.Element }> = {
  "Recibido": {
    color: "bg-indigo-100 text-indigo-700 border-indigo-200",
    icon: <Clock className="w-3.5 h-3.5" />,
  },
  "En confección": {
    color: "bg-blue-100 text-blue-700 border-blue-200",
    icon: <Loader2 className="w-3.5 h-3.5" />,
  },
  "Listo para entrega": {
    color: "bg-emerald-100 text-emerald-700 border-emerald-200",
    icon: <Package className="w-3.5 h-3.5" />,
  },
  "Entregado": {
    color: "bg-gray-100 text-gray-500 border-gray-200",
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
  },
  "Cancelado": {
    color: "bg-red-100 text-red-700 border-red-200",
    icon: <XCircle className="w-3.5 h-3.5" />,
  },
};

export function HistorialClienteModal({
  cliente,
  pedidos,
  onClose,
  onVerPedido,
}: {
  cliente: Cliente;
  pedidos: Pedido[];
  onClose: () => void;
  onVerPedido?: (pedido: Pedido) => void;
}) {
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState<Pedido | null>(null);

  // Filtrar pedidos del cliente
  const pedidosCliente = pedidos.filter((p) => p.clienteId === cliente.id);

  // Estadísticas
  const totalPedidos = pedidosCliente.length;
  const pedidosActivos = pedidosCliente.filter((p) =>
    p.estado !== "Entregado" && p.estado !== "Cancelado"
  ).length;
  const pedidosEntregados = pedidosCliente.filter((p) => p.estado === "Entregado").length;
  const pedidosCancelados = pedidosCliente.filter((p) => p.estado === "Cancelado").length;

  // Función para exportar pedido a PDF
  const handleExportarPedidoPDF = async (pedido: Pedido) => {
    try {
      const { default: jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");

      const doc = new jsPDF();

      // Título
      doc.setFontSize(18);
      doc.setFont(undefined, "bold");
      doc.text("Detalle de Pedido", 14, 20);

      // Información del pedido
      doc.setFontSize(10);
      doc.setFont(undefined, "normal");
      doc.text(`Código: ${pedido.codigo}`, 14, 30);
      doc.text(`Estado: ${pedido.estado}`, 14, 36);
      doc.text(`Fecha: ${pedido.fecha}`, 14, 42);

      // Información del cliente
      doc.setFontSize(11);
      doc.setFont(undefined, "bold");
      doc.text("Cliente", 14, 52);
      doc.setFontSize(9);
      doc.setFont(undefined, "normal");
      doc.text(`Nombre: ${cliente.nombre}`, 14, 58);
      doc.text(`DNI: ${cliente.dni}`, 14, 64);
      doc.text(`Celular: ${cliente.celular}`, 14, 70);
      if (cliente.email) doc.text(`Email: ${cliente.email}`, 14, 76);

      // Detalles del pedido
      let yPos = cliente.email ? 86 : 80;
      doc.setFontSize(11);
      doc.setFont(undefined, "bold");
      doc.text("Detalles", 14, yPos);

      yPos += 6;
      doc.setFontSize(9);
      doc.setFont(undefined, "normal");
      doc.text(`Artículo: ${pedido.articulo}`, 14, yPos);

      if (pedido.urgente) {
        yPos += 6;
        doc.setTextColor(220, 38, 38);
        doc.text("⚠️ PEDIDO URGENTE", 14, yPos);
        doc.setTextColor(0, 0, 0);
      }

      if (pedido.notas) {
        yPos += 6;
        doc.text(`Notas: ${pedido.notas}`, 14, yPos);
      }

      // Información de pago
      if (pedido.montoTotal && pedido.montoTotal > 0) {
        yPos += 10;
        doc.setFontSize(11);
        doc.setFont(undefined, "bold");
        doc.text("Información de Pago", 14, yPos);

        yPos += 6;
        doc.setFontSize(9);
        doc.setFont(undefined, "normal");
        const formatSoles = (monto: number) =>
          `S/ ${monto.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

        doc.text(`Total: ${formatSoles(pedido.montoTotal)}`, 14, yPos);
        yPos += 6;
        doc.text(`Pagado: ${formatSoles(pedido.montoPagado || 0)}`, 14, yPos);
        yPos += 6;
        doc.text(`Pendiente: ${formatSoles((pedido.montoTotal || 0) - (pedido.montoPagado || 0))}`, 14, yPos);
      }

      // Items del pedido (si existen)
      if (pedido.items && pedido.items.length > 0) {
        yPos += 10;

        autoTable(doc, {
          head: [["Producto", "Talla", "Color", "Cantidad"]],
          body: pedido.items.map(item => [
            item.productoNombre || item.productoId,
            item.talla,
            item.color,
            item.cantidad.toString()
          ]),
          startY: yPos,
          theme: "striped",
          headStyles: {
            fillColor: [37, 99, 235],
            textColor: 255,
            fontStyle: "bold",
            fontSize: 9,
          },
          bodyStyles: {
            fontSize: 8,
            textColor: 50,
          },
        });
      }

      // Guardar PDF
      doc.save(`pedido_${pedido.codigo}_${new Date().toISOString().split("T")[0]}.pdf`);
    } catch (error) {
      console.error("Error al generar PDF:", error);
      alert("Error al generar el PDF");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 bg-card border border-border rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border shrink-0">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-foreground text-background flex items-center justify-center text-sm shrink-0">
                {cliente.nombre.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
              </div>
              <div>
                <h3 className="text-foreground">Historial de pedidos</h3>
                <p className="text-sm text-muted-foreground">{cliente.nombre} · {cliente.codigo}</p>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-accent transition">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Estadísticas */}
        <div className="px-6 py-4 border-b border-border bg-muted/30 shrink-0">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-card border border-border rounded-lg px-3 py-2.5">
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-xl text-foreground font-medium">{totalPedidos}</p>
            </div>
            <div className="bg-card border border-border rounded-lg px-3 py-2.5">
              <p className="text-xs text-muted-foreground">Activos</p>
              <p className="text-xl text-blue-600 font-medium">{pedidosActivos}</p>
            </div>
            <div className="bg-card border border-border rounded-lg px-3 py-2.5">
              <p className="text-xs text-muted-foreground">Entregados</p>
              <p className="text-xl text-emerald-600 font-medium">{pedidosEntregados}</p>
            </div>
            <div className="bg-card border border-border rounded-lg px-3 py-2.5">
              <p className="text-xs text-muted-foreground">Cancelados</p>
              <p className="text-xl text-red-600 font-medium">{pedidosCancelados}</p>
            </div>
          </div>
        </div>

        {/* Lista de pedidos */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {pedidosCliente.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Package className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-foreground font-medium">Sin pedidos registrados</p>
              <p className="text-sm text-muted-foreground mt-1">
                Este cliente aún no tiene pedidos en el sistema
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {pedidosCliente.map((pedido) => (
                <div
                  key={pedido.id}
                  className="border border-border rounded-xl p-4 hover:bg-accent/50 transition cursor-pointer"
                  onClick={() => setPedidoSeleccionado(pedido)}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-mono text-muted-foreground">{pedido.codigo}</p>
                        {pedido.urgente && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700 border border-red-200">
                            <AlertCircle className="w-3 h-3" />
                            Urgente
                          </span>
                        )}
                      </div>
                      <p className="text-foreground font-medium">{pedido.articulo}</p>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border shrink-0 ${
                        estadoConfig[pedido.estado]?.color
                      }`}
                    >
                      {estadoConfig[pedido.estado]?.icon}
                      {pedido.estado}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{pedido.fecha}</span>
                    </div>
                    {pedido.notas && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-muted-foreground/50">•</span>
                        <span className="truncate max-w-[200px]">{pedido.notas}</span>
                      </div>
                    )}
                  </div>

                  {pedido.motivoCancelacion && (
                    <div className="mt-2 px-2.5 py-1.5 rounded-lg bg-red-50 border border-red-200">
                      <p className="text-xs text-red-700">
                        <strong>Cancelado:</strong> {pedido.motivoCancelacion}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-muted/30 shrink-0">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition text-sm"
          >
            Cerrar
          </button>
        </div>
      </div>

      {/* Modal de detalle del pedido */}
      {pedidoSeleccionado && (
        <DetallePedidoModal
          pedido={pedidoSeleccionado}
          cliente={cliente}
          onClose={() => setPedidoSeleccionado(null)}
          onExportar={() => handleExportarPedidoPDF(pedidoSeleccionado)}
        />
      )}
    </div>
  );
}
