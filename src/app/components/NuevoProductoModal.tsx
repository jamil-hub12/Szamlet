import { useState, useRef, useEffect } from "react";
import {
  X,
  AlertCircle,
  Plus,
  CheckCircle2,
  Loader2,
  Package,
  TriangleAlert,
  ChevronRight,
  Trash2,
} from "lucide-react";

// ─── Constantes ───────────────────────────────────────────────────────────────

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

// ─── Tipos exportados ─────────────────────────────────────────────────────────

export type ColorStock = { color: string; stock: number };
export type TallaProducto = { talla: string; colores: ColorStock[] };

export type ProductoCatalogo = {
  id: string;
  codigo: string;
  modelo: string;
  tela: string;
  disenio: string;
  tallas: TallaProducto[];
  fechaRegistro: string;
};

// ─── Tipos internos ───────────────────────────────────────────────────────────

type VarianteForm = {
  uid: string;
  tela: string;
  disenio: string;
  tallasSeleccionadas: string[];
  detallesTallas: Record<string, ColorStock[]>;
};

type ProductoForm = {
  modelo: string;
  variantes: VarianteForm[];
};

type Step = "form" | "confirmacion" | "guardando" | "exito";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function uid() {
  return `${Date.now()}-${Math.random()}`;
}

function nextProductoCode(lista: { id: string }[]) {
  const max = lista.reduce((m, p) => {
    const n = parseInt(p.id.replace("PROD-", ""), 10);
    return isNaN(n) ? m : Math.max(m, n);
  }, 0);
  return `PROD-${String(max + 1).padStart(4, "0")}`;
}

function stockVariante(v: VarianteForm) {
  return Object.values(v.detallesTallas)
    .flat()
    .reduce((s, cs) => s + cs.stock, 0);
}

function emptyVariante(): VarianteForm {
  return {
    uid: uid(),
    tela: "",
    disenio: "",
    tallasSeleccionadas: [],
    detallesTallas: {},
  };
}

// ─── EditableSelect ───────────────────────────────────────────────────────────

function EditableSelect({
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
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (adding) ref.current?.focus();
  }, [adding]);

  const confirm = () => {
    const v = draft.trim();
    if (v) onChange(v);
    setAdding(false);
    setDraft("");
  };

  if (adding)
    return (
      <div className="flex gap-1.5">
        <input
          ref={ref}
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              confirm();
            }
            if (e.key === "Escape") {
              setAdding(false);
              setDraft("");
            }
          }}
          placeholder="Escribir nombre…"
          className="flex-1 px-3 py-2 rounded-lg bg-input-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20"
        />
        <button
          type="button"
          onClick={confirm}
          className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition"
        >
          OK
        </button>
        <button
          type="button"
          onClick={() => {
            setAdding(false);
            setDraft("");
          }}
          className="p-2 rounded-lg border border-border text-muted-foreground hover:bg-accent transition"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );

  return (
    <select
      value={value}
      onChange={(e) =>
        e.target.value === "__nuevo__"
          ? setAdding(true)
          : onChange(e.target.value)
      }
      disabled={disabled}
      className={`w-full px-3 py-2 rounded-lg bg-input-background border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20 disabled:opacity-50 disabled:cursor-not-allowed ${hasError ? "border-red-400" : "border-border"}`}
    >
      <option value="">{placeholder}</option>
      {/* Si el valor actual es personalizado (no está en options), mostrarlo como opción */}
      {value && !options.includes(value) && (
        <option value={value}>{value}</option>
      )}
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
      <option value="__nuevo__">＋ Agregar nuevo…</option>
    </select>
  );
}

// ─── TallaCard ────────────────────────────────────────────────────────────────

