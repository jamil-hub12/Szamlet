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
  Clock,
} from "lucide-react";
import type { Pedido } from "../contexts/PedidosContext";
import { puedeEditarPedido } from "../utils/pedidosCicloVida";
import { obtenerItemsPedido, type PedidoItemData } from "../utils/stockManager";
import { useProductos } from "../contexts/ProductosContext";
import { supabase } from "../../lib/supabase";
import { registrarAuditoria, obtenerUsuarioActual } from "../utils/auditoria";
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
  onGuardar,
}: {
  pedido: Pedido;
  onClose: () => void;
  onGuardar: (datos: Partial<Pedido>) => Promise<boolean>;
}) {
  const validacionEdicion = puedeEditarPedido(pedido.estado);
  const { productos } = useProductos();
  const [form, setForm] = useState<EditarPedidoForm>({
    articulo: pedido.articulo,
    urgente: pedido.urgente,
    notas: pedido.notas || "",
    fechaEntrega: pedido.fechaEntrega || "",
    items: [],
  });
  const [loadingItems, setLoadingItems] = useState(true);
  const [showErrors, setShowErrors] = useState(false);
  const [errorFecha, setErrorFecha] = useState<string | null>(null);
  const [step, setStep] = useState<"form" | "guardando" | "exito">("form");
  const [mostrarAgregarItem, setMostrarAgregarItem] = useState(false);

  // Cargar items del pedido
  useEffect(() => {
    async function cargarItems() {
      setLoadingItems(true);
      const items = await obtenerItemsPedido(pedido.codigo);
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
      setLoadingItems(false);
    }
    if (validacionEdicion.puede) {
      cargarItems();
    }
  }, [pedido.codigo, validacionEdicion.puede]);

  const validate = () => {
    if (!form.articulo.trim()) return false;
    if (form.items.length === 0) return false;
    // Validar que todos los items tengan cantidad > 0
    if (form.items.some((item) => item.cantidad <= 0)) return false;
    // Validar que si tiene fecha de entrega, no sea pasada
    if (form.fechaEntrega && !esValidaFechaMinimaHoy(form.fechaEntrega)) {
      setErrorFecha(
        `La fecha de entrega no puede ser anterior a hoy (${obtenerFechaPeruHoy()})`,
      );
      return false;
    }
    return true;
  };

  const handleAgregarItem = (item: PedidoItem) => {
    setForm((prev) => ({
      ...prev,
      items: [...prev.items, item],
    }));
    setMostrarAgregarItem(false);
  };

  const handleEliminarItem = (index: number) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const handleActualizarCantidad = (index: number, cantidad: number) => {
    if (cantidad <= 0) return;
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

    try {
      // 1. Actualizar datos básicos del pedido
      const exito = await onGuardar({
        articulo: form.articulo.trim(),
        urgente: form.urgente,
        notas: form.notas.trim() || undefined,
        fechaEntrega: form.fechaEntrega || undefined,
      });

      if (!exito) {
        setStep("form");
        return;
      }

      // 2. Actualizar items del pedido
      // Primero eliminar todos los items existentes
      const { error: deleteError } = await supabase
        .from("pedido_items")
        .delete()
        .eq("pedido_codigo", pedido.codigo);

      if (deleteError) {
        console.error("Error al eliminar items:", deleteError);
        setStep("form");
        return;
      }

      // Luego insertar los nuevos items
      const itemsInsert = form.items.map((item) => ({
        pedido_codigo: pedido.codigo,
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
        .insert(itemsInsert);

      if (insertError) {
        console.error("Error al insertar items:", insertError);
        setStep("form");
        return;
      }

      // 3. Registrar cambios en items en auditoría
      const usuario = await obtenerUsuarioActual();
      const usuarioFinal = usuario || { codigo: "SISTEMA", nombre: "Sistema" };

      await registrarAuditoria({
        usuarioCodigo: usuarioFinal.codigo,
        usuarioNombre: usuarioFinal.nombre,
        accion: "editar",
        modulo: "pedidos",
        entidadId: pedido.codigo,
        entidadNombre: `${pedido.cliente} - ${form.articulo.trim()}`,
        detalles: {
          cambioItems: true,
          itemsCount: form.items.length,
          items: form.items.map((item) => ({
            modelo: item.modelo,
            talla: item.talla,
            color: item.color,
            cantidad: item.cantidad,
          })),
        },
      });

      console.log("✅ Pedido actualizado con", form.items.length, "items");

      setStep("exito");
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      console.error("Error al guardar pedido:", error);
      setStep("form");
    }
  };

  // Si el pedido no puede ser editado, mostrar mensaje de error
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
        {/* Form */}
        {step === "form" && (
          <>
            <div className="flex items-center justify-between px-6 py-5 border-b border-border">
              <div>
                <h3 className="text-foreground">Editar pedido</h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  <span className="font-mono">{pedido.codigo}</span> ·{" "}
                  {pedido.cliente}
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-accent transition"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
              {/* Información del cliente (no editable) */}
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">
                  Cliente (no editable)
                </p>
                <div className="px-3 py-2.5 rounded-lg bg-muted border border-border">
                  <p className="text-sm text-foreground">{pedido.cliente}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {pedido.telefono} · {pedido.email}
                  </p>
                </div>
              </div>

              {/* Artículo - Resumen */}
              <div className="space-y-1.5">
                <label
                  htmlFor="articulo"
                  className="text-sm text-foreground flex items-center gap-1"
                >
                  <Package className="w-4 h-4" />
                  Descripción del pedido <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="articulo"
                  value={form.articulo}
                  onChange={(e) =>
                    setForm({ ...form, articulo: e.target.value })
                  }
                  className={`w-full px-3 py-2.5 rounded-lg bg-input-background border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20 ${
                    showErrors && !form.articulo.trim()
                      ? "border-red-400"
                      : "border-border"
                  }`}
                  placeholder="Ej. 3 Polos, 2 Pantalones"
                />
                {showErrors && !form.articulo.trim() && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Descripción obligatoria
                  </p>
                )}
              </div>

              {/* Items del pedido */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm text-foreground flex items-center gap-1">
                    <ShoppingBag className="w-4 h-4" />
                    Productos del pedido <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setMostrarAgregarItem(true)}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-primary text-primary-foreground text-xs hover:bg-primary/90 transition"
                  >
                    <Plus className="w-3 h-3" />
                    Agregar producto
                  </button>
                </div>

                {loadingItems ? (
                  <div className="px-4 py-8 text-center border border-border rounded-lg bg-muted/20">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">
                      Cargando productos...
                    </p>
                  </div>
                ) : form.items.length === 0 ? (
                  <div className="px-4 py-8 text-center border border-dashed border-border rounded-lg bg-muted/20">
                    <ShoppingBag className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-40" />
                    <p className="text-sm text-muted-foreground">
                      No hay productos en este pedido
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Agrega al menos un producto
                    </p>
                    {showErrors && (
                      <p className="text-xs text-red-500 flex items-center justify-center gap-1 mt-2">
                        <AlertCircle className="w-3 h-3" /> Debe haber al menos
                        un producto
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="border border-border rounded-lg overflow-hidden">
                    <div className="max-h-64 overflow-y-auto">
                      {form.items.map((item, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-3 px-3 py-3 border-b border-border last:border-0 hover:bg-accent/30 transition"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-foreground font-medium truncate">
                              {item.modelo}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {item.tela} · {item.disenio} · Talla {item.talla}{" "}
                              · {item.color}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1 bg-muted px-2 py-1 rounded">
                              <button
                                type="button"
                                onClick={() =>
                                  handleActualizarCantidad(
                                    index,
                                    item.cantidad - 1,
                                  )
                                }
                                disabled={item.cantidad <= 1}
                                className="w-5 h-5 flex items-center justify-center text-foreground hover:bg-background rounded disabled:opacity-40 disabled:cursor-not-allowed transition"
                              >
                                -
                              </button>
                              <span className="text-sm text-foreground font-mono w-8 text-center">
                                {item.cantidad}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  handleActualizarCantidad(
                                    index,
                                    item.cantidad + 1,
                                  )
                                }
                                className="w-5 h-5 flex items-center justify-center text-foreground hover:bg-background rounded transition"
                              >
                                +
                              </button>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleEliminarItem(index)}
                              className="p-1.5 rounded hover:bg-red-50 text-muted-foreground hover:text-red-600 transition"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Fecha de entrega */}
              <div className="space-y-1.5">
                <label
                  htmlFor="fechaEntrega"
                  className="text-sm text-foreground flex items-center gap-1"
                >
                  <Calendar className="w-4 h-4" />
                  Fecha de entrega
                </label>
                <input
                  type="date"
                  id="fechaEntrega"
                  value={form.fechaEntrega || ""}
                  min={obtenerFechaPeruHoy()}
                  onChange={(e) => {
                    const nuevaFecha = e.target.value;
                    setForm({ ...form, fechaEntrega: nuevaFecha });
                    // Limpiar error si la fecha es válida
                    if (nuevaFecha && esValidaFechaMinimaHoy(nuevaFecha)) {
                      setErrorFecha(null);
                    }
                  }}
                  className={`w-full px-3 py-2.5 rounded-lg bg-input-background border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20 ${
                    errorFecha ? "border-red-400" : "border-border"
                  }`}
                />
                {errorFecha && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errorFecha}
                  </p>
                )}
              </div>

              {/* Urgente */}
              <div className="space-y-1.5">
                <label className="text-sm text-foreground">Prioridad</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, urgente: false })}
                    className={`py-2.5 rounded-lg text-sm border transition ${
                      !form.urgente
                        ? "bg-blue-50 text-blue-700 border-blue-200"
                        : "bg-input-background text-muted-foreground border-border hover:border-foreground/30"
                    }`}
                  >
                    Normal
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, urgente: true })}
                    className={`py-2.5 rounded-lg text-sm border transition ${
                      form.urgente
                        ? "bg-red-50 text-red-700 border-red-200"
                        : "bg-input-background text-muted-foreground border-border hover:border-foreground/30"
                    }`}
                  >
                    Urgente
                  </button>
                </div>
              </div>

              {/* Notas */}
              <div className="space-y-1.5">
                <label htmlFor="notas" className="text-sm text-foreground">
                  Notas internas
                </label>
                <textarea
                  id="notas"
                  value={form.notas}
                  onChange={(e) => setForm({ ...form, notas: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-lg bg-input-background border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20 resize-none"
                  placeholder="Observaciones adicionales sobre el pedido..."
                />
              </div>

              {/* Advertencia */}
              <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-amber-50 border border-amber-200">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">
                  Los cambios quedarán registrados en el historial de auditoría
                  del sistema.
                </p>
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
                className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition"
              >
                Guardar cambios
              </button>
            </div>
          </>
        )}

        {/* Guardando */}
        {step === "guardando" && (
          <div className="px-6 py-20 flex flex-col items-center justify-center gap-4">
            <Loader2 className="w-10 h-10 text-muted-foreground animate-spin" />
            <p className="text-sm text-muted-foreground">
              Guardando cambios...
            </p>
          </div>
        )}

        {/* Éxito */}
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
      </div>

      {/* Modal para agregar item */}
      {mostrarAgregarItem && (
        <AgregarItemModal
          onClose={() => setMostrarAgregarItem(false)}
          onAgregar={handleAgregarItem}
          productos={productos}
        />
      )}
    </div>
  );
}

// Subcomponente para agregar un item
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
      precioUnitario: undefined, // No hay precio en la estructura actual
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
          {/* Seleccionar producto */}
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

          {/* Seleccionar talla */}
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

          {/* Seleccionar color */}
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
