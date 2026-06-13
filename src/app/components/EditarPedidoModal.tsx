import { useState, useEffect } from "react";
import {
  X,
  AlertCircle,
  Package,
  Calendar,
  Loader2,
  CheckCircle2,
  XCircle,
  Plus,
  Trash2,
  ShoppingBag,
  FileText,
} from "lucide-react";
import type { Pedido } from "../contexts/PedidosContext";
import { usePedidos } from "../contexts/PedidosContext";
import { puedeEditarPedido } from "../utils/pedidosCicloVida";
import { obtenerItemsPedido } from "../utils/stockManager";
import { useProductos } from "../contexts/ProductosContext";
import { obtenerFechaPeruHoy } from "../../utils/fechas";
import { esValidaFechaMinimaHoy } from "../utils/validaciones";

type PedidoItem = {
  id?: string;
  productoCodigo: string;
  modelo: string;
  tela: string;
  disenio: string;
  talla: string;
  color: string;
  cantidad: number;
  precioUnitario?: number;
  descuentoPorcentaje?: number; // 0, 5 o 10
  esEspecial?: boolean;
};

type EditarPedidoForm = {
  articulo: string;
  urgente: boolean;
  notas: string;
  fechaEntrega?: string;
  items: PedidoItem[];
};

export function EditarPedidoModal({
  pedido,
  onClose,
  esAdmin = false,
}: {
  pedido: Pedido;
  onClose: () => void;
  esAdmin?: boolean;
}) {
  const validacionEdicion = puedeEditarPedido(pedido.estado);
  const { productos } = useProductos();
  const { actualizarPedidoConItems, actualizarPedido } = usePedidos();
  const [form, setForm] = useState<EditarPedidoForm>({
    articulo: pedido.articulo,
    urgente: pedido.urgente,
    notas: pedido.notas || "",
    fechaEntrega: pedido.fechaEntrega || "",
    items: [],
  });
  const [montoTotalAdmin, setMontoTotalAdmin] = useState<string>(
    pedido.montoTotal ? pedido.montoTotal.toFixed(2) : "",
  );
  const [loadingItems, setLoadingItems] = useState(true);
  const [showErrors, setShowErrors] = useState(false);
  const [errorFecha, setErrorFecha] = useState<string | null>(null);
  const [step, setStep] = useState<"form" | "guardando" | "exito" | "error">(
    "form",
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [mostrarAgregarItem, setMostrarAgregarItem] = useState(false);
  const [mostrarAgregarItemLibre, setMostrarAgregarItemLibre] = useState(false);
  const esEspecial = pedido.tieneEspeciales === true;

  useEffect(() => {
    let isMounted = true;

    async function cargarItems() {
      try {
        setLoadingItems(true);
        setForm((prev) => ({ ...prev, items: [] }));
        const items = await obtenerItemsPedido(pedido.codigo);

        if (!isMounted) return;

        setForm((prev) => ({
          ...prev,
          items: items.map((item) => ({
            id: item.id,
            productoCodigo: item.producto_codigo,
            modelo: item.modelo,
            tela: item.tela,
            disenio: item.disenio,
            talla: item.talla,
            color: item.color,
            cantidad: item.cantidad,
            precioUnitario: item.precio_unitario || undefined,
          })),
        }));
      } catch (error) {
        console.error("Error al cargar items:", error);
        if (isMounted) {
          setForm((prev) => ({ ...prev, items: [] }));
        }
      } finally {
        if (isMounted) {
          setLoadingItems(false);
        }
      }
    }

    if (validacionEdicion.puede) {
      cargarItems();
    }

    return () => {
      isMounted = false;
    };
  }, [pedido.codigo, validacionEdicion.puede]);

  const validate = () => {
    if (form.items.length === 0) return false;
    if (form.items.some((item) => item.cantidad <= 0)) return false;
    if (form.fechaEntrega && !esValidaFechaMinimaHoy(form.fechaEntrega)) {
      setErrorFecha(
        `La fecha de entrega no puede ser anterior a hoy (${obtenerFechaPeruHoy()})`,
      );
      return false;
    }
    return true;
  };

  const handleAgregarItem = (item: PedidoItem) => {
    setForm((prev) => ({ ...prev, items: [...prev.items, item] }));
    setMostrarAgregarItem(false);
  };

  const handleAgregarItemLibre = (item: PedidoItem) => {
    setForm((prev) => ({ ...prev, items: [...prev.items, item] }));
    setMostrarAgregarItemLibre(false);
  };

  const handleEliminarItem = (index: number) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const handleActualizarCantidad = (index: number, cantidad: number) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item, i) =>
        i === index ? { ...item, cantidad } : item,
      ),
    }));
  };

  const handleGuardar = async () => {
    setShowErrors(true);
    if (!validate()) return;

    setStep("guardando");
    setErrorMessage(null);

    try {
      const itemsInsert = form.items.map((item) => {
        const descuento = item.descuentoPorcentaje ?? 0;
        const precioBase = item.precioUnitario ?? 0;
        const precioFinal =
          precioBase > 0 ? precioBase * (1 - descuento / 100) : 0;
        return {
          pedido_codigo: pedido.codigo,
          producto_codigo: item.productoCodigo,
          modelo: item.modelo,
          tela: item.tela,
          disenio: item.disenio,
          talla: item.talla,
          color: item.color,
          cantidad: item.cantidad,
          precio_unitario: precioFinal > 0 ? precioFinal : null,
          subtotal: precioFinal > 0 ? precioFinal * item.cantidad : null,
          es_especial: item.esEspecial ?? false,
        };
      });

      const articuloDerivado =
        form.items.length > 0
          ? [...new Set(form.items.map((item) => item.modelo))].join(", ")
          : form.articulo;

      // Si es admin y puso un monto total, lo incluimos en los datos básicos
      const montoNumerico = parseFloat(montoTotalAdmin);
      const datosBasicos: Parameters<typeof actualizarPedidoConItems>[1] = {
        articulo: articuloDerivado.trim(),
        urgente: form.urgente,
        notas: form.notas.trim() || undefined,
        fechaEntrega: form.fechaEntrega || undefined,
        ...(esAdmin && !isNaN(montoNumerico) && montoNumerico >= 0
          ? { montoTotal: montoNumerico }
          : {}),
      };

      const exito = await actualizarPedidoConItems(
        pedido.codigo,
        datosBasicos,
        itemsInsert,
      );

      if (!exito) {
        setErrorMessage("Error al guardar los cambios del pedido");
        setStep("error");
        return;
      }

      setStep("exito");
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      console.error("Error al guardar pedido:", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Error desconocido al guardar el pedido",
      );
      setStep("error");
    }
  };

  if (!validacionEdicion.puede) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          onClick={onClose}
        />
        <div className="relative z-10 bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[85vh]">
          <div className="flex items-center justify-between px-6 py-5 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-foreground">No se puede editar</h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Estado final
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-accent transition"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          <div className="px-6 py-8 space-y-4">
            <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-red-50 border border-red-200">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-red-700 font-medium">
                  {validacionEdicion.mensaje}
                </p>
                <p className="text-xs text-red-600 mt-1">
                  Los pedidos en estado "{pedido.estado}" no pueden ser
                  modificados porque son estados finales del sistema.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-muted-foreground font-mono">
                {pedido.codigo}
              </p>
              <p className="text-sm text-foreground">
                {pedido.cliente} · {pedido.articulo}
              </p>
            </div>
          </div>

          <div className="px-6 py-4 border-t border-border">
            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition"
            >
              Entendido
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={step === "form" ? onClose : undefined}
      />

      <div className="relative z-10 bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[85vh]">
        {step === "form" && (
          <>
            <div className="flex items-start justify-between px-6 py-5 border-b border-border shrink-0">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded border border-border">
                    {pedido.codigo}
                  </span>
                  <span className="text-muted-foreground text-xs">·</span>
                  <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded">
                    {pedido.estado}
                  </span>
                </div>
                <h3 className="text-foreground">Editar pedido</h3>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-accent transition"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {/* Cliente */}
              <div className="flex items-center gap-3 bg-muted/50 rounded-xl px-3 py-3">
                <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-medium shrink-0">
                  {pedido.cliente
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground font-medium">
                    {pedido.cliente}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {pedido.telefono} · {pedido.email}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded shrink-0">
                  no editable
                </span>
              </div>

              {/* Artículo */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">
                  Artículo
                </label>
                <input
                  type="text"
                  value={
                    form.items.length > 0
                      ? [
                          ...new Set(form.items.map((item) => item.modelo)),
                        ].join(", ")
                      : form.articulo
                  }
                  readOnly
                  className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border text-foreground text-sm cursor-not-allowed"
                />
                <p className="text-xs text-muted-foreground">
                  Se genera automáticamente a partir de los productos del
                  pedido.
                </p>
              </div>

              {/* Productos */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                    <ShoppingBag className="w-4 h-4" />
                    Productos del pedido <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setMostrarAgregarItem(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-foreground text-xs hover:bg-accent transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Del catálogo
                    </button>
                    {esEspecial && (
                      <button
                        type="button"
                        onClick={() => setMostrarAgregarItemLibre(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-primary/60 text-primary text-xs hover:bg-primary/5 transition"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Ítem libre
                      </button>
                    )}
                  </div>
                </div>

                <div className="border border-border rounded-xl overflow-hidden">
                  <div className="grid grid-cols-[1fr_auto_auto] gap-2 px-3 py-2 bg-muted/40 border-b border-border">
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">
                      Producto
                    </span>
                    <span className="text-xs text-muted-foreground uppercase tracking-wider text-center w-20">
                      Cantidad
                    </span>
                    <span className="w-7" />
                  </div>

                  {loadingItems ? (
                    <div className="px-4 py-8 text-center">
                      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground mx-auto mb-2" />
                      <p className="text-xs text-muted-foreground">
                        Cargando productos...
                      </p>
                    </div>
                  ) : form.items.length === 0 ? (
                    <div className="px-4 py-8 text-center">
                      <ShoppingBag className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-40" />
                      <p className="text-sm text-muted-foreground">
                        Sin productos
                      </p>
                      {showErrors && (
                        <p className="text-xs text-red-500 flex items-center justify-center gap-1 mt-2">
                          <AlertCircle className="w-3 h-3" /> Agrega al menos un
                          producto
                        </p>
                      )}
                    </div>
                  ) : (
                    <>
                      <div className="max-h-52 overflow-y-auto">
                        {form.items.map((item, index) => (
                          <div
                            key={index}
                            className="grid grid-cols-[1fr_auto_auto] gap-2 px-3 py-2.5 border-b border-border last:border-0 items-center hover:bg-accent/20 transition"
                          >
                            <div>
                              <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                                {item.modelo}
                                {(item as any).esEspecial && (
                                  <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-normal">
                                    Especial
                                  </span>
                                )}
                              </p>
                              <div className="flex gap-1 mt-1 flex-wrap">
                                <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                                  {item.tela}
                                </span>
                                <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                                  Talla {item.talla}
                                </span>
                                <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                                  {item.color}
                                </span>
                              </div>
                            </div>
                            <input
                              type="number"
                              min={1}
                              value={item.cantidad}
                              onChange={(e) => {
                                const val = parseInt(e.target.value);
                                if (!isNaN(val) && val >= 1)
                                  handleActualizarCantidad(index, val);
                              }}
                              className="w-16 text-center px-2 py-1 rounded-lg bg-muted border border-border text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20"
                            />
                            <button
                              type="button"
                              onClick={() => handleEliminarItem(index)}
                              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-500 transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                      <div className="px-3 py-2 bg-muted/40 border-t border-border flex justify-end">
                        <span className="text-xs text-muted-foreground">
                          {form.items.length}{" "}
                          {form.items.length === 1 ? "producto" : "productos"} ·{" "}
                          {form.items.reduce((s, i) => s + i.cantidad, 0)}{" "}
                          unidades
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Fecha y Prioridad */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" />
                    Fecha de entrega
                  </label>
                  <input
                    type="date"
                    value={form.fechaEntrega || ""}
                    min={obtenerFechaPeruHoy()}
                    onChange={(e) => {
                      setForm({ ...form, fechaEntrega: e.target.value });
                      if (
                        e.target.value &&
                        esValidaFechaMinimaHoy(e.target.value)
                      )
                        setErrorFecha(null);
                    }}
                    className={`w-full px-3 py-2 rounded-lg bg-input-background border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20 ${errorFecha ? "border-red-400" : "border-border"}`}
                  />
                  {errorFecha && (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {errorFecha}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">
                    Prioridad
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, urgente: false })}
                      className={`py-2 rounded-lg text-sm border transition ${!form.urgente ? "bg-blue-50 text-blue-700 border-blue-300 font-medium" : "bg-input-background text-muted-foreground border-border hover:border-foreground/30"}`}
                    >
                      Normal
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, urgente: true })}
                      className={`py-2 rounded-lg text-sm border transition ${form.urgente ? "bg-red-50 text-red-700 border-red-300 font-medium" : "bg-input-background text-muted-foreground border-border hover:border-foreground/30"}`}
                    >
                      Urgente
                    </button>
                  </div>
                </div>
              </div>

              {/* Precio total — solo admin */}
              {esAdmin && (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                    <span className="w-4 h-4 flex items-center justify-center text-xs font-bold text-emerald-700">
                      S/
                    </span>
                    Precio total del pedido
                    <span className="text-xs text-muted-foreground font-normal">
                      (solo administrador)
                    </span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
                      S/
                    </span>
                    <input
                      type="number"
                      min={0}
                      step="0.50"
                      value={montoTotalAdmin}
                      onChange={(e) => setMontoTotalAdmin(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-9 pr-3 py-2 rounded-lg bg-input-background border border-emerald-300 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200"
                    />
                  </div>
                  {pedido.montoTotal && pedido.montoTotal > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Precio actual: S/ {pedido.montoTotal.toFixed(2)}
                    </p>
                  )}
                </div>
              )}

              {/* Notas */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                  <FileText className="w-4 h-4" />
                  Notas internas
                </label>
                <textarea
                  value={form.notas}
                  onChange={(e) => setForm({ ...form, notas: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20 resize-none"
                  placeholder="Observaciones adicionales..."
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-border flex gap-3 shrink-0">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 rounded-lg border border-border text-foreground text-sm hover:bg-accent transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleGuardar}
                className="flex-2 px-6 py-2.5 rounded-lg bg-foreground text-background text-sm hover:bg-foreground/90 transition flex items-center gap-2"
              >
                <Package className="w-4 h-4" />
                Guardar cambios
              </button>
            </div>
          </>
        )}

        {step === "guardando" && (
          <div className="px-6 py-20 flex flex-col items-center justify-center gap-4">
            <Loader2 className="w-10 h-10 text-muted-foreground animate-spin" />
            <p className="text-sm text-muted-foreground">
              Guardando cambios...
            </p>
          </div>
        )}

        {step === "exito" && (
          <div className="px-6 py-20 flex flex-col items-center justify-center gap-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>
            <div className="text-center">
              <h3 className="text-foreground">Cambios guardados</h3>
              <p className="text-sm text-muted-foreground mt-1">
                El pedido ha sido actualizado correctamente
              </p>
            </div>
          </div>
        )}

        {step === "error" && (
          <div className="flex flex-col h-full">
            <div className="flex-1 px-6 py-8 flex flex-col items-center justify-center gap-4">
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                <XCircle className="w-8 h-8 text-red-600" />
              </div>
              <div className="text-center">
                <h3 className="text-foreground">Error al guardar</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {errorMessage || "Ocurrió un error inesperado"}
                </p>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-border">
              <button
                onClick={() => {
                  setStep("form");
                  setErrorMessage(null);
                }}
                className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition"
              >
                Reintentar
              </button>
            </div>
          </div>
        )}
      </div>

      {mostrarAgregarItem && (
        <AgregarItemModal
          onClose={() => setMostrarAgregarItem(false)}
          onAgregar={handleAgregarItem}
          productos={productos}
        />
      )}

      {mostrarAgregarItemLibre && (
        <AgregarItemLibreModal
          onClose={() => setMostrarAgregarItemLibre(false)}
          onAgregar={handleAgregarItemLibre}
        />
      )}
    </div>
  );
}

// Regex para bloquear caracteres especiales (solo letras, números, espacios, guión y punto)
const SOLO_ALFANUMERICO = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ0-9\s\-\.]*$/;

function validarSinEspeciales(valor: string): boolean {
  return SOLO_ALFANUMERICO.test(valor);
}

function AgregarItemLibreModal({
  onClose,
  onAgregar,
}: {
  onClose: () => void;
  onAgregar: (item: PedidoItem) => void;
}) {
  const [form, setForm] = useState({
    modelo: "",
    tela: "",
    disenio: "",
    talla: "",
    color: "",
    cantidad: 1,
  });
  const [descuento, setDescuento] = useState(0);
  const [showErrors, setShowErrors] = useState(false);
  const [erroresEspeciales, setErroresEspeciales] = useState<
    Record<string, string>
  >({});

  const handleChange = (campo: string, valor: string) => {
    if (!validarSinEspeciales(valor)) {
      setErroresEspeciales((prev) => ({
        ...prev,
        [campo]: "No se permiten caracteres especiales",
      }));
      return;
    }
    setErroresEspeciales((prev) => {
      const next = { ...prev };
      delete next[campo];
      return next;
    });
    setForm((prev) => ({ ...prev, [campo]: valor }));
  };

  const handleAgregar = () => {
    if (
      !form.modelo.trim() ||
      !form.tela.trim() ||
      !form.talla.trim() ||
      !form.color.trim() ||
      form.cantidad < 1 ||
      Object.keys(erroresEspeciales).length > 0
    ) {
      setShowErrors(true);
      return;
    }

    onAgregar({
      productoCodigo: "LIBRE",
      modelo: form.modelo.trim(),
      tela: form.tela.trim(),
      disenio: form.disenio.trim() || "-",
      talla: form.talla.trim(),
      color: form.color.trim(),
      cantidad: form.cantidad,
      precioUnitario: undefined,
      descuentoPorcentaje: descuento,
      esEspecial: true,
    } as PedidoItem);
  };

  const campos: Array<{
    key: keyof typeof form;
    label: string;
    placeholder: string;
    requerido: boolean;
  }> = [
    {
      key: "modelo",
      label: "Modelo / Prenda",
      placeholder: "Ej: Casaca bordada",
      requerido: true,
    },
    {
      key: "tela",
      label: "Tela / Material",
      placeholder: "Ej: Algodón",
      requerido: true,
    },
    {
      key: "disenio",
      label: "Diseño / Detalle",
      placeholder: "Ej: Bordado personalizado",
      requerido: false,
    },
    {
      key: "talla",
      label: "Talla",
      placeholder: "Ej: M, L, XL, 38...",
      requerido: true,
    },
    {
      key: "color",
      label: "Color",
      placeholder: "Ej: Azul marino",
      requerido: true,
    },
  ];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h3 className="text-foreground">Ítem especial libre</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Prenda fuera del catálogo
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-accent transition"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {campos.map(({ key, label, placeholder, requerido }) => (
            <div key={key} className="space-y-1.5">
              <label className="text-sm text-foreground">
                {label} {requerido && <span className="text-red-500">*</span>}
              </label>
              <input
                type="text"
                value={form[key] as string}
                onChange={(e) => handleChange(key, e.target.value)}
                placeholder={placeholder}
                className={`w-full px-3 py-2.5 rounded-lg bg-input-background border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20 ${
                  (showErrors && requerido && !form[key].toString().trim()) ||
                  erroresEspeciales[key]
                    ? "border-red-400"
                    : "border-border"
                }`}
              />
              {erroresEspeciales[key] && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {erroresEspeciales[key]}
                </p>
              )}
              {showErrors &&
                requerido &&
                !form[key].toString().trim() &&
                !erroresEspeciales[key] && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Campo requerido
                  </p>
                )}
            </div>
          ))}

          {/* Cantidad */}
          <div className="space-y-1.5">
            <label className="text-sm text-foreground">
              Cantidad <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setForm((p) => ({
                    ...p,
                    cantidad: Math.max(1, p.cantidad - 1),
                  }))
                }
                className="w-10 h-10 flex items-center justify-center rounded-lg border border-border bg-input-background text-foreground hover:bg-accent transition"
              >
                -
              </button>
              <input
                type="number"
                min="1"
                value={form.cantidad}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    cantidad: Math.max(1, parseInt(e.target.value) || 1),
                  }))
                }
                className="flex-1 px-3 py-2.5 rounded-lg bg-input-background border border-border text-foreground text-sm text-center focus:outline-none focus:ring-2 focus:ring-foreground/20"
              />
              <button
                type="button"
                onClick={() =>
                  setForm((p) => ({ ...p, cantidad: p.cantidad + 1 }))
                }
                className="w-10 h-10 flex items-center justify-center rounded-lg border border-border bg-input-background text-foreground hover:bg-accent transition"
              >
                +
              </button>
            </div>
          </div>

          {/* Descuento */}
          <div className="space-y-2 px-4 py-3 rounded-lg border border-blue-200 bg-blue-50">
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">
                %
              </span>
              Descuento en precio
            </label>
            <div className="flex gap-2">
              {[0, 5, 10].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDescuento(d)}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm border transition ${
                    descuento === d
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-foreground border-border hover:border-blue-400"
                  }`}
                >
                  {d === 0 ? "Sin descuento" : `${d}% off`}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-border flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg border border-border text-foreground text-sm hover:bg-accent transition"
          >
            Cancelar
          </button>
          <button
            onClick={handleAgregar}
            className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition"
          >
            Agregar
          </button>
        </div>
      </div>
    </div>
  );
}

function AgregarItemModal({
  onClose,
  onAgregar,
  productos = [],
}: {
  onClose: () => void;
  onAgregar: (item: PedidoItem) => void;
  productos?: any[];
}) {
  const [productoSeleccionado, setProductoSeleccionado] = useState<string>("");
  const [tallaSeleccionada, setTallaSeleccionada] = useState<string>("");
  const [colorSeleccionado, setColorSeleccionado] = useState<string>("");
  const [cantidad, setCantidad] = useState(1);
  const [descuento, setDescuento] = useState(0);
  const [showErrors, setShowErrors] = useState(false);

  const producto = productos?.find((p) => p.codigo === productoSeleccionado);
  const talla = producto?.tallas?.find((t: any) => t.id === tallaSeleccionada);
  const color = talla?.colores?.find((c: any) => c.id === colorSeleccionado);

  const handleAgregar = () => {
    if (
      !productoSeleccionado ||
      !tallaSeleccionada ||
      !colorSeleccionado ||
      cantidad <= 0
    ) {
      setShowErrors(true);
      return;
    }

    if (!producto || !talla || !color) {
      console.error("Error: producto, talla o color no encontrado");
      return;
    }

    onAgregar({
      productoCodigo: producto.codigo,
      modelo: producto.modelo,
      tela: producto.tela,
      disenio: producto.disenio,
      talla: talla.talla,
      color: color.color,
      cantidad,
      precioUnitario: color.precio ?? undefined,
      descuentoPorcentaje: descuento,
      esEspecial: false,
    });
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h3 className="text-foreground">Agregar producto</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-accent transition"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Producto */}
          <div className="space-y-1.5">
            <label className="text-sm text-foreground">
              Producto <span className="text-red-500">*</span>
            </label>
            <select
              value={productoSeleccionado}
              onChange={(e) => {
                setProductoSeleccionado(e.target.value);
                setTallaSeleccionada("");
                setColorSeleccionado("");
              }}
              className={`w-full px-3 py-2.5 rounded-lg bg-input-background border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20 ${
                showErrors && !productoSeleccionado
                  ? "border-red-400"
                  : "border-border"
              }`}
            >
              <option value="">Seleccionar producto...</option>
              {productos && productos.length > 0 ? (
                productos.map((p) => (
                  <option key={p.codigo} value={p.codigo}>
                    {p.modelo} - {p.tela} - {p.disenio}
                  </option>
                ))
              ) : (
                <option disabled>No hay productos disponibles</option>
              )}
            </select>
            {showErrors && !productoSeleccionado && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> Selecciona un producto
              </p>
            )}
          </div>

          {/* Talla */}
          {producto && (
            <div className="space-y-1.5">
              <label className="text-sm text-foreground">
                Talla <span className="text-red-500">*</span>
              </label>
              <select
                value={tallaSeleccionada}
                onChange={(e) => {
                  setTallaSeleccionada(e.target.value);
                  setColorSeleccionado("");
                }}
                className={`w-full px-3 py-2.5 rounded-lg bg-input-background border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20 ${
                  showErrors && !tallaSeleccionada
                    ? "border-red-400"
                    : "border-border"
                }`}
              >
                <option value="">Seleccionar talla...</option>
                {producto?.tallas && producto.tallas.length > 0 ? (
                  producto.tallas.map((t: any) => (
                    <option key={t.id} value={t.id}>
                      Talla {t.talla}
                    </option>
                  ))
                ) : (
                  <option disabled>No hay tallas disponibles</option>
                )}
              </select>
              {showErrors && !tallaSeleccionada && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Selecciona una talla
                </p>
              )}
            </div>
          )}

          {/* Color */}
          {talla && (
            <div className="space-y-1.5">
              <label className="text-sm text-foreground">
                Color <span className="text-red-500">*</span>
              </label>
              <select
                value={colorSeleccionado}
                onChange={(e) => setColorSeleccionado(e.target.value)}
                className={`w-full px-3 py-2.5 rounded-lg bg-input-background border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20 ${
                  showErrors && !colorSeleccionado
                    ? "border-red-400"
                    : "border-border"
                }`}
              >
                <option value="">Seleccionar color...</option>
                {talla?.colores && talla.colores.length > 0 ? (
                  talla.colores.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.color} (Stock: {c.stock})
                    </option>
                  ))
                ) : (
                  <option disabled>No hay colores disponibles</option>
                )}
              </select>
              {showErrors && !colorSeleccionado && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Selecciona un color
                </p>
              )}
            </div>
          )}

          {/* Cantidad */}
          {colorSeleccionado && (
            <div className="space-y-1.5">
              <label className="text-sm text-foreground">
                Cantidad <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCantidad(Math.max(1, cantidad - 1))}
                  className="w-10 h-10 flex items-center justify-center rounded-lg border border-border bg-input-background text-foreground hover:bg-accent transition"
                >
                  -
                </button>
                <input
                  type="number"
                  min="1"
                  value={cantidad}
                  onChange={(e) =>
                    setCantidad(Math.max(1, parseInt(e.target.value) || 1))
                  }
                  className="flex-1 px-3 py-2.5 rounded-lg bg-input-background border border-border text-foreground text-sm text-center focus:outline-none focus:ring-2 focus:ring-foreground/20"
                />
                <button
                  type="button"
                  onClick={() => setCantidad(cantidad + 1)}
                  className="w-10 h-10 flex items-center justify-center rounded-lg border border-border bg-input-background text-foreground hover:bg-accent transition"
                >
                  +
                </button>
              </div>
              {color && cantidad > color.stock && (
                <p className="text-xs text-amber-600 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Stock disponible:{" "}
                  {color.stock}
                </p>
              )}
            </div>
          )}

          {/* Descuento */}
          {colorSeleccionado && (
            <div className="space-y-2 px-4 py-3 rounded-lg border border-blue-200 bg-blue-50">
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">
                  %
                </span>
                Descuento en precio
              </label>
              <div className="flex gap-2">
                {[0, 5, 10].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDescuento(d)}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm border transition ${
                      descuento === d
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-foreground border-border hover:border-blue-400"
                    }`}
                  >
                    {d === 0 ? "Sin descuento" : `${d}% off`}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-border flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg border border-border text-foreground text-sm hover:bg-accent transition"
          >
            Cancelar
          </button>
          <button
            onClick={handleAgregar}
            className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition"
          >
            Agregar
          </button>
        </div>
      </div>
    </div>
  );
}