function TallaCard({
  talla,
  colores,
  showErrors,
  onChange,
}: {
  talla: string;
  colores: ColorStock[];
  showErrors: boolean;
  onChange: (cols: ColorStock[]) => void;
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

  const errSinColores = showErrors && colores.length === 0;
  const errStockCero = showErrors && colores.some((cs) => cs.stock <= 0);

  return (
    <div
      className={`border rounded-xl overflow-hidden ${errSinColores || errStockCero ? "border-red-300" : esXL ? "border-amber-200" : esPersonalizada ? "border-violet-200" : "border-border"}`}
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
          {colores.reduce((s, cs) => s + cs.stock, 0)} uds. en stock
        </span>
      </div>
      <div className="p-3 space-y-3">
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
        {errSinColores && (
          <p className="text-xs text-red-500 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> Selecciona al menos un color.
          </p>
        )}
        {colores.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {colores.map((cs) => {
              const si = showErrors && cs.stock <= 0;
              return (
                <div
                  key={cs.color}
                  className={`rounded-lg px-2.5 py-1.5 space-y-1 ${COLORES_BASE.includes(cs.color) ? "bg-muted/40" : "bg-violet-50 border border-violet-200"} ${si ? "border border-red-300" : ""}`}
                >
                  <span className="text-xs text-foreground block truncate">
                    {cs.color}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min={1}
                      value={cs.stock}
                      onChange={(e) => setStock(cs.color, e.target.value)}
                      className={`w-full px-2 py-0.5 text-xs text-center rounded bg-background border focus:outline-none ${si ? "border-red-400" : "border-border"}`}
                    />
                    <span className="text-xs text-muted-foreground shrink-0">
                      ud.
                    </span>
                  </div>
                  {si && <p className="text-xs text-red-500">Stock inválido</p>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── VarianteCard ─────────────────────────────────────────────────────────────

function VarianteCard({
  variante,
  index,
  modelo,
  onChange,
  onRemove,
  canRemove,
  showErrors,
  productosExistentes,
}: {
  variante: VarianteForm;
  index: number;
  modelo: string;
  onChange: (v: VarianteForm) => void;
  onRemove: () => void;
  canRemove: boolean;
  showErrors: boolean;
  productosExistentes: ProductoCatalogo[];
}) {
  const [addingTalla, setAddingTalla] = useState(false);
  const [nuevaTalla, setNuevaTalla] = useState("");
  const tallaRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (addingTalla) tallaRef.current?.focus();
  }, [addingTalla]);

  // Opciones de tela y diseño derivadas del catálogo registrado
  // Solo telas del modelo seleccionado (sugerencias del catálogo)
  const telasEnCatalogo = modelo
    ? [
        ...new Set(
          productosExistentes
            .filter((p) => p.modelo === modelo)
            .map((p) => p.tela),
        ),
      ]
    : [];
  // Solo diseños del modelo+tela seleccionados
  const diseniosParaTela =
    modelo && variante.tela
      ? [
          ...new Set(
            productosExistentes
              .filter((p) => p.modelo === modelo && p.tela === variante.tela)
              .map((p) => p.disenio),
          ),
        ]
      : [];

  // Verificar duplicado: mismo modelo+tela+diseño ya registrado
  const esDuplicado =
    !!modelo &&
    !!variante.tela &&
    !!variante.disenio &&
    productosExistentes.some(
      (p) =>
        p.modelo === modelo &&
        p.tela === variante.tela &&
        p.disenio === variante.disenio,
    );

  const tallasPersonalizadas = variante.tallasSeleccionadas.filter(
    (t) => !TALLAS_BASE.includes(t),
  );
  const tallasDisp = [...TALLAS_BASE, ...tallasPersonalizadas];

  const setTela = (v: string) =>
    onChange({
      ...variante,
      tela: v,
      disenio: "",
      tallasSeleccionadas: [],
      detallesTallas: {},
    });
  const setDisenio = (v: string) =>
    onChange({
      ...variante,
      disenio: v,
      tallasSeleccionadas: [],
      detallesTallas: {},
    });

  const toggleTalla = (t: string) => {
    const on = variante.tallasSeleccionadas.includes(t);
    const next = on
      ? variante.tallasSeleccionadas.filter((x) => x !== t)
      : [...variante.tallasSeleccionadas, t];
    const det = { ...variante.detallesTallas };
    if (on) delete det[t];
    else det[t] = [];
    onChange({ ...variante, tallasSeleccionadas: next, detallesTallas: det });
  };

  const confirmarNuevaTalla = () => {
    const t = nuevaTalla.trim().toUpperCase();
    if (t && !variante.tallasSeleccionadas.includes(t)) {
      onChange({
        ...variante,
        tallasSeleccionadas: [...variante.tallasSeleccionadas, t],
        detallesTallas: { ...variante.detallesTallas, [t]: [] },
      });
    }
    setAddingTalla(false);
    setNuevaTalla("");
  };

  const errTela = showErrors && !variante.tela;
  const errDisenio = showErrors && !!variante.tela && !variante.disenio;
  const errTallas =
    showErrors &&
    !!variante.disenio &&
    variante.tallasSeleccionadas.length === 0;
  const mostrarTallas = !!variante.tela && !!variante.disenio && !esDuplicado;

  return (
    <div
      className={`border rounded-xl overflow-hidden ${esDuplicado ? "border-red-300" : showErrors && (errTela || errTallas) ? "border-red-300" : "border-border"}`}
    >
      {/* Cabecera */}
      <div className="flex items-center justify-between px-4 py-3 bg-muted/40 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            Variante #{index + 1}
          </span>
          {variante.tela && variante.disenio && !esDuplicado && (
            <span className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
              {stockVariante(variante)} uds.
            </span>
          )}
          {esDuplicado && (
            <span className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-full px-2 py-0.5 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> Combinación ya registrada
            </span>
          )}
        </div>
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="p-1.5 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500 transition"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="p-4 space-y-4">
        {/* Tela + Diseño */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-sm text-foreground flex items-center gap-1">
              Tipo de tela <span className="text-red-500">*</span>
            </label>
            <EditableSelect
              value={variante.tela}
              options={telasEnCatalogo}
              placeholder="Seleccionar o agregar"
              onChange={setTela}
              hasError={errTela}
            />
            {errTela && <p className="text-xs text-red-500">Obligatorio</p>}
          </div>
          <div className="space-y-1.5">
            <label className="text-sm text-foreground flex items-center gap-1">
              Diseño <span className="text-red-500">*</span>
            </label>
            <EditableSelect
              value={variante.disenio}
              options={diseniosParaTela}
              placeholder="Seleccionar o agregar"
              onChange={setDisenio}
              disabled={!variante.tela}
              hasError={errDisenio}
            />
            {errDisenio && <p className="text-xs text-red-500">Obligatorio</p>}
          </div>
        </div>

        {/* Duplicado warning */}
        {esDuplicado && (
          <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
            <TriangleAlert className="w-4 h-4 shrink-0 mt-0.5" />
            <p>
              Ya existe un producto{" "}
              <strong>
                {modelo} · {variante.tela} · {variante.disenio}
              </strong>
              . Elige una tela o diseño diferente, o usa "Editar" para modificar
              el stock existente.
            </p>
          </div>
        )}

        {/* Tallas */}
        {mostrarTallas && (
          <div className="space-y-2">
            <p className="text-sm text-foreground flex items-center gap-1">
              Tallas disponibles <span className="text-red-500">*</span>
            </p>
            <div className="flex flex-wrap gap-2 items-center">
              {tallasDisp.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => toggleTalla(t)}
                  className={`min-w-[44px] px-3 py-1.5 rounded-lg text-sm border transition ${
                    variante.tallasSeleccionadas.includes(t)
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
            {errTallas && (
              <p className="text-xs text-red-500">
                Selecciona al menos una talla.
              </p>
            )}
          </div>
        )}

        {/* Detalle por talla */}
        {mostrarTallas && variante.tallasSeleccionadas.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">
              Colores y stock por talla
            </p>
            {variante.tallasSeleccionadas.map((t) => (
              <TallaCard
                key={t}
                talla={t}
                colores={variante.detallesTallas[t] ?? []}
                showErrors={showErrors}
                onChange={(cols) =>
                  onChange({
                    ...variante,
                    detallesTallas: { ...variante.detallesTallas, [t]: cols },
                  })
                }
              />
            ))}
          </div>
        )}

        {/* Mini resumen */}
        {mostrarTallas &&
          variante.tallasSeleccionadas.length > 0 &&
          stockVariante(variante) > 0 && (
            <div className="flex justify-between items-center px-3 py-2 rounded-lg bg-muted/40 text-xs text-muted-foreground">
              <span>
                {variante.tallasSeleccionadas.length} talla
                {variante.tallasSeleccionadas.length !== 1 ? "s" : ""}
              </span>
              <span className="text-foreground">
                {stockVariante(variante)} unidades en esta variante
              </span>
            </div>
          )}
      </div>
    </div>
  );
}

// ─── Modal principal ──────────────────────────────────────────────────────────

export function NuevoProductoModal({
  onClose,
  productosExistentes,
  onGuardar,
}: {
  onClose: () => void;
  productosExistentes: ProductoCatalogo[];
  onGuardar: (ps: ProductoCatalogo[]) => Promise<void>;
}) {
  const [step, setStep] = useState<Step>("form");
  const [showErrors, setShowErrors] = useState(false);
  const [codigosCreados, setCodigos] = useState<string[]>([]);

  const modelosEnCatalogo = [
    ...new Set(productosExistentes.map((p) => p.modelo)),
  ];

  const [form, setForm] = useState<ProductoForm>({
    modelo: "",
    variantes: [emptyVariante()],
  });

  const setModelo = (v: string) => setForm((f) => ({ ...f, modelo: v }));

  const updateVariante = (uid: string, upd: VarianteForm) =>
    setForm((f) => ({
      ...f,
      variantes: f.variantes.map((v) => (v.uid === uid ? upd : v)),
    }));

  const removeVariante = (uid: string) =>
    setForm((f) => ({
      ...f,
      variantes: f.variantes.filter((v) => v.uid !== uid),
    }));

  const addVariante = () =>
    setForm((f) => ({ ...f, variantes: [...f.variantes, emptyVariante()] }));

  // Validación
  const validate = (): boolean => {
    if (!form.modelo) return false;
    for (const v of form.variantes) {
      if (!v.tela || !v.disenio) return false;
      const dup = productosExistentes.some(
        (p) =>
          p.modelo === form.modelo &&
          p.tela === v.tela &&
          p.disenio === v.disenio,
      );
      if (dup) return false;
      if (v.tallasSeleccionadas.length === 0) return false;
      for (const t of v.tallasSeleccionadas) {
        const cols = v.detallesTallas[t] ?? [];
        if (cols.length === 0 || cols.some((cs) => cs.stock <= 0)) return false;
      }
    }
    return true;
  };

  const handleGuardar = () => {
    setShowErrors(true);
    if (!validate()) return;
    setStep("confirmacion");
  };

  const handleConfirmarFinal = async () => {
    setStep("guardando");
    try {
      const hoy = new Date().toISOString().split("T")[0];
      let acum = [...productosExistentes];
      const nuevos: ProductoCatalogo[] = form.variantes.map((v) => {
        const codigo = nextProductoCode(acum);
        const hoy = new Date().toISOString().split("T")[0];
        const nuevo: ProductoCatalogo = {
          id: codigo,
          codigo,
          modelo: form.modelo,
          tela: v.tela,
          disenio: v.disenio,
          tallas: v.tallasSeleccionadas.map((t) => ({
            talla: t,
            colores: v.detallesTallas[t] ?? [],
          })),
          fechaRegistro: hoy,
        };
        acum = [...acum, nuevo];
        return nuevo;
      });
      setCodigos(nuevos.map((n) => n.id));
      await onGuardar(nuevos);
      setStep("exito");
    } catch (error) {
      console.error("Error al guardar productos:", error);
      setStep("form");
    }
  };

  const totalUnidades = form.variantes.reduce(
    (s, v) => s + stockVariante(v),
    0,
  );
  const errModelo = showErrors && !form.modelo;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={step === "form" ? onClose : undefined}
      />

      <div className="relative z-10 bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[92vh]">
        {/* ── FORMULARIO ── */}
        {step === "form" && (
          <>
            <div className="flex items-center justify-between px-6 py-5 border-b border-border shrink-0">
              <div>
                <h3 className="text-foreground">Agregar producto</h3>
                <p className="text-muted-foreground text-sm mt-0.5">
                  Registra el modelo con sus telas, diseños y stock
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
              {/* 1. Modelo */}
              <section className="space-y-3">
                <h4 className="text-foreground flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-foreground text-background text-xs flex items-center justify-center shrink-0">
                    1
                  </span>
                  Modelo
                </h4>
                <div className="space-y-1.5">
                  <label className="text-sm text-foreground flex items-center gap-1">
                    Nombre del modelo <span className="text-red-500">*</span>
                  </label>
                  <EditableSelect
                    value={form.modelo}
                    options={modelosEnCatalogo}
                    placeholder="Ej. Vestido, Camisa, Pantalón…"
                    onChange={setModelo}
                    hasError={errModelo}
                  />
                  {errModelo && (
                    <p className="text-xs text-red-500">
                      El modelo es obligatorio.
                    </p>
                  )}
                </div>
              </section>

              <div className="border-t border-border" />

              {/* 2. Variantes de tela */}
              <section className="space-y-4">
                <h4 className="text-foreground flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-foreground text-background text-xs flex items-center justify-center shrink-0">
                    2
                  </span>
                  Telas y diseños
                  <span className="text-xs text-muted-foreground ml-1">
                    ({form.variantes.length} variante
                    {form.variantes.length !== 1 ? "s" : ""})
                  </span>
                </h4>

                <div className="space-y-4">
                  {form.variantes.map((v, i) => (
                    <VarianteCard
                      key={v.uid}
                      variante={v}
                      index={i}
                      modelo={form.modelo}
                      onChange={(upd) => updateVariante(v.uid, upd)}
                      onRemove={() => removeVariante(v.uid)}
                      canRemove={form.variantes.length > 1}
                      showErrors={showErrors}
                      productosExistentes={productosExistentes}
                    />
                  ))}
                </div>

                <button
                  type="button"
                  onClick={addVariante}
                  className="w-full py-2.5 rounded-xl border-2 border-dashed border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground transition text-sm flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Agregar otra tela / diseño
                </button>
              </section>

              {/* Resumen total */}
              {totalUnidades > 0 && (
                <div className="rounded-xl bg-muted/40 border border-border px-4 py-3 flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">
                    Total a registrar
                  </span>
                  <span className="text-foreground">
                    {form.variantes.filter((v) => v.tela && v.disenio).length}{" "}
                    variante
                    {form.variantes.filter((v) => v.tela && v.disenio)
                      .length !== 1
                      ? "s"
                      : ""}{" "}
                    · <strong>{totalUnidades} unidades</strong>
                  </span>
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
                className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition flex items-center gap-2"
              >
                Verificar y continuar <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </>
        )}

        {/* ── CONFIRMACIÓN ── */}
        {step === "confirmacion" && (
          <>
            <div className="flex items-center justify-between px-6 py-5 border-b border-border shrink-0">
              <div>
                <h3 className="text-foreground">Confirmar producto</h3>
                <p className="text-muted-foreground text-sm mt-0.5">
                  Revisa los datos antes de guardar
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
              {/* Modelo */}
              <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-foreground text-background flex items-center justify-center shrink-0">
                  <Package className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Modelo</p>
                  <p className="text-foreground">{form.modelo}</p>
                </div>
              </div>

              {/* Variantes */}
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">
                  Variantes a registrar ({form.variantes.length})
                </p>
                {form.variantes.map((v, i) => {
                  const st = stockVariante(v);
                  return (
                    <div
                      key={v.uid}
                      className="rounded-xl border border-border px-4 py-3 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-foreground">
                          {i + 1}. {v.tela} · {v.disenio}
                        </p>
                        <span className="text-xs text-muted-foreground">
                          {st} uds.
                        </span>
                      </div>
                      <div className="space-y-1">
                        {v.tallasSeleccionadas.map((t) => {
                          const cols = v.detallesTallas[t] ?? [];
                          return (
                            <div
                              key={t}
                              className="text-xs text-muted-foreground flex justify-between"
                            >
                              <span>
                                Talla {t}:{" "}
                                {cols
                                  .map((cs) => `${cs.color} ×${cs.stock}`)
                                  .join(", ")}
                              </span>
                              <span>
                                {cols.reduce((s, cs) => s + cs.stock, 0)} uds.
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between px-5 py-3 rounded-xl bg-foreground text-background">
                <span className="text-sm opacity-70">
                  Stock total a ingresar
                </span>
                <span className="text-xl">{totalUnidades} unidades</span>
              </div>

              <div className="flex gap-3 pb-2">
                <button
                  onClick={() => setStep("form")}
                  className="flex-1 py-2.5 rounded-lg border border-border text-foreground text-sm hover:bg-accent transition"
                >
                  Editar
                </button>
                <button
                  onClick={handleConfirmarFinal}
                  className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition"
                >
                  Confirmar y guardar
                </button>
              </div>
            </div>
          </>
        )}

        {/* ── GUARDANDO ── */}
        {step === "guardando" && (
          <div className="flex-1 flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-10 h-10 text-muted-foreground animate-spin" />
            <p className="text-muted-foreground text-sm">
              Guardando producto en el inventario…
            </p>
          </div>
        )}

        {/* ── ÉXITO ── */}
        {step === "exito" && (
          <div className="px-6 py-10 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-foreground">Producto registrado</h3>
              <p className="text-muted-foreground text-sm mt-1">
                {codigosCreados.length} variante
                {codigosCreados.length !== 1 ? "s" : ""} guardada
                {codigosCreados.length !== 1 ? "s" : ""} exitosamente.
              </p>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-4 space-y-1.5">
              <p className="text-sm text-emerald-800">{form.modelo}</p>
              {codigosCreados.map((c, i) => (
                <p key={c} className="text-xs font-mono text-emerald-700">
                  {i + 1}. {form.variantes[i]?.tela} ·{" "}
                  {form.variantes[i]?.disenio} — <strong>{c}</strong>
                </p>
              ))}
              <p className="text-xs text-emerald-600">
                {totalUnidades} unidades registradas en inventario.
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
