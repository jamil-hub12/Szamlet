import { useState, useRef, useEffect } from "react";
import {
  X,
  Search,
  Calendar,
  AlertCircle,
  Plus,
  Trash2,
  CheckCircle2,
  Loader2,
  Package,
} from "lucide-react";
import type { ProductoCatalogo } from "../productos/NuevoProductoModal";
import { formatearSoles } from "../../utils/formatoMoneda";
import {
  esValidaFechaMinimaHoy,
  obtenerMensajeErrorFecha,
} from "../../utils/validaciones";
import { obtenerFechaPeruHoy } from "../../utils/fechas";

// ─── Selector simple (sin opción de agregar) ─────────────────────────────────

function CatalogSelect({
  value,
  options,
  placeholder,
  onChange,
  disabled = false,
  hasError = false,
}: {
  value: string;
  options: string[];
  placeholder: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  hasError?: boolean;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={`w-full px-3 py-2 rounded-lg bg-input-background border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20 disabled:opacity-50 disabled:cursor-not-allowed ${hasError ? "border-red-400" : "border-border"}`}
    >
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type ClienteRef = {
  id: string;
  codigo: string;
  nombre: string;
  email: string;
  celular: string;
  dni: string;
  ruc: string;
};
type ColorCantidad = { color: string; cantidad: number };

type ProductoForm = {
  uid: string;
  modelo: string;
  tela: string;
  disenio: string;
  tallasSeleccionadas: string[];
  detallesTallas: Record<string, ColorCantidad[]>;
  preciosPorTalla: Record<string, number>;
  descuentoPorcentaje: number; // 0, 5, o 10
  observaciones: string;
  esEspecial: boolean; // producto fuera de catálogo
};

type PedidoForm = {
  clienteId: string;
  fechaEntrega: string;
  prioridad: "Normal" | "Urgente";
  observacionesGenerales: string;
  tipoPedido: "venta_directa" | "fabricar";
  productos: ProductoForm[];
};

export type PedidoItemOutput = {
  productoCodigo: string;
  modelo: string;
  tela: string;
  disenio: string;
  talla: string;
  color: string;
  cantidad: number;
  precioUnitario?: number;
  esEspecial?: boolean;
};

export type NuevoPedidoOutput = {
  id: string;
  cliente: string;
  clienteId: string;
  articulo: string;
  estado: string;
  fecha: string;
  fechaEntrega?: string;
  urgente: boolean;
  telefono: string;
  email: string;
  notas?: string;
  tipoPedido: "venta_directa" | "fabricar";
  items: PedidoItemOutput[];
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function cantTalla(cols: ColorCantidad[]) {
  return cols.reduce((s, cc) => s + (cc.cantidad || 0), 0);
}
function calcSub(p: ProductoForm): number {
  return p.tallasSeleccionadas.reduce((total, t) => {
    const precio = p.preciosPorTalla[t];
    if (!precio) return total;
    const precioConDescuento = precio * (1 - p.descuentoPorcentaje / 100);
    return total + precioConDescuento * cantTalla(p.detallesTallas[t] ?? []);
  }, 0);
}
function calcTotal(ps: ProductoForm[]) {
  return ps.reduce((s, p) => s + calcSub(p), 0);
}
function nuevoProducto(): ProductoForm {
  return {
    uid: `${Date.now()}-${Math.random()}`,
    modelo: "",
    tela: "",
    disenio: "",
    tallasSeleccionadas: [],
    detallesTallas: {},
    preciosPorTalla: {},
    descuentoPorcentaje: 0,
    observaciones: "",
    esEspecial: false,
  };
}
function nextPedidoCode(pedidos: { id: string }[]) {
  const max = pedidos.reduce((m, p) => {
    const n = parseInt(p.id.replace("PED-", ""), 10);
    return isNaN(n) ? m : Math.max(m, n);
  }, 0);
  return `PED-${String(max + 1).padStart(4, "0")}`;
}

// ─── Sanitización de texto ────────────────────────────────────────────────────
// Solo letras (incluye acentos/ñ), espacios, guión, apóstrofe — para nombres/modelos
const REGEX_SOLO_LETRAS = /[^a-zA-ZáéíóúñÁÉÍÓÚÑüÜ\s\-']/g;
// Para observaciones: letras, números, espacios y puntuación básica (.,;:!?-)
const REGEX_OBSERVACIONES = /[^a-zA-ZáéíóúñÁÉÍÓÚÑüÜ0-9\s\-.,;:!?¿¡'()]/g;

function sanitizarLetras(v: string) {
  return v.replace(REGEX_SOLO_LETRAS, "");
}
function sanitizarObservaciones(v: string) {
  return v.replace(REGEX_OBSERVACIONES, "");
}

// ─── ProductoCard ─────────────────────────────────────────────────────────────

// Input libre con opción "otro" para modo especial
function FreeInput({
  value,
  placeholder,
  onChange,
  hasError = false,
}: {
  value: string;
  placeholder: string;
  onChange: (v: string) => void;
  hasError?: boolean;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full px-3 py-2 rounded-lg bg-input-background border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20 ${hasError ? "border-red-400" : "border-amber-300"}`}
    />
  );
}

// Tallas estándar disponibles para pedidos especiales
const TALLAS_ESTANDAR = ["XS", "S", "M", "L", "XL", "XXL", "Única"];

function ProductoCard({
  producto,
  index,
  onChange,
  onRemove,
  canRemove,
  showErrors,
  catalogoProductos,
  esAdmin = false,
  esVentaDirecta = false,
}: {
  producto: ProductoForm;
  index: number;
  onChange: (p: ProductoForm) => void;
  onRemove: () => void;
  canRemove: boolean;
  showErrors: boolean;
  catalogoProductos: ProductoCatalogo[];
  esAdmin?: boolean;
  esVentaDirecta?: boolean;
}) {
  // Estado local para agregar talla/color personalizado en modo especial
  const [nuevaTalla, setNuevaTalla] = useState("");
  const [nuevoColor, setNuevoColor] = useState<Record<string, string>>({});

  // ── Modo catálogo: opciones derivadas del catálogo ──
  const modelosUnicos = [...new Set(catalogoProductos.map((p) => p.modelo))];
  const telasParaModelo = producto.modelo
    ? [
        ...new Set(
          catalogoProductos
            .filter((p) => p.modelo === producto.modelo)
            .map((p) => p.tela),
        ),
      ]
    : [];
  const diseniosParaCombo =
    producto.modelo && producto.tela
      ? [
          ...new Set(
            catalogoProductos
              .filter(
                (p) => p.modelo === producto.modelo && p.tela === producto.tela,
              )
              .map((p) => p.disenio),
          ),
        ]
      : [];

  const prodCatalogo = catalogoProductos.find(
    (p) =>
      p.modelo === producto.modelo &&
      p.tela === producto.tela &&
      p.disenio === producto.disenio,
  );

  // ── Tallas y colores según modo ──
  const tallasDisp = producto.esEspecial
    ? TALLAS_ESTANDAR
    : prodCatalogo
      ? prodCatalogo.tallas.map((t) => t.talla)
      : [];

  const coloresParaTalla = (talla: string): string[] => {
    if (producto.esEspecial) {
      // En modo especial, los colores son los que el usuario fue agregando
      return (producto.detallesTallas[talla] ?? []).map((cc) => cc.color);
    }
    const tallaData = prodCatalogo?.tallas.find((t) => t.talla === talla);
    return tallaData ? tallaData.colores.map((c) => c.color) : [];
  };

  const stockColor = (talla: string, color: string): number => {
    if (producto.esEspecial) return 0; // especial siempre sin stock previo
    const tallaData = prodCatalogo?.tallas.find((t) => t.talla === talla);
    return tallaData?.colores.find((c) => c.color === color)?.stock ?? 0;
  };

  const mostrarTallas = producto.esEspecial
    ? !!(producto.modelo && producto.tela && producto.disenio)
    : !!prodCatalogo;

  const st = calcSub(producto);

  // ── Handlers ──
  const toggleModoEspecial = () => {
    onChange({
      ...nuevoProducto(),
      uid: producto.uid,
      esEspecial: !producto.esEspecial,
    });
  };

  const setModelo = (v: string) =>
    onChange({
      ...producto,
      modelo: v,
      tela: "",
      disenio: "",
      tallasSeleccionadas: [],
      detallesTallas: {},
      preciosPorTalla: {},
      descuentoPorcentaje: 0,
    });
  const setTela = (v: string) =>
    onChange({
      ...producto,
      tela: v,
      disenio: "",
      tallasSeleccionadas: [],
      detallesTallas: {},
      preciosPorTalla: {},
      descuentoPorcentaje: 0,
    });
  const setDisenio = (v: string) => {
    const prod = catalogoProductos.find(
      (p) =>
        p.modelo === producto.modelo &&
        p.tela === producto.tela &&
        p.disenio === v,
    );
    onChange({
      ...producto,
      disenio: v,
      tallasSeleccionadas: [],
      detallesTallas: {},
      preciosPorTalla: prod ? { ...prod.preciosPorTalla } : {},
      descuentoPorcentaje: 0,
    });
  };

  const toggleTalla = (t: string) => {
    const on = producto.tallasSeleccionadas.includes(t);
    const next = on
      ? producto.tallasSeleccionadas.filter((x) => x !== t)
      : [...producto.tallasSeleccionadas, t];
    const det = { ...producto.detallesTallas };
    const prec = { ...producto.preciosPorTalla };
    if (on) {
      delete det[t];
      delete prec[t];
    } else {
      det[t] = [];
      if (
        !producto.esEspecial &&
        prodCatalogo?.preciosPorTalla[t] !== undefined
      ) {
        prec[t] = prodCatalogo.preciosPorTalla[t];
      }
    }
    onChange({
      ...producto,
      tallasSeleccionadas: next,
      detallesTallas: det,
      preciosPorTalla: prec,
    });
  };

  // Agregar talla personalizada (modo especial)
  const agregarTallaEspecial = (t: string) => {
    const tNorm = t.trim().toUpperCase();
    if (!tNorm || producto.tallasSeleccionadas.includes(tNorm)) return;
    onChange({
      ...producto,
      tallasSeleccionadas: [...producto.tallasSeleccionadas, tNorm],
      detallesTallas: { ...producto.detallesTallas, [tNorm]: [] },
    });
    setNuevaTalla("");
  };

  // Agregar color personalizado a una talla (modo especial)
  const agregarColorEspecial = (talla: string, color: string) => {
    const cNorm = color.trim();
    if (!cNorm) return;
    const cur = producto.detallesTallas[talla] ?? [];
    if (cur.some((cc) => cc.color === cNorm)) return;
    onChange({
      ...producto,
      detallesTallas: {
        ...producto.detallesTallas,
        [talla]: [...cur, { color: cNorm, cantidad: 1 }],
      },
    });
    setNuevoColor((prev) => ({ ...prev, [talla]: "" }));
  };

  const setPrecioTalla = (t: string, precio: number) => {
    onChange({
      ...producto,
      preciosPorTalla: { ...producto.preciosPorTalla, [t]: precio },
    });
  };

  const setDescuento = (descuento: number) =>
    onChange({ ...producto, descuentoPorcentaje: descuento });

  const toggleColor = (t: string, color: string) => {
    const cur = producto.detallesTallas[t] ?? [];
    const ex = cur.find((cc) => cc.color === color);
    const upd = ex
      ? cur.filter((cc) => cc.color !== color)
      : [...cur, { color, cantidad: 1 }];
    onChange({
      ...producto,
      detallesTallas: { ...producto.detallesTallas, [t]: upd },
    });
  };

  const setCantColor = (t: string, color: string, n: number) => {
    const stockDisp = stockColor(t, color);
    const cantFinal =
      stockDisp > 0
        ? Math.min(Math.max(1, n || 1), stockDisp)
        : Math.max(1, n || 1);
    const upd = (producto.detallesTallas[t] ?? []).map((cc) =>
      cc.color === color ? { ...cc, cantidad: cantFinal } : cc,
    );
    onChange({
      ...producto,
      detallesTallas: { ...producto.detallesTallas, [t]: upd },
    });
  };

  // Errores
  const errModelo = showErrors && !producto.modelo;
  const errTela = showErrors && !!producto.modelo && !producto.tela;
  const errDisenio = showErrors && !!producto.tela && !producto.disenio;
  const errTallas =
    showErrors && mostrarTallas && producto.tallasSeleccionadas.length === 0;

  return (
    <div
      className={`border rounded-xl overflow-hidden ${
        producto.esEspecial
          ? "border-amber-300"
          : showErrors && (errModelo || errTallas)
            ? "border-red-300"
            : "border-border"
      }`}
    >
      {/* Cabecera */}
      <div
        className={`flex items-center justify-between px-4 py-3 border-b ${
          producto.esEspecial
            ? "bg-amber-50 border-amber-200"
            : "bg-muted/40 border-border"
        }`}
      >
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-foreground">Producto #{index + 1}</span>
          {producto.esEspecial && (
            <span className="text-xs bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 rounded-full">
              ⚠ Especial
            </span>
          )}
          {st > 0 && (
            <span className="text-xs text-muted-foreground">
              · {formatearSoles(st)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Toggle catálogo / especial — oculto en venta directa */}
          {!esVentaDirecta && (
            <button
              type="button"
              onClick={toggleModoEspecial}
              className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition ${
                producto.esEspecial
                  ? "bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200"
                  : "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 hover:border-amber-300"
              }`}
              title={
                producto.esEspecial
                  ? "Cambiar a producto del catálogo"
                  : "Registrar producto especial (fuera de catálogo)"
              }
            >
              {producto.esEspecial ? "Usar catálogo" : "Producto especial"}
            </button>
          )}
          {canRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500 transition"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Banner modo especial */}
        {producto.esEspecial && (
          <div className="flex items-start gap-2 px-3 py-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">
                Producto especial (fuera de catálogo)
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                Este pedido <strong>no afectará el inventario</strong>. El
                equipo de producción recibirá una alerta con las características
                específicas.
              </p>
            </div>
          </div>
        )}

        {/* Sin productos registrados — solo en modo catálogo */}
        {!producto.esEspecial && catalogoProductos.length === 0 && (
          <div className="flex items-center gap-2 px-3 py-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800">
            <AlertCircle className="w-4 h-4 shrink-0" />
            No hay productos registrados. Ve a <strong>Productos</strong> para
            agregar el catálogo primero.
          </div>
        )}

        {/* Modelo / Tela / Diseño */}
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">
              Modelo <span className="text-red-500">*</span>
            </p>
            {producto.esEspecial ? (
              <FreeInput
                value={producto.modelo}
                placeholder="Ej. Polera Slim"
                onChange={(v) => setModelo(sanitizarLetras(v))}
                hasError={errModelo}
              />
            ) : (
              <CatalogSelect
                value={producto.modelo}
                options={modelosUnicos}
                placeholder="Seleccionar"
                onChange={setModelo}
                hasError={errModelo}
                disabled={catalogoProductos.length === 0}
              />
            )}
            {errModelo && <p className="text-xs text-red-500">Obligatorio</p>}
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">
              Tela <span className="text-red-500">*</span>
            </p>
            {producto.esEspecial ? (
              <FreeInput
                value={producto.tela}
                placeholder="Ej. Algodón"
                onChange={(v) => setTela(sanitizarLetras(v))}
                hasError={errTela}
              />
            ) : (
              <CatalogSelect
                value={producto.tela}
                options={telasParaModelo}
                placeholder="Seleccionar"
                onChange={setTela}
                disabled={!producto.modelo}
                hasError={errTela}
              />
            )}
            {errTela && <p className="text-xs text-red-500">Obligatorio</p>}
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">
              Diseño <span className="text-red-500">*</span>
            </p>
            {producto.esEspecial ? (
              <FreeInput
                value={producto.disenio}
                placeholder="Ej. Bordado"
                onChange={(v) => setDisenio(sanitizarLetras(v))}
                hasError={errDisenio}
              />
            ) : (
              <CatalogSelect
                value={producto.disenio}
                options={diseniosParaCombo}
                placeholder="Seleccionar"
                onChange={setDisenio}
                disabled={!producto.tela}
                hasError={errDisenio}
              />
            )}
            {errDisenio && <p className="text-xs text-red-500">Obligatorio</p>}
          </div>
        </div>

        {/* Indicador de estado — solo modo catálogo */}
        {!producto.esEspecial && prodCatalogo && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-700">
            <CheckCircle2 className="w-4 h-4 shrink-0" /> Producto registrado en
            catálogo
          </div>
        )}

        {/* Selector de descuento — visible para todos, en cualquier tipo de producto */}
        {(producto.esEspecial || (!producto.esEspecial && prodCatalogo)) && (
          <div className="space-y-2 px-4 py-3 rounded-lg border border-blue-200 bg-blue-50">
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs">
                %
              </span>
              Descuento en precio
            </label>
            <div className="flex gap-2">
              {[0, 5, 10].map((descuento) => (
                <button
                  key={descuento}
                  type="button"
                  onClick={() => setDescuento(descuento)}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm border transition ${
                    producto.descuentoPorcentaje === descuento
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-foreground border-border hover:border-blue-400"
                  }`}
                >
                  {descuento === 0 ? "Sin descuento" : `${descuento}% off`}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tallas */}
        {mostrarTallas && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">
              Tallas <span className="text-red-500">*</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {tallasDisp.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => toggleTalla(t)}
                  className={`min-w-[44px] px-3 py-1.5 rounded-lg text-sm border transition ${
                    producto.tallasSeleccionadas.includes(t)
                      ? producto.esEspecial
                        ? "bg-amber-500 text-white border-amber-500"
                        : "bg-foreground text-background border-foreground"
                      : "bg-input-background text-muted-foreground border-border hover:border-foreground/30"
                  }`}
                >
                  {t}
                </button>
              ))}
              {/* Agregar talla personalizada en modo especial */}
              {producto.esEspecial && (
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={nuevaTalla}
                    onChange={(e) => setNuevaTalla(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        agregarTallaEspecial(nuevaTalla);
                      }
                    }}
                    placeholder="Otra…"
                    className="w-20 px-2 py-1.5 rounded-lg text-sm bg-input-background border border-amber-300 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-amber-300"
                  />
                  <button
                    type="button"
                    onClick={() => agregarTallaEspecial(nuevaTalla)}
                    className="p-1.5 rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200 border border-amber-300 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
            {errTallas && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> Selecciona al menos una
                talla.
              </p>
            )}
          </div>
        )}

        {/* Detalle por talla */}
        {producto.tallasSeleccionadas.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">
              Detalle por talla
            </p>

            {producto.tallasSeleccionadas.map((t) => {
              const sel = producto.detallesTallas[t] ?? [];
              const precioOriginal = producto.preciosPorTalla[t];
              const precioConDescuento = precioOriginal
                ? precioOriginal * (1 - producto.descuentoPorcentaje / 100)
                : 0;
              const cant = cantTalla(sel);
              const subTalla = precioConDescuento * cant;
              const errCol =
                showErrors && !producto.esEspecial && sel.length === 0;
              const esXL = t === "XL";
              const coloresDisp = coloresParaTalla(t);

              return (
                <div
                  key={t}
                  className={`border rounded-xl overflow-hidden ${
                    errCol
                      ? "border-red-300"
                      : producto.esEspecial
                        ? "border-amber-200"
                        : esXL
                          ? "border-amber-200"
                          : "border-border"
                  }`}
                >
                  {/* Header talla */}
                  <div
                    className={`flex items-center justify-between px-3 py-2.5 border-b ${
                      producto.esEspecial
                        ? "bg-amber-50 border-amber-200"
                        : esXL
                          ? "bg-amber-50 border-amber-200"
                          : "bg-muted/30 border-border"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-sm px-2.5 py-0.5 rounded-full border ${
                          producto.esEspecial
                            ? "bg-amber-100 text-amber-800 border-amber-300"
                            : esXL
                              ? "bg-amber-100 text-amber-800 border-amber-300"
                              : "bg-foreground text-background border-foreground"
                        }`}
                      >
                        {t}
                      </span>
                    </div>

                    {/* Precio — editable en modo especial (solo admin), del catálogo en modo normal */}
                    <div className="flex items-center gap-2 text-sm">
                      {producto.esEspecial ? (
                        esAdmin ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-muted-foreground">
                              S/
                            </span>
                            <input
                              type="number"
                              min={0}
                              step="0.50"
                              value={precioOriginal ?? ""}
                              onChange={(e) =>
                                setPrecioTalla(
                                  t,
                                  parseFloat(e.target.value) || 0,
                                )
                              }
                              placeholder="0.00"
                              className="w-20 px-2 py-0.5 text-xs text-center rounded bg-background border border-amber-300 focus:outline-none focus:ring-1 focus:ring-amber-300"
                            />
                            <span className="text-xs text-muted-foreground">
                              / ud.
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                            Precio lo asigna el administrador
                          </span>
                        )
                      ) : !precioOriginal || precioOriginal <= 0 ? (
                        <span className="text-red-600 font-semibold text-xs">
                          Sin precio definido
                        </span>
                      ) : producto.descuentoPorcentaje > 0 ? (
                        <>
                          <span className="text-muted-foreground line-through">
                            S/ {precioOriginal.toFixed(2)}
                          </span>
                          <span className="font-medium text-emerald-600">
                            S/ {precioConDescuento.toFixed(2)}
                          </span>
                          <span className="text-xs text-emerald-600 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded">
                            -{producto.descuentoPorcentaje}%
                          </span>
                        </>
                      ) : (
                        <span className="font-medium">
                          S/ {precioOriginal.toFixed(2)}
                        </span>
                      )}
                      {!producto.esEspecial &&
                        precioOriginal &&
                        precioOriginal > 0 && (
                          <span className="text-muted-foreground">/ ud.</span>
                        )}
                    </div>
                  </div>

                  <div className="p-3 space-y-2.5">
                    {/* Colores */}
                    {!producto.esEspecial && (
                      <div className="flex flex-wrap gap-1.5">
                        {coloresDisp.map((color) => {
                          const on = sel.some((cc) => cc.color === color);
                          const stock = stockColor(t, color);
                          const sinStock = stock === 0;
                          return (
                            <button
                              key={color}
                              type="button"
                              onClick={() => toggleColor(t, color)}
                              className={`px-2.5 py-0.5 rounded-full text-xs border transition flex items-center gap-1 ${
                                on
                                  ? sinStock
                                    ? "bg-amber-500 text-white border-amber-500"
                                    : "bg-foreground text-background border-foreground"
                                  : sinStock
                                    ? "bg-amber-50 text-amber-700 border-amber-300 hover:border-amber-500"
                                    : "bg-input-background text-muted-foreground border-border hover:border-foreground/30"
                              }`}
                            >
                              {color}
                              <span
                                className={`text-xs ${on ? "opacity-70" : "opacity-50"}`}
                              >
                                ({stock})
                              </span>
                              {sinStock && (
                                <span className="text-[10px] font-semibold">
                                  ⚠
                                </span>
                              )}
                            </button>
                          );
                        })}
                        {coloresDisp.length === 0 && (
                          <p className="text-xs text-muted-foreground">
                            Sin colores registrados para esta talla.
                          </p>
                        )}
                      </div>
                    )}

                    {/* Modo especial: colores libres */}
                    {producto.esEspecial && (
                      <div className="space-y-2">
                        {/* Colores ya agregados */}
                        {sel.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {sel.map((cc) => (
                              <span
                                key={cc.color}
                                className="px-2.5 py-0.5 rounded-full text-xs bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1"
                              >
                                {cc.color}
                                <button
                                  type="button"
                                  onClick={() => toggleColor(t, cc.color)}
                                  className="hover:text-red-600 transition"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                        {/* Agregar color */}
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={nuevoColor[t] ?? ""}
                            onChange={(e) =>
                              setNuevoColor((prev) => ({
                                ...prev,
                                [t]: e.target.value,
                              }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                agregarColorEspecial(t, nuevoColor[t] ?? "");
                              }
                            }}
                            placeholder="Agregar color…"
                            className="flex-1 px-2.5 py-1.5 rounded-lg text-sm bg-input-background border border-amber-300 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-amber-300"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              agregarColorEspecial(t, nuevoColor[t] ?? "")
                            }
                            className="p-1.5 rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200 border border-amber-300 transition"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        {sel.length === 0 && (
                          <p className="text-xs text-muted-foreground">
                            Agrega los colores requeridos para esta talla.
                          </p>
                        )}
                      </div>
                    )}

                    {errCol && (
                      <p className="text-xs text-red-500 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Selecciona al menos
                        un color.
                      </p>
                    )}

                    {/* Cantidades */}
                    {sel.length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {sel.map((cc) => (
                          <div
                            key={cc.color}
                            className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 bg-muted/40"
                          >
                            <span className="text-xs text-foreground flex-1 truncate">
                              {cc.color}
                            </span>
                            <input
                              type="number"
                              min={1}
                              value={cc.cantidad}
                              onChange={(e) =>
                                setCantColor(
                                  t,
                                  cc.color,
                                  parseInt(e.target.value),
                                )
                              }
                              className="w-14 px-2 py-0.5 text-xs text-center rounded bg-background border border-border focus:outline-none"
                            />
                            <span className="text-xs text-muted-foreground shrink-0">
                              ud.
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Subtotal talla */}
                    {cant > 0 && !!precioOriginal && precioConDescuento > 0 && (
                      <div className="flex justify-between items-center pt-1.5 border-t border-border/50 text-xs">
                        <span className="text-muted-foreground">
                          {cant} ud. × {formatearSoles(precioConDescuento)}
                        </span>
                        <span className="text-foreground">
                          {formatearSoles(subTalla)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Observaciones */}
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground">
            Observaciones / especificaciones
            {producto.esEspecial && (
              <span className="ml-1 text-amber-600">
                (describe el producto con detalle)
              </span>
            )}
          </p>
          <textarea
            rows={2}
            value={producto.observaciones}
            onChange={(e) =>
              onChange({
                ...producto,
                observaciones: sanitizarObservaciones(e.target.value),
              })
            }
            placeholder={
              producto.esEspecial
                ? "Ej. corte especial, tela importada, medidas exactas del cliente…"
                : "Ej. bordado en bolsillo, botones especiales, ajuste slim…"
            }
            className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20 resize-none"
          />
        </div>

        {/* Subtotal producto */}
        {calcSub(producto) > 0 && (
          <div className="flex justify-between items-center pt-2 border-t border-border text-sm">
            <span className="text-muted-foreground text-xs">
              {producto.tallasSeleccionadas.length} talla
              {producto.tallasSeleccionadas.length !== 1 ? "s" : ""} ·{" "}
              {Object.values(producto.detallesTallas)
                .flat()
                .reduce((s, cc) => s + cc.cantidad, 0)}{" "}
              unidades totales
            </span>
            <span className="text-foreground">
              Subtotal: <strong>{formatearSoles(calcSub(producto))}</strong>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Modal principal ──────────────────────────────────────────────────────────

const PRIORIDAD_COLOR: Record<string, string> = {
  Normal: "bg-blue-50 text-blue-700 border-blue-200",
  Urgente: "bg-red-50 text-red-700 border-red-200",
};

export function NuevoPedidoModal({
  onClose,
  clientes,
  onGuardar,
  pedidosExistentes,
  productos = [],
  esAdmin = false,
}: {
  onClose: () => void;
  clientes: ClienteRef[];
  onGuardar: (p: NuevoPedidoOutput) => void;
  pedidosExistentes: { id: string }[];
  productos?: ProductoCatalogo[];
  esAdmin?: boolean;
}) {
  type Step = "form" | "confirmacion" | "guardando" | "exito" | "error";
  const [step, setStep] = useState<Step>("form");
  const [showErrors, setShowErrors] = useState(false);
  const [codigoPedido, setCodigo] = useState("");

  const [clienteBusq, setClienteBusq] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [clienteSel, setClienteSel] = useState<ClienteRef | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      )
        setDropdownOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const [form, setForm] = useState<PedidoForm>({
    clienteId: "",
    fechaEntrega: "",
    prioridad: "Normal",
    observacionesGenerales: "",
    tipoPedido: "fabricar",
    productos: [nuevoProducto()],
  });
  const [errorFecha, setErrorFecha] = useState<string>("");

  const clientesFiltrados =
    clienteBusq.length >= 2
      ? clientes.filter(
          (c) =>
            c.nombre.toLowerCase().includes(clienteBusq.toLowerCase()) ||
            c.codigo.toLowerCase().includes(clienteBusq.toLowerCase()) ||
            c.dni.includes(clienteBusq),
        )
      : [];

  const selectCliente = (c: ClienteRef) => {
    setClienteSel(c);
    setForm((f) => ({ ...f, clienteId: c.id }));
    setDropdownOpen(false);
    setClienteBusq("");
  };

  const total = calcTotal(form.productos);

  const validate = () => {
    // Validar cliente
    if (!form.clienteId) return false;

    // Validar fecha de entrega
    if (!form.fechaEntrega) {
      setErrorFecha("La fecha de entrega es obligatoria");
      return false;
    }

    // Validar que fecha no sea anterior a hoy
    if (!esValidaFechaMinimaHoy(form.fechaEntrega)) {
      setErrorFecha(obtenerMensajeErrorFecha(form.fechaEntrega, "entrega"));
      return false;
    }

    setErrorFecha("");

    // Validar productos
    for (const p of form.productos) {
      if (!p.modelo || !p.tela || !p.disenio) return false;
      if (p.tallasSeleccionadas.length === 0) return false;
      for (const t of p.tallasSeleccionadas) {
        if ((p.detallesTallas[t] ?? []).length === 0) return false;
        // Precio obligatorio solo en productos del catálogo
        if (!p.esEspecial) {
          if (
            p.preciosPorTalla[t] === undefined ||
            p.preciosPorTalla[t] === null ||
            p.preciosPorTalla[t] < 0
          )
            return false;
        }
      }
    }
    return true;
  };

  const handleGuardar = () => {
    setShowErrors(true);
    if (!validate()) return;
    setStep("confirmacion");
  };

  const handleConfirmar = () => {
    setStep("guardando");
    setTimeout(() => {
      try {
        const codigo = nextPedidoCode(pedidosExistentes);
        setCodigo(codigo);

        const items: PedidoItemOutput[] = [];
        for (const producto of form.productos) {
          if (producto.esEspecial) {
            // Producto especial: usar código "ESPECIAL", no tocar stock
            for (const talla of producto.tallasSeleccionadas) {
              const colores = producto.detallesTallas[talla] || [];
              const precioOriginal = producto.preciosPorTalla[talla];
              for (const colorCantidad of colores) {
                if (colorCantidad.cantidad > 0) {
                  items.push({
                    productoCodigo: "ESP-ESPECIAL",
                    modelo: producto.modelo,
                    tela: producto.tela,
                    disenio: producto.disenio,
                    talla,
                    color: colorCantidad.color,
                    cantidad: colorCantidad.cantidad,
                    precioUnitario: precioOriginal || undefined,
                    esEspecial: true,
                  });
                }
              }
            }
          } else {
            // Producto del catálogo
            const prodCatalogo = productos.find(
              (p) =>
                p.modelo === producto.modelo &&
                p.tela === producto.tela &&
                p.disenio === producto.disenio,
            );

            if (!prodCatalogo) continue;

            for (const talla of producto.tallasSeleccionadas) {
              const colores = producto.detallesTallas[talla] || [];
              const precioOriginal = producto.preciosPorTalla[talla];
              const precioConDescuento = precioOriginal
                ? precioOriginal * (1 - producto.descuentoPorcentaje / 100)
                : undefined;

              for (const colorCantidad of colores) {
                if (colorCantidad.cantidad > 0) {
                  items.push({
                    productoCodigo: prodCatalogo.codigo,
                    modelo: producto.modelo,
                    tela: producto.tela,
                    disenio: producto.disenio,
                    talla,
                    color: colorCantidad.color,
                    cantidad: colorCantidad.cantidad,
                    precioUnitario: precioConDescuento,
                  });
                }
              }
            }
          }
        }

        // tiene_especiales se guarda en la BD directamente desde PedidosContext
        onGuardar({
          id: codigo,
          cliente: clienteSel!.nombre,
          clienteId: clienteSel!.id,
          articulo: form.productos.map((p) => p.modelo).join(", "),
          estado: "Recibido",
          fecha: obtenerFechaPeruHoy(),
          fechaEntrega: form.fechaEntrega,
          urgente: form.prioridad === "Urgente",
          telefono: clienteSel!.celular,
          email: clienteSel!.email,
          notas: form.observacionesGenerales || undefined,
          tipoPedido: form.tipoPedido,
          items,
        });
        setStep("exito");
      } catch (err) {
        console.error("Error al confirmar pedido:", err);
        setStep("error");
      }
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={step === "form" ? onClose : undefined}
      />

      <div className="relative z-10 bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[92vh]">
        {/* FORM */}
        {step === "form" && (
          <>
            <div className="flex items-center justify-between px-6 py-5 border-b border-border shrink-0">
              <div>
                <h3 className="text-foreground">Nuevo pedido</h3>
                <p className="text-muted-foreground text-sm mt-0.5">
                  Completá los datos del pedido
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-accent transition"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              {/* 1. Cliente */}
              <section className="space-y-3">
                <h4 className="text-foreground flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-foreground text-background text-xs flex items-center justify-center shrink-0">
                    1
                  </span>
                  Cliente
                </h4>
                {clienteSel ? (
                  <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-emerald-200 bg-emerald-50">
                    <div className="w-9 h-9 rounded-full bg-foreground text-background flex items-center justify-center text-sm shrink-0">
                      {clienteSel.nombre
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-foreground text-sm">
                        {clienteSel.nombre}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {clienteSel.email} · DNI {clienteSel.dni}
                      </p>
                    </div>
                    <span className="text-xs font-mono text-emerald-700 bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded shrink-0">
                      {clienteSel.codigo}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setClienteSel(null);
                        setForm((f) => ({ ...f, clienteId: "" }));
                      }}
                      className="text-muted-foreground hover:text-foreground p-1 shrink-0 transition"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="relative" ref={dropdownRef}>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Buscar por nombre, DNI o código…"
                        value={clienteBusq}
                        onChange={(e) => {
                          setClienteBusq(e.target.value);
                          setDropdownOpen(true);
                        }}
                        onFocus={() => setDropdownOpen(true)}
                        className={`w-full pl-9 pr-4 py-2.5 rounded-lg bg-input-background border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20 transition ${showErrors && !form.clienteId ? "border-red-400" : "border-border"}`}
                      />
                    </div>
                    {dropdownOpen && clienteBusq.length >= 2 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-xl z-20 overflow-hidden max-h-52 overflow-y-auto">
                        {clientesFiltrados.length > 0 ? (
                          clientesFiltrados.map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              onMouseDown={() => selectCliente(c)}
                              className="w-full text-left px-4 py-2.5 hover:bg-accent transition flex items-center gap-3"
                            >
                              <div className="w-7 h-7 rounded-full bg-foreground text-background flex items-center justify-center text-xs shrink-0">
                                {c.nombre
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")
                                  .slice(0, 2)
                                  .toUpperCase()}
                              </div>
                              <div>
                                <p className="text-sm text-foreground">
                                  {c.nombre}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  DNI {c.dni} · {c.codigo}
                                </p>
                              </div>
                            </button>
                          ))
                        ) : (
                          <div className="px-4 py-3 flex items-center gap-2 text-sm text-amber-700 bg-amber-50">
                            <AlertCircle className="w-4 h-4 shrink-0 text-amber-500" />
                            Cliente no encontrado. Regístralo primero en{" "}
                            <strong>Clientes</strong>.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
                {showErrors && !form.clienteId && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Debes seleccionar un
                    cliente registrado.
                  </p>
                )}
              </section>

              <div className="border-t border-border" />

              {/* 2. Datos */}
              <section className="space-y-4">
                <h4 className="text-foreground flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-foreground text-background text-xs flex items-center justify-center shrink-0">
                    2
                  </span>
                  Datos del pedido
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm text-foreground flex items-center gap-1">
                      Fecha de entrega <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                      <input
                        type="date"
                        value={form.fechaEntrega}
                        min={obtenerFechaPeruHoy()}
                        onChange={(e) => {
                          setForm((f) => ({
                            ...f,
                            fechaEntrega: e.target.value,
                          }));
                          setErrorFecha("");
                        }}
                        className={`w-full pl-9 pr-3 py-2.5 rounded-lg bg-input-background border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20 ${(showErrors || errorFecha) && !form.fechaEntrega ? "border-red-400" : "border-border"}`}
                      />
                    </div>
                    {(showErrors || errorFecha) && !form.fechaEntrega && (
                      <p className="text-xs text-red-500">Fecha obligatoria.</p>
                    )}
                    {errorFecha && (
                      <p className="text-xs text-red-500">{errorFecha}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm text-foreground">Prioridad</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(["Normal", "Urgente"] as const).map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() =>
                            setForm((f) => ({ ...f, prioridad: p }))
                          }
                          className={`py-2.5 rounded-lg text-sm border transition ${form.prioridad === p ? PRIORIDAD_COLOR[p] : "bg-input-background text-muted-foreground border-border hover:border-foreground/30"}`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm text-foreground">
                    Observaciones generales
                  </label>
                  <textarea
                    rows={2}
                    value={form.observacionesGenerales}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        observacionesGenerales: sanitizarObservaciones(
                          e.target.value,
                        ),
                      }))
                    }
                    placeholder="Ej. retira en local, entrega a domicilio, evento el 15 de julio…"
                    className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20 resize-none"
                  />
                </div>
              </section>

              <div className="border-t border-border" />

              {/* Tipo de pedido */}
              <section className="space-y-3">
                <h4 className="text-foreground flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-foreground text-background text-xs flex items-center justify-center shrink-0">
                    3
                  </span>
                  Tipo de pedido
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setForm((f) => ({ ...f, tipoPedido: "fabricar" }))
                    }
                    className={`flex flex-col items-start gap-1 px-4 py-3 rounded-xl border text-sm transition ${
                      form.tipoPedido === "fabricar"
                        ? "border-foreground bg-foreground text-background"
                        : "border-border bg-input-background text-muted-foreground hover:border-foreground/30"
                    }`}
                  >
                    <span className="font-medium">A fabricar</span>
                    <span
                      className={`text-xs ${form.tipoPedido === "fabricar" ? "text-background/70" : "text-muted-foreground"}`}
                    >
                      Va por Producción. Notifica al entregar.
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        tipoPedido: "venta_directa",
                        // Forzar todos los productos a modo catálogo
                        productos: f.productos.map((p) => ({
                          ...p,
                          esEspecial: false,
                          tallasSeleccionadas: [],
                          detallesTallas: {},
                          preciosPorTalla: {},
                          modelo: "",
                          tela: "",
                          disenio: "",
                        })),
                      }))
                    }
                    className={`flex flex-col items-start gap-1 px-4 py-3 rounded-xl border text-sm transition ${
                      form.tipoPedido === "venta_directa"
                        ? "border-emerald-600 bg-emerald-600 text-white"
                        : "border-border bg-input-background text-muted-foreground hover:border-emerald-400"
                    }`}
                  >
                    <span className="font-medium">Venta directa</span>
                    <span
                      className={`text-xs ${form.tipoPedido === "venta_directa" ? "text-white/80" : "text-muted-foreground"}`}
                    >
                      Hay stock. Resta inventario al crear.
                    </span>
                  </button>
                </div>
                {form.tipoPedido === "venta_directa" && (
                  <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                    ⚡ El pedido pasará directo a <strong>Entregado</strong> sin
                    pasar por Producción. Se enviará un solo email al cliente.
                  </p>
                )}
              </section>

              <div className="border-t border-border" />

              {/* 4. Productos */}
              <section className="space-y-4">
                <h4 className="text-foreground flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-foreground text-background text-xs flex items-center justify-center shrink-0">
                    4
                  </span>
                  Productos
                </h4>
                <div className="space-y-4">
                  {form.productos.map((p, i) => (
                    <ProductoCard
                      key={p.uid}
                      producto={p}
                      index={i}
                      onChange={(upd) =>
                        setForm((f) => ({
                          ...f,
                          productos: f.productos.map((x) =>
                            x.uid === p.uid ? upd : x,
                          ),
                        }))
                      }
                      onRemove={() =>
                        setForm((f) => ({
                          ...f,
                          productos: f.productos.filter((x) => x.uid !== p.uid),
                        }))
                      }
                      canRemove={form.productos.length > 1}
                      showErrors={showErrors}
                      catalogoProductos={
                        form.tipoPedido === "venta_directa"
                          ? productos.filter((prod) =>
                              prod.tallas.some((t) =>
                                t.colores.some((c) => c.stock > 0),
                              ),
                            )
                          : productos
                      }
                      esAdmin={esAdmin}
                      esVentaDirecta={form.tipoPedido === "venta_directa"}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setForm((f) => ({
                      ...f,
                      productos: [...f.productos, nuevoProducto()],
                    }))
                  }
                  className="w-full py-2.5 rounded-xl border-2 border-dashed border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground transition text-sm flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Agregar otro producto
                </button>
              </section>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-border bg-card shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  {total > 0 && (
                    <>
                      <p className="text-xs text-muted-foreground">
                        Total estimado
                      </p>
                      <p className="text-xl text-foreground">
                        {formatearSoles(total)}
                      </p>
                    </>
                  )}
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={onClose}
                    className="px-4 py-2.5 rounded-lg border border-border text-foreground text-sm hover:bg-accent transition"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleGuardar}
                    className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition"
                  >
                    Guardar pedido
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* CONFIRMACIÓN */}
        {step === "confirmacion" && (
          <>
            <div className="flex items-center justify-between px-6 py-5 border-b border-border shrink-0">
              <div>
                <h3 className="text-foreground">Confirmar pedido</h3>
                <p className="text-muted-foreground text-sm mt-0.5">
                  Revisá los datos antes de registrar
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-accent transition"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">
                  Cliente
                </p>
                <p className="text-foreground text-sm">{clienteSel?.nombre}</p>
                <p className="text-xs text-muted-foreground">
                  {clienteSel?.email} · DNI {clienteSel?.dni}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 space-y-2">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">
                  Datos del pedido
                </p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Fecha de entrega
                    </p>
                    <p className="text-foreground">{form.fechaEntrega}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Prioridad</p>
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-xs border ${PRIORIDAD_COLOR[form.prioridad]}`}
                    >
                      {form.prioridad}
                    </span>
                  </div>
                </div>
                {form.observacionesGenerales && (
                  <p className="text-xs text-muted-foreground italic">
                    "{form.observacionesGenerales}"
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">
                  Productos ({form.productos.length})
                </p>
                {form.productos.map((p, i) => (
                  <div
                    key={p.uid}
                    className="rounded-xl border border-border px-4 py-3 space-y-2"
                  >
                    <p className="text-sm text-foreground">
                      {i + 1}. {p.modelo} · {p.tela} · {p.disenio}
                    </p>
                    <div className="space-y-1">
                      {p.tallasSeleccionadas.map((t) => {
                        const cant2 = cantTalla(p.detallesTallas[t] ?? []);
                        const prec2 = p.preciosPorTalla[t];
                        return (
                          <div
                            key={t}
                            className="text-xs text-muted-foreground flex justify-between"
                          >
                            <span>
                              Talla {t}:{" "}
                              {(p.detallesTallas[t] ?? [])
                                .map((cc) => `${cc.color} ×${cc.cantidad}`)
                                .join(", ")}
                            </span>
                            {prec2 && (
                              <span>
                                {cant2} ud. × {formatearSoles(Number(prec2))} ={" "}
                                <strong className="text-foreground">
                                  {formatearSoles(Number(prec2) * cant2)}
                                </strong>
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {p.observaciones && (
                      <p className="text-xs text-muted-foreground italic">
                        "{p.observaciones}"
                      </p>
                    )}
                    <div className="flex justify-end pt-1 border-t border-border/50 text-sm">
                      <span className="text-foreground">
                        Subtotal: <strong>{formatearSoles(calcSub(p))}</strong>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center px-5 py-3 rounded-xl bg-foreground text-background">
                <span className="text-sm">Total del pedido</span>
                <span className="text-xl">{formatearSoles(total)}</span>
              </div>
              <div className="flex gap-3 pb-2">
                <button
                  onClick={() => setStep("form")}
                  className="flex-1 py-2.5 rounded-lg border border-border text-foreground text-sm hover:bg-accent transition"
                >
                  Editar
                </button>
                <button
                  onClick={handleConfirmar}
                  className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition"
                >
                  Confirmar pedido
                </button>
              </div>
            </div>
          </>
        )}

        {/* GUARDANDO */}
        {step === "guardando" && (
          <div className="flex-1 flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-10 h-10 text-muted-foreground animate-spin" />
            <p className="text-muted-foreground text-sm">
              Guardando pedido y actualizando stock…
            </p>
          </div>
        )}

        {/* ÉXITO */}
        {step === "exito" && (
          <div className="px-6 py-10 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-foreground">Pedido registrado</h3>
              <p className="text-muted-foreground text-sm mt-1">
                El pedido fue guardado exitosamente.
              </p>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-4 space-y-1.5">
              <p className="text-sm text-emerald-800">
                Estado inicial: <strong>Recibido</strong>
              </p>
              <p className="text-xs font-mono text-emerald-700">
                Código: <strong className="text-base">{codigoPedido}</strong>
              </p>
              {form.productos.some((p) => !p.esEspecial) && (
                <p className="text-xs text-emerald-600">
                  Stock de productos del catálogo actualizado.
                </p>
              )}
              {form.productos.some((p) => p.esEspecial) && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                  ⚠ Contiene productos especiales (fuera de catálogo). El
                  inventario no fue afectado. Producción recibirá la alerta.
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition"
            >
              Aceptar
            </button>
          </div>
        )}

        {/* ERROR */}
        {step === "error" && (
          <div className="px-6 py-10 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <div>
              <h3 className="text-foreground">Error al guardar</h3>
              <p className="text-muted-foreground text-sm mt-1">
                No fue posible registrar el pedido. Intenta nuevamente.
              </p>
            </div>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setStep("confirmacion")}
                className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition"
              >
                Reintentar
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2.5 rounded-lg border border-border text-foreground text-sm hover:bg-accent transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
