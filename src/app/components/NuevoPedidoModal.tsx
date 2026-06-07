import { useState, useRef, useEffect } from "react";
import {
  X, Search, Calendar, AlertCircle, Plus, Trash2,
  CheckCircle2, Loader2, Package,
} from "lucide-react";
import type { ProductoCatalogo } from "./NuevoProductoModal";
import { formatearSoles } from "../utils/formatoMoneda";

// ─── Selector simple (sin opción de agregar) ─────────────────────────────────

function CatalogSelect({ value, options, placeholder, onChange, disabled = false, hasError = false }: {
  value: string; options: string[]; placeholder: string;
  onChange: (v: string) => void; disabled?: boolean; hasError?: boolean;
}) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} disabled={disabled}
      className={`w-full px-3 py-2 rounded-lg bg-input-background border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20 disabled:opacity-50 disabled:cursor-not-allowed ${hasError ? "border-red-400" : "border-border"}`}>
      <option value="">{placeholder}</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type ClienteRef = { id: string; codigo: string; nombre: string; email: string; celular: string; dni: string; ruc: string };
type ColorCantidad = { color: string; cantidad: number };

type ProductoForm = {
  uid: string;
  modelo: string; tela: string; disenio: string;
  tallasSeleccionadas: string[];
  detallesTallas: Record<string, ColorCantidad[]>;
  preciosPorTalla: Record<string, number | "">;   // precio unitario por talla
  observaciones: string;
};

type PedidoForm = {
  clienteId: string; fechaEntrega: string;
  prioridad: "Normal" | "Urgente";
  observacionesGenerales: string;
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
};

export type NuevoPedidoOutput = {
  id: string;
  cliente: string;
  clienteId: string;
  articulo: string;
  estado: string;
  fecha: string;
  urgente: boolean;
  telefono: string;
  email: string;
  notas?: string;
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
    return total + Number(precio) * cantTalla(p.detallesTallas[t] ?? []);
  }, 0);
}
function calcTotal(ps: ProductoForm[]) { return ps.reduce((s, p) => s + calcSub(p), 0); }
function nuevoProducto(): ProductoForm {
  return { uid:`${Date.now()}-${Math.random()}`, modelo:"", tela:"", disenio:"",
    tallasSeleccionadas:[], detallesTallas:{}, preciosPorTalla:{}, observaciones:"" };
}
function nextPedidoCode(pedidos: { id: string }[]) {
  const max = pedidos.reduce((m, p) => {
    const n = parseInt(p.id.replace("PED-",""), 10);
    return isNaN(n) ? m : Math.max(m, n);
  }, 0);
  return `PED-${String(max + 1).padStart(4,"0")}`;
}

// ─── ProductoCard ─────────────────────────────────────────────────────────────

