import { useState, useRef, useEffect } from "react";
import {
  X,
  Plus,
  CheckCircle2,
  Loader2,
  Package,
  AlertCircle,
} from "lucide-react";
import type { ProductoCatalogo, ColorStock } from "./NuevoProductoModal";

const TALLAS_BASE = ["S", "M", "L", "XL"];
const COLORES_BASE = [
  "Blanco",
  "Negro",
  "Rojo",
  "Azul",
  "Verde",
  "Amarillo",
  "Rosa",
  "Gris",
  "Beige",
  "Celeste",
  "Bordó",
  "Naranja",
];

// ─── TallaEditCard ────────────────────────────────────────────────────────────

function TallaEditCard({
  talla,
  colores,
  onChange,
  modo = "confeccionador",
}: {
  talla: string;
  colores: ColorStock[];
  onChange: (cols: ColorStock[]) => void;
  modo?: "admin" | "confeccionador";
}) {
  const [addingColor, setAddingColor] = useState(false);
  const [nuevoColor, setNuevoColor] = useState("");
  const colorRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (addingColor) colorRef.current?.focus();
  }, [addingColor]);

  const esXL = talla === "XL";
  const esPersonalizada = !TALLAS_BASE.includes(talla);

  const toggleColor = (color: string) => {
    const ex = colores.find((cs) => cs.color === color);
    const upd = ex
      ? colores.filter((cs) => cs.color !== color)
      : [...colores, { color, stock: 1 }];
    onChange(upd);
  };

  const setStock = (color: string, val: string) => {
    onChange(
      colores.map((cs) =>
        cs.color === color
          ? { ...cs, stock: Math.max(0, parseInt(val) || 0) }
          : cs,
      ),
    );
  };

  const confirmarColor = () => {
    const cn = nuevoColor.trim();
    if (
      cn &&
      !colores.find((cs) => cs.color.toLowerCase() === cn.toLowerCase())
    ) {
      onChange([...colores, { color: cn, stock: 1 }]);
    }
    setAddingColor(false);
    setNuevoColor("");
  };

  const stockTotal = colores.reduce((s, cs) => s + cs.stock, 0);

  return (
    <div
      className={`border rounded-xl overflow-hidden ${esXL ? "border-amber-200" : esPersonalizada ? "border-violet-200" : "border-border"}`}
    >
      <div
        className={`flex items-center gap-2 px-3 py-2.5 border-b ${esXL ? "bg-amber-50 border-amber-200" : esPersonalizada ? "bg-violet-50 border-violet-200" : "bg-muted/30 border-border"}`}
      >
        <span
          className={`text-sm px-2.5 py-0.5 rounded-full border ${esXL ? "bg-amber-100 text-amber-800 border-amber-300" : esPersonalizada ? "bg-violet-100 text-violet-800 border-violet-300" : "bg-foreground text-background border-foreground"}`}
        >
          {talla}
        </span>
        {esXL && (
          <span className="text-xs text-amber-700">
            precio diferenciado en pedidos
          </span>
        )}
        {esPersonalizada && (
          <span className="text-xs text-violet-700">talla personalizada</span>
        )}
        <span className="ml-auto text-xs text-muted-foreground">
          {stockTotal} uds. en stock
        </span>
      </div>
      <div className="p-3 space-y-3">
        {/* Colores activos */}
        <div className="flex flex-wrap gap-1.5">
          {COLORES_BASE.map((color) => {
            const on = colores.some((cs) => cs.color === color);
            return (
              <button
                key={color}
                type="button"
                onClick={() => toggleColor(color)}
                className={`px-2.5 py-0.5 rounded-full text-xs border transition ${on ? "bg-foreground text-background border-foreground" : "bg-input-background text-muted-foreground border-border hover:border-foreground/30"}`}
              >
                {color}
              </button>
            );
          })}
          {colores
            .filter((cs) => !COLORES_BASE.includes(cs.color))
            .map((cs) => (
              <button
                key={cs.color}
                type="button"
                onClick={() => toggleColor(cs.color)}
                className="px-2.5 py-0.5 rounded-full text-xs border bg-violet-100 text-violet-700 border-violet-300 hover:bg-violet-200 transition"
              >
                {cs.color}
              </button>
            ))}
          {addingColor ? (
            <div className="flex items-center gap-1.5">
              <input
                ref={colorRef}
                type="text"
                value={nuevoColor}
                onChange={(e) => setNuevoColor(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    confirmarColor();
                  }
                  if (e.key === "Escape") {
                    setAddingColor(false);
                    setNuevoColor("");
                  }
                }}
                placeholder="Nombre del color…"
                className="px-2.5 py-0.5 rounded-full text-xs border border-violet-400 bg-violet-50 text-violet-800 focus:outline-none w-36"
              />
              <button
                type="button"
                onClick={confirmarColor}
                className="px-2 py-0.5 rounded-full text-xs bg-primary text-primary-foreground hover:bg-primary/90 transition"
              >
                OK
              </button>
              <button
                type="button"
                onClick={() => {
                  setAddingColor(false);
                  setNuevoColor("");
                }}
                className="px-2 py-0.5 rounded-full text-xs border border-border text-muted-foreground hover:bg-accent transition"
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setAddingColor(true);
                setNuevoColor("");
              }}
              className="px-2.5 py-0.5 rounded-full text-xs border border-dashed border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground transition flex items-center gap-1"
            >
              <Plus className="w-3 h-3" /> Color personalizado
            </button>
          )}
        </div>

        {/* Stock por color */}
        {colores.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {colores.map((cs) => (
              <div
                key={cs.color}
                className={`rounded-lg px-2.5 py-1.5 space-y-1 ${COLORES_BASE.includes(cs.color) ? "bg-muted/40" : "bg-violet-50 border border-violet-200"}`}
              >
                <span className="text-xs text-foreground block truncate">
                  {cs.color}
                </span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min={0}
                    value={cs.stock}
                    onChange={(e) => setStock(cs.color, e.target.value)}
                    disabled={modo === "admin"}
                    className={`w-full px-2 py-0.5 text-xs text-center rounded bg-background border border-border focus:outline-none ${modo === "admin" ? "opacity-60 cursor-not-allowed bg-muted" : ""}`}
                  />
                  <span className="text-xs text-muted-foreground shrink-0">
                    ud.
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
        {colores.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-2">
            Sin colores — selecciona al menos uno arriba.
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Modal principal ──────────────────────────────────────────────────────────

export function EditarProductoModal({
  producto,
  onClose,
  onGuardar,
  modo = "confeccionador",
}: {
  producto: ProductoCatalogo;
  onClose: () => void;
  onGuardar: (p: ProductoCatalogo) => Promise<void>;
  modo?: "admin" | "confeccionador";
}) {
  type Step = "form" | "guardando" | "exito";
  const [step, setStep] = useState<Step>("form");

  const [addingTalla, setAddingTalla] = useState(false);
  const [nuevaTalla, setNuevaTalla] = useState("");
  const tallaRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (addingTalla) tallaRef.current?.focus();
  }, [addingTalla]);

  // Estado editable del producto
  type TallasState = Record<string, ColorStock[]>;
  const [tallasSeleccionadas, setTallasSeleccionadas] = useState<string[]>(
    producto.tallas.map((t) => t.talla),
  );
  const [detalleTallas, setDetalleTallas] = useState<TallasState>(
    Object.fromEntries(producto.tallas.map((t) => [t.talla, [...t.colores]])),
  );

  const toggleTalla = (t: string) => {
    const on = tallasSeleccionadas.includes(t);
    if (on) {
      setTallasSeleccionadas((prev) => prev.filter((x) => x !== t));
      setDetalleTallas((prev) => {
        const n = { ...prev };
        delete n[t];
        return n;
      });
    } else {
      setTallasSeleccionadas((prev) => [...prev, t]);
      setDetalleTallas((prev) => ({ ...prev, [t]: [] }));
    }
  };

  const confirmarNuevaTalla = () => {
    const t = nuevaTalla.trim().toUpperCase();
    if (t && !tallasSeleccionadas.includes(t)) {
      setTallasSeleccionadas((prev) => [...prev, t]);
      setDetalleTallas((prev) => ({ ...prev, [t]: [] }));
    }
    setAddingTalla(false);
    setNuevaTalla("");
  };

  const tallasPersonalizadas = tallasSeleccionadas.filter(
    (t) => !TALLAS_BASE.includes(t),
  );
  const tallasDisp = [...TALLAS_BASE, ...tallasPersonalizadas];

  const stockTotal = Object.values(detalleTallas)
    .flat()
    .reduce((s, cs) => s + cs.stock, 0);

  const handleGuardar = async () => {
    setStep("guardando");
    try {
      await onGuardar({
        ...producto,
        tallas: tallasSeleccionadas.map((t) => ({
          talla: t,
          colores: detalleTallas[t] ?? [],
        })),
      });
      setStep("exito");
    } catch (error) {
      console.error("Error al guardar:", error);
      setStep("form");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={step === "form" ? onClose : undefined}
      />

      <div className="relative z-10 bg-card border border-border rounded-2xl shadow-2xl w-full max-w-xl flex flex-col max-h-[92vh]">
        {step === "form" && (
          <>
            <div className="flex items-center justify-between px-6 py-5 border-b border-border shrink-0">
              <div>
                <h3 className="text-foreground">
                  {modo === "admin"
                    ? "Agregar tallas y colores"
                    : "Editar stock"}
                </h3>
                <p className="text-muted-foreground text-sm mt-0.5">
                  {producto.modelo} · {producto.tela} · {producto.disenio}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-1 rounded">
                  {producto.id}
                </span>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg hover:bg-accent transition"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {/* Tallas disponibles */}
              <div className="space-y-2">
                <p className="text-sm text-foreground">Tallas disponibles</p>
                <div className="flex flex-wrap gap-2 items-center">
                  {tallasDisp.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => toggleTalla(t)}
                      className={`min-w-[44px] px-3 py-1.5 rounded-lg text-sm border transition ${
                        tallasSeleccionadas.includes(t)
                          ? "bg-foreground text-background border-foreground"
                          : "bg-input-background text-muted-foreground border-border hover:border-foreground/30"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                  {addingTalla ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        ref={tallaRef}
                        type="text"
                        value={nuevaTalla}
                        onChange={(e) => setNuevaTalla(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            confirmarNuevaTalla();
                          }
                          if (e.key === "Escape") {
                            setAddingTalla(false);
                            setNuevaTalla("");
                          }
                        }}
                        placeholder="Ej. XXL"
                        className="w-20 px-2.5 py-1.5 rounded-lg text-sm bg-input-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20"
                      />
                      <button
                        type="button"
                        onClick={confirmarNuevaTalla}
                        className="px-2.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs hover:bg-primary/90 transition"
                      >
                        OK
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAddingTalla(false);
                          setNuevaTalla("");
                        }}
                        className="p-1.5 rounded-lg border border-border text-muted-foreground hover:bg-accent transition"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setAddingTalla(true)}
                      className="px-3 py-1.5 rounded-lg text-sm border border-dashed border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground transition flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Nueva talla
                    </button>
                  )}
                </div>
                {tallasSeleccionadas.length === 0 && (
                  <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    Selecciona al menos una talla para continuar.
                  </div>
                )}
              </div>

              {/* Detalle por talla */}
              {tallasSeleccionadas.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">
                    {modo === "admin"
                      ? "Colores por talla"
                      : "Colores y stock por talla"}
                  </p>
                  {tallasSeleccionadas.map((t) => (
                    <TallaEditCard
                      key={t}
                      talla={t}
                      colores={detalleTallas[t] ?? []}
                      onChange={(cols) =>
                        setDetalleTallas((prev) => ({ ...prev, [t]: cols }))
                      }
                      modo={modo}
                    />
                  ))}
                </div>
              )}

              {/* Resumen */}
              {tallasSeleccionadas.length > 0 && modo === "confeccionador" && (
                <div className="rounded-xl bg-muted/40 border border-border px-4 py-3 flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">
                    Stock total actualizado
                  </span>
                  <span className="text-foreground">{stockTotal} unidades</span>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-border flex justify-end gap-3 shrink-0">
              <button
                onClick={onClose}
                className="px-4 py-2.5 rounded-lg border border-border text-foreground text-sm hover:bg-accent transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleGuardar}
                disabled={tallasSeleccionadas.length === 0}
                className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {modo === "admin"
                  ? "Agregar tallas y colores"
                  : "Guardar cambios"}
              </button>
            </div>
          </>
        )}

        {step === "guardando" && (
          <div className="flex-1 flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-10 h-10 text-muted-foreground animate-spin" />
            <p className="text-muted-foreground text-sm">
              {modo === "admin"
                ? "Agregando tallas y colores…"
                : "Actualizando inventario…"}
            </p>
          </div>
        )}

        {step === "exito" && (
          <div className="px-6 py-10 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-foreground">
                {modo === "admin"
                  ? "Tallas y colores agregadas"
                  : "Stock actualizado"}
              </h3>
              <p className="text-muted-foreground text-sm mt-1">
                Los cambios fueron guardados exitosamente.
              </p>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-4 space-y-1">
              <div className="flex items-center gap-2 justify-center">
                <Package className="w-4 h-4 text-emerald-600" />
                <p className="text-sm text-emerald-800">
                  {producto.modelo} · {producto.tela} · {producto.disenio}
                </p>
              </div>
              <p className="text-xs font-mono text-emerald-700">
                {producto.id}
                {modo === "confeccionador"
                  ? ` — ${stockTotal} uds. en stock`
                  : ""}
              </p>
            </div>
            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition"
            >
              Aceptar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