function ProductoCard({ producto, index, onChange, onRemove, canRemove, showErrors, catalogoProductos }: {
  producto: ProductoForm; index: number;
  onChange: (p: ProductoForm) => void;
  onRemove: () => void; canRemove: boolean; showErrors: boolean;
  catalogoProductos: ProductoCatalogo[];
}) {
  // Opciones derivadas estrictamente del catálogo
  const modelosUnicos     = [...new Set(catalogoProductos.map(p => p.modelo))];
  const telasParaModelo   = producto.modelo
    ? [...new Set(catalogoProductos.filter(p => p.modelo === producto.modelo).map(p => p.tela))]
    : [];
  const diseniosParaCombo = producto.modelo && producto.tela
    ? [...new Set(catalogoProductos.filter(p => p.modelo === producto.modelo && p.tela === producto.tela).map(p => p.disenio))]
    : [];

  // Producto exacto del catálogo que coincide con la selección actual
  const prodCatalogo = catalogoProductos.find(
    p => p.modelo === producto.modelo && p.tela === producto.tela && p.disenio === producto.disenio
  );

  // Tallas disponibles = SOLO las del producto registrado
  const tallasDisp = prodCatalogo ? prodCatalogo.tallas.map(t => t.talla) : [];

  // Colores disponibles para una talla = SOLO los del producto registrado
  const coloresParaTalla = (talla: string): string[] => {
    const tallaData = prodCatalogo?.tallas.find(t => t.talla === talla);
    return tallaData ? tallaData.colores.map(c => c.color) : [];
  };

  // Stock disponible por color (para mostrar como referencia)
  const stockColor = (talla: string, color: string): number => {
    const tallaData = prodCatalogo?.tallas.find(t => t.talla === talla);
    return tallaData?.colores.find(c => c.color === color)?.stock ?? 0;
  };

  const mostrarTallas = !!prodCatalogo;
  const st = calcSub(producto);

  // Handlers — cada nivel resetea los niveles dependientes
  const setModelo  = (v: string) => onChange({ ...producto, modelo: v, tela: "", disenio: "", tallasSeleccionadas: [], detallesTallas: {}, preciosPorTalla: {} });
  const setTela    = (v: string) => onChange({ ...producto, tela: v, disenio: "", tallasSeleccionadas: [], detallesTallas: {}, preciosPorTalla: {} });
  const setDisenio = (v: string) => onChange({ ...producto, disenio: v, tallasSeleccionadas: [], detallesTallas: {}, preciosPorTalla: {} });

  const toggleTalla = (t: string) => {
    const on   = producto.tallasSeleccionadas.includes(t);
    const next = on ? producto.tallasSeleccionadas.filter(x => x !== t) : [...producto.tallasSeleccionadas, t];
    const det  = { ...producto.detallesTallas };
    const prec = { ...producto.preciosPorTalla };
    if (on) { delete det[t]; delete prec[t]; }
    else    { det[t] = []; prec[t] = ""; }
    onChange({ ...producto, tallasSeleccionadas: next, detallesTallas: det, preciosPorTalla: prec });
  };

  const setPrecioTalla = (t: string, val: string) => {
    // No permitir precios negativos
    const n = val === "" ? "" : Math.max(0, parseFloat(val) || 0);
    onChange({ ...producto, preciosPorTalla: { ...producto.preciosPorTalla, [t]: n } });
  };

  const toggleColor = (t: string, color: string) => {
    const cur = producto.detallesTallas[t] ?? [];
    const ex  = cur.find(cc => cc.color === color);
    const upd = ex ? cur.filter(cc => cc.color !== color) : [...cur, { color, cantidad: 1 }];
    onChange({ ...producto, detallesTallas: { ...producto.detallesTallas, [t]: upd } });
  };

  const setCantColor = (t: string, color: string, n: number) => {
    const upd = (producto.detallesTallas[t] ?? []).map(cc => cc.color === color ? { ...cc, cantidad: Math.max(1, n || 1) } : cc);
    onChange({ ...producto, detallesTallas: { ...producto.detallesTallas, [t]: upd } });
  };

  // Errores
  const errModelo  = showErrors && !producto.modelo;
  const errTela    = showErrors && !!producto.modelo && !producto.tela;
  const errDisenio = showErrors && !!producto.tela   && !producto.disenio;
  const errTallas  = showErrors && mostrarTallas && producto.tallasSeleccionadas.length === 0;

  return (
    <div className={`border rounded-xl overflow-hidden ${showErrors && (errModelo || errTallas) ? "border-red-300" : "border-border"}`}>
      {/* Cabecera */}
      <div className="flex items-center justify-between px-4 py-3 bg-muted/40 border-b border-border">
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-foreground">Producto #{index + 1}</span>
          {st > 0 && <span className="text-xs text-muted-foreground">· {formatearSoles(st)}</span>}
        </div>
        {canRemove && (
          <button type="button" onClick={onRemove}
            className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500 transition">
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="p-4 space-y-4">
        {/* Sin productos registrados */}
        {catalogoProductos.length === 0 && (
          <div className="flex items-center gap-2 px-3 py-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800">
            <AlertCircle className="w-4 h-4 shrink-0" />
            No hay productos registrados. Ve a <strong>Productos</strong> para agregar el catálogo primero.
          </div>
        )}

        {/* Modelo / Tela / Diseño — solo opciones del catálogo */}
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Modelo <span className="text-red-500">*</span></p>
            <CatalogSelect value={producto.modelo} options={modelosUnicos}
              placeholder="Seleccionar" onChange={setModelo} hasError={errModelo}
              disabled={catalogoProductos.length === 0} />
            {errModelo && <p className="text-xs text-red-500">Obligatorio</p>}
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Tela <span className="text-red-500">*</span></p>
            <CatalogSelect value={producto.tela} options={telasParaModelo}
              placeholder="Seleccionar" onChange={setTela}
              disabled={!producto.modelo} hasError={errTela} />
            {errTela && <p className="text-xs text-red-500">Obligatorio</p>}
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Diseño <span className="text-red-500">*</span></p>
            <CatalogSelect value={producto.disenio} options={diseniosParaCombo}
              placeholder="Seleccionar" onChange={setDisenio}
              disabled={!producto.tela} hasError={errDisenio} />
            {errDisenio && <p className="text-xs text-red-500">Obligatorio</p>}
          </div>
        </div>

        {prodCatalogo && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-700">
            <CheckCircle2 className="w-4 h-4 shrink-0" /> Producto registrado en catálogo
          </div>
        )}

        {/* Tallas — solo las registradas en el producto del catálogo */}
        {mostrarTallas && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">
              Tallas disponibles <span className="text-red-500">*</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {tallasDisp.map(t => (
                <button key={t} type="button" onClick={() => toggleTalla(t)}
                  className={`min-w-[44px] px-3 py-1.5 rounded-lg text-sm border transition ${
                    producto.tallasSeleccionadas.includes(t)
                      ? "bg-foreground text-background border-foreground"
                      : "bg-input-background text-muted-foreground border-border hover:border-foreground/30"
                  }`}>
                  {t}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Detalle por talla: precio + colores registrados + cantidades */}
        {producto.tallasSeleccionadas.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Detalle por talla</p>

            {producto.tallasSeleccionadas.map(t => {
              const sel        = producto.detallesTallas[t] ?? [];
              const precioVal  = producto.preciosPorTalla[t];
              const cant       = cantTalla(sel);
              const subTalla   = precioVal ? Number(precioVal) * cant : 0;
              const errCol     = showErrors && sel.length === 0;
              const errPrec    = showErrors && precioVal === "";
              const esXL       = t === "XL";
              const coloresDisp = coloresParaTalla(t);

              return (
                <div key={t} className={`border rounded-xl overflow-hidden ${
                  (errCol || errPrec) ? "border-red-300" : esXL ? "border-amber-200" : "border-border"
                }`}>
                  {/* Header de talla con precio */}
                  <div className={`flex items-center justify-between px-3 py-2.5 border-b ${
                    esXL ? "bg-amber-50 border-amber-200" : "bg-muted/30 border-border"
                  }`}>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm px-2.5 py-0.5 rounded-full border ${
                        esXL ? "bg-amber-100 text-amber-800 border-amber-300"
                             : "bg-foreground text-background border-foreground"
                      }`}>{t}</span>
                      {esXL && <span className="text-xs text-amber-700">precio diferenciado</span>}
                    </div>
                    {/* Precio por talla — mínimo 0 */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-muted-foreground">S/</span>
                      <input type="number" min={0} step={0.01}
                        value={precioVal}
                        onChange={e => setPrecioTalla(t, e.target.value)}
                        onBlur={e => {
                          // forzar ≥ 0 al salir del campo
                          if (parseFloat(e.target.value) < 0) setPrecioTalla(t, "0");
                        }}
                        placeholder="0.00"
                        className={`w-24 px-2 py-1 text-sm text-center rounded-lg bg-background border focus:outline-none focus:ring-2 focus:ring-foreground/20 ${errPrec ? "border-red-400" : "border-border"}`} />
                      <span className="text-xs text-muted-foreground">/ ud.</span>
                    </div>
                  </div>

                  {errPrec && (
                    <p className="px-3 pt-2 text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> Ingresa el precio para talla {t}.
                    </p>
                  )}

                  <div className="p-3 space-y-2.5">
                    {/* Colores del producto registrado para esta talla */}
                    <div className="flex flex-wrap gap-1.5">
                      {coloresDisp.map(color => {
                        const on    = sel.some(cc => cc.color === color);
                        const stock = stockColor(t, color);
                        return (
                          <button key={color} type="button" onClick={() => toggleColor(t, color)}
                            className={`px-2.5 py-0.5 rounded-full text-xs border transition flex items-center gap-1 ${
                              on ? "bg-foreground text-background border-foreground"
                                 : "bg-input-background text-muted-foreground border-border hover:border-foreground/30"
                            }`}>
                            {color}
                            <span className={`text-xs ${on ? "opacity-70" : "opacity-50"}`}>({stock})</span>
                          </button>
                        );
                      })}
                    </div>

                    {coloresDisp.length === 0 && (
                      <p className="text-xs text-muted-foreground">Sin colores en stock para esta talla.</p>
                    )}
                    {errCol && (
                      <p className="text-xs text-red-500 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Selecciona al menos un color.
                      </p>
                    )}

                    {/* Cantidades por color seleccionado */}
                    {sel.length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {sel.map(cc => (
                          <div key={cc.color} className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 bg-muted/40">
                            <span className="text-xs text-foreground flex-1 truncate">{cc.color}</span>
                            <input type="number" min={1} value={cc.cantidad}
                              onChange={e => setCantColor(t, cc.color, parseInt(e.target.value))}
                              className="w-14 px-2 py-0.5 text-xs text-center rounded bg-background border border-border focus:outline-none" />
                            <span className="text-xs text-muted-foreground shrink-0">ud.</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Subtotal de esta talla */}
                    {cant > 0 && !!precioVal && Number(precioVal) > 0 && (
                      <div className="flex justify-between items-center pt-1.5 border-t border-border/50 text-xs">
                        <span className="text-muted-foreground">{cant} ud. × {formatearSoles(Number(precioVal))}</span>
                        <span className="text-foreground">{formatearSoles(subTalla)}</span>
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
          <p className="text-xs text-muted-foreground">Observaciones / especificaciones</p>
          <textarea rows={2} value={producto.observaciones}
            onChange={e=>onChange({...producto,observaciones:e.target.value})}
            placeholder="Ej. bordado en bolsillo, botones especiales, ajuste slim…"
            className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20 resize-none"/>
        </div>

        {/* Subtotal del producto */}
        {calcSub(producto) > 0 && (
          <div className="flex justify-between items-center pt-2 border-t border-border text-sm">
            <span className="text-muted-foreground text-xs">
              {producto.tallasSeleccionadas.length} talla{producto.tallasSeleccionadas.length!==1?"s":""} ·{" "}
              {Object.values(producto.detallesTallas).flat().reduce((s,cc)=>s+cc.cantidad,0)} unidades totales
            </span>
            <span className="text-foreground">Subtotal: <strong>{formatearSoles(calcSub(producto))}</strong></span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Modal principal ──────────────────────────────────────────────────────────

const PRIORIDAD_COLOR: Record<string,string> = {
  Normal:  "bg-blue-50 text-blue-700 border-blue-200",
  Urgente: "bg-red-50 text-red-700 border-red-200",
};

export function NuevoPedidoModal({ onClose, clientes, onGuardar, pedidosExistentes, productos=[] }: {
  onClose:()=>void; clientes:ClienteRef[];
  onGuardar:(p:NuevoPedidoOutput)=>void;
  pedidosExistentes:{id:string}[];
  productos?: ProductoCatalogo[];
}) {
  type Step = "form"|"confirmacion"|"guardando"|"exito"|"error";
  const [step, setStep]             = useState<Step>("form");
  const [showErrors, setShowErrors] = useState(false);
  const [codigoPedido, setCodigo]   = useState("");

  const [clienteBusq, setClienteBusq]   = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [clienteSel, setClienteSel]     = useState<ClienteRef|null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(()=>{
    const h=(e:MouseEvent)=>{ if(dropdownRef.current&&!dropdownRef.current.contains(e.target as Node)) setDropdownOpen(false); };
    document.addEventListener("mousedown",h);
    return ()=>document.removeEventListener("mousedown",h);
  },[]);

  const [form, setForm] = useState<PedidoForm>({
    clienteId:"", fechaEntrega:"", prioridad:"Normal",
    observacionesGenerales:"", productos:[nuevoProducto()],
  });

  const clientesFiltrados = clienteBusq.length>=2
    ? clientes.filter(c=>
        c.nombre.toLowerCase().includes(clienteBusq.toLowerCase()) ||
        c.codigo.toLowerCase().includes(clienteBusq.toLowerCase()) ||
        c.dni.includes(clienteBusq))
    : [];

  const selectCliente = (c:ClienteRef) => {
    setClienteSel(c); setForm(f=>({...f,clienteId:c.id}));
    setDropdownOpen(false); setClienteBusq("");
  };

  const total = calcTotal(form.productos);

  const validate = () => {
    if (!form.clienteId || !form.fechaEntrega) return false;
    for (const p of form.productos) {
      if (!p.modelo||!p.tela||!p.disenio) return false;
      if (p.tallasSeleccionadas.length===0) return false;
      for (const t of p.tallasSeleccionadas) {
        if ((p.detallesTallas[t]??[]).length===0) return false;
        if (p.preciosPorTalla[t]==="") return false;
      }
    }
    return true;
  };

  const handleGuardar = () => { setShowErrors(true); if(!validate()) return; setStep("confirmacion"); };

  const handleConfirmar = () => {
    setStep("guardando");
    setTimeout(()=>{
      try {
        const codigo = nextPedidoCode(pedidosExistentes);
        setCodigo(codigo);

        // Construir items detallados de productos
        const items: PedidoItemOutput[] = [];
        for (const producto of form.productos) {
          // Buscar el producto en el catálogo para obtener su código
          const prodCatalogo = productos.find(
            p => p.modelo === producto.modelo &&
                 p.tela === producto.tela &&
                 p.disenio === producto.disenio
          );

          if (!prodCatalogo) continue;

          // Iterar por cada talla seleccionada
          for (const talla of producto.tallasSeleccionadas) {
            const colores = producto.detallesTallas[talla] || [];
            const precioUnitario = producto.preciosPorTalla[talla];

            // Iterar por cada color en la talla
            for (const colorCantidad of colores) {
              if (colorCantidad.cantidad > 0) {
                items.push({
                  productoCodigo: prodCatalogo.codigo,
                  modelo: producto.modelo,
                  tela: producto.tela,
                  disenio: producto.disenio,
                  talla: talla,
                  color: colorCantidad.color,
                  cantidad: colorCantidad.cantidad,
                  precioUnitario: typeof precioUnitario === "number" ? precioUnitario : undefined,
                });
              }
            }
          }
        }

        onGuardar({
          id: codigo,
          cliente: clienteSel!.nombre,
          clienteId: clienteSel!.id,
          articulo: form.productos.map(p => p.modelo).join(", "),
          estado: "Recibido",
          fecha: new Date().toISOString().split("T")[0],
          urgente: form.prioridad === "Urgente",
          telefono: clienteSel!.celular,
          email: clienteSel!.email,
          notas: form.observacionesGenerales || undefined,
          items: items,
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
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={step==="form"?onClose:undefined}/>

      <div className="relative z-10 bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[92vh]">

        {/* FORM */}
        {step==="form" && (
          <>
            <div className="flex items-center justify-between px-6 py-5 border-b border-border shrink-0">
              <div>
                <h3 className="text-foreground">Nuevo pedido</h3>
                <p className="text-muted-foreground text-sm mt-0.5">Completá los datos del pedido</p>
              </div>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-accent transition">
                <X className="w-4 h-4 text-muted-foreground"/></button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

              {/* 1. Cliente */}
              <section className="space-y-3">
                <h4 className="text-foreground flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-foreground text-background text-xs flex items-center justify-center shrink-0">1</span>
                  Cliente
                </h4>
                {clienteSel ? (
                  <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-emerald-200 bg-emerald-50">
                    <div className="w-9 h-9 rounded-full bg-foreground text-background flex items-center justify-center text-sm shrink-0">
                      {clienteSel.nombre.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-foreground text-sm">{clienteSel.nombre}</p>
                      <p className="text-xs text-muted-foreground truncate">{clienteSel.email} · DNI {clienteSel.dni}</p>
                    </div>
                    <span className="text-xs font-mono text-emerald-700 bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded shrink-0">{clienteSel.codigo}</span>
                    <button type="button" onClick={()=>{setClienteSel(null);setForm(f=>({...f,clienteId:""}));}}
                      className="text-muted-foreground hover:text-foreground p-1 shrink-0 transition">
                      <X className="w-4 h-4"/></button>
                  </div>
                ) : (
                  <div className="relative" ref={dropdownRef}>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"/>
                      <input type="text" placeholder="Buscar por nombre, DNI o código…"
                        value={clienteBusq}
                        onChange={e=>{setClienteBusq(e.target.value);setDropdownOpen(true);}}
                        onFocus={()=>setDropdownOpen(true)}
                        className={`w-full pl-9 pr-4 py-2.5 rounded-lg bg-input-background border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20 transition ${showErrors&&!form.clienteId?"border-red-400":"border-border"}`}/>
                    </div>
                    {dropdownOpen&&clienteBusq.length>=2&&(
                      <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-xl z-20 overflow-hidden max-h-52 overflow-y-auto">
                        {clientesFiltrados.length>0 ? clientesFiltrados.map(c=>(
                          <button key={c.id} type="button" onMouseDown={()=>selectCliente(c)}
                            className="w-full text-left px-4 py-2.5 hover:bg-accent transition flex items-center gap-3">
                            <div className="w-7 h-7 rounded-full bg-foreground text-background flex items-center justify-center text-xs shrink-0">
                              {c.nombre.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm text-foreground">{c.nombre}</p>
                              <p className="text-xs text-muted-foreground">DNI {c.dni} · {c.codigo}</p>
                            </div>
                          </button>
                        )) : (
                          <div className="px-4 py-3 flex items-center gap-2 text-sm text-amber-700 bg-amber-50">
                            <AlertCircle className="w-4 h-4 shrink-0 text-amber-500"/>
                            Cliente no encontrado. Regístralo primero en <strong>Clientes</strong>.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
                {showErrors&&!form.clienteId&&(
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3"/> Debes seleccionar un cliente registrado.
                  </p>
                )}
              </section>

              <div className="border-t border-border"/>

              {/* 2. Datos */}
              <section className="space-y-4">
                <h4 className="text-foreground flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-foreground text-background text-xs flex items-center justify-center shrink-0">2</span>
                  Datos del pedido
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm text-foreground flex items-center gap-1">
                      Fecha de entrega <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none"/>
                      <input type="date" value={form.fechaEntrega}
                        min={new Date().toISOString().split("T")[0]}
                        onChange={e=>setForm(f=>({...f,fechaEntrega:e.target.value}))}
                        className={`w-full pl-9 pr-3 py-2.5 rounded-lg bg-input-background border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20 ${showErrors&&!form.fechaEntrega?"border-red-400":"border-border"}`}/>
                    </div>
                    {showErrors&&!form.fechaEntrega&&<p className="text-xs text-red-500">Fecha obligatoria.</p>}
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm text-foreground">Prioridad</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(["Normal","Urgente"] as const).map(p=>(
                        <button key={p} type="button" onClick={()=>setForm(f=>({...f,prioridad:p}))}
                          className={`py-2.5 rounded-lg text-sm border transition ${form.prioridad===p?PRIORIDAD_COLOR[p]:"bg-input-background text-muted-foreground border-border hover:border-foreground/30"}`}>
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm text-foreground">Observaciones generales</label>
                  <textarea rows={2} value={form.observacionesGenerales}
                    onChange={e=>setForm(f=>({...f,observacionesGenerales:e.target.value}))}
                    placeholder="Ej. retira en local, entrega a domicilio, evento el 15 de julio…"
                    className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20 resize-none"/>
                </div>
              </section>

              <div className="border-t border-border"/>

              {/* 3. Productos */}
              <section className="space-y-4">
                <h4 className="text-foreground flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-foreground text-background text-xs flex items-center justify-center shrink-0">3</span>
                  Productos
                </h4>
                <div className="space-y-4">
                  {form.productos.map((p,i)=>(
                    <ProductoCard key={p.uid} producto={p} index={i}
                      onChange={upd=>setForm(f=>({...f,productos:f.productos.map(x=>x.uid===p.uid?upd:x)}))}
                      onRemove={()=>setForm(f=>({...f,productos:f.productos.filter(x=>x.uid!==p.uid)}))}
                      canRemove={form.productos.length>1} showErrors={showErrors}
                      catalogoProductos={productos}/>
                  ))}
                </div>
                <button type="button"
                  onClick={()=>setForm(f=>({...f,productos:[...f.productos,nuevoProducto()]}))}
                  className="w-full py-2.5 rounded-xl border-2 border-dashed border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground transition text-sm flex items-center justify-center gap-2">
                  <Plus className="w-4 h-4"/> Agregar otro producto
                </button>
              </section>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-border bg-card shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  {total>0&&(
                    <>
                      <p className="text-xs text-muted-foreground">Total estimado</p>
                      <p className="text-xl text-foreground">{formatearSoles(total)}</p>
                    </>
                  )}
                </div>
                <div className="flex gap-3">
                  <button onClick={onClose} className="px-4 py-2.5 rounded-lg border border-border text-foreground text-sm hover:bg-accent transition">Cancelar</button>
                  <button onClick={handleGuardar} className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition">Guardar pedido</button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* CONFIRMACIÓN */}
        {step==="confirmacion"&&(
          <>
            <div className="flex items-center justify-between px-6 py-5 border-b border-border shrink-0">
              <div>
                <h3 className="text-foreground">Confirmar pedido</h3>
                <p className="text-muted-foreground text-sm mt-0.5">Revisá los datos antes de registrar</p>
              </div>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-accent transition">
                <X className="w-4 h-4 text-muted-foreground"/></button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Cliente</p>
                <p className="text-foreground text-sm">{clienteSel?.nombre}</p>
                <p className="text-xs text-muted-foreground">{clienteSel?.email} · DNI {clienteSel?.dni}</p>
              </div>
              <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 space-y-2">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Datos del pedido</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Fecha de entrega</p>
                    <p className="text-foreground">{form.fechaEntrega}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Prioridad</p>
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs border ${PRIORIDAD_COLOR[form.prioridad]}`}>{form.prioridad}</span>
                  </div>
                </div>
                {form.observacionesGenerales&&<p className="text-xs text-muted-foreground italic">"{form.observacionesGenerales}"</p>}
              </div>
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Productos ({form.productos.length})</p>
                {form.productos.map((p,i)=>(
                  <div key={p.uid} className="rounded-xl border border-border px-4 py-3 space-y-2">
                    <p className="text-sm text-foreground">{i+1}. {p.modelo} · {p.tela} · {p.disenio}</p>
                    <div className="space-y-1">
                      {p.tallasSeleccionadas.map(t=>{
                        const cant2 = cantTalla(p.detallesTallas[t]??[]);
                        const prec2 = p.preciosPorTalla[t];
                        return (
                          <div key={t} className="text-xs text-muted-foreground flex justify-between">
                            <span>Talla {t}: {(p.detallesTallas[t]??[]).map(cc=>`${cc.color} ×${cc.cantidad}`).join(", ")}</span>
                            {prec2&&<span>{cant2} ud. × {formatearSoles(Number(prec2))} = <strong className="text-foreground">{formatearSoles(Number(prec2)*cant2)}</strong></span>}
                          </div>
                        );
                      })}
                    </div>
                    {p.observaciones&&<p className="text-xs text-muted-foreground italic">"{p.observaciones}"</p>}
                    <div className="flex justify-end pt-1 border-t border-border/50 text-sm">
                      <span className="text-foreground">Subtotal: <strong>{formatearSoles(calcSub(p))}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center px-5 py-3 rounded-xl bg-foreground text-background">
                <span className="text-sm">Total del pedido</span>
                <span className="text-xl">{formatearSoles(total)}</span>
              </div>
              <div className="flex gap-3 pb-2">
                <button onClick={()=>setStep("form")}
                  className="flex-1 py-2.5 rounded-lg border border-border text-foreground text-sm hover:bg-accent transition">Editar</button>
                <button onClick={handleConfirmar}
                  className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition">Confirmar pedido</button>
              </div>
            </div>
          </>
        )}

        {/* GUARDANDO */}
        {step==="guardando"&&(
          <div className="flex-1 flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-10 h-10 text-muted-foreground animate-spin"/>
            <p className="text-muted-foreground text-sm">Guardando pedido y actualizando stock…</p>
          </div>
        )}

        {/* ÉXITO */}
        {step==="exito"&&(
          <div className="px-6 py-10 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-emerald-600"/>
            </div>
            <div>
              <h3 className="text-foreground">Pedido registrado</h3>
              <p className="text-muted-foreground text-sm mt-1">El pedido fue guardado exitosamente.</p>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-4 space-y-1.5">
              <p className="text-sm text-emerald-800">Estado inicial: <strong>Recibido</strong></p>
              <p className="text-xs font-mono text-emerald-700">Código: <strong className="text-base">{codigoPedido}</strong></p>
              <p className="text-xs text-emerald-600">Stock de productos actualizado.</p>
            </div>
            <button onClick={onClose} className="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition">Aceptar</button>
          </div>
        )}

        {/* ERROR */}
        {step==="error"&&(
          <div className="px-6 py-10 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto">
              <AlertCircle className="w-8 h-8 text-red-600"/>
            </div>
            <div>
              <h3 className="text-foreground">Error al guardar</h3>
              <p className="text-muted-foreground text-sm mt-1">No fue posible registrar el pedido. Intenta nuevamente.</p>
            </div>
            <div className="flex gap-3 justify-center">
              <button onClick={()=>setStep("confirmacion")}
                className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition">Reintentar</button>
              <button onClick={onClose}
                className="px-4 py-2.5 rounded-lg border border-border text-foreground text-sm hover:bg-accent transition">Cancelar</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
