import { useState } from "react";
import { X, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import type { ProductoCatalogo } from "../contexts/ProductosContext";

type Step = "form" | "confirmacion" | "guardando" | "exito";

export function AgregarStockModal({
  producto,
  onClose,
  onGuardar,
}: {
  producto: ProductoCatalogo;
  onClose: () => void;
  onGuardar: (colorIds: { id: string; stock: number }[]) => Promise<void>;
}) {
  const [step, setStep] = useState<Step>("form");
  const [showErrors, setShowErrors] = useState(false);

  // Construir mapa de colores con cantidad a AGREGAR (siempre inicia en 0)
  const [stockPorColor, setStockPorColor] = useState<Record<string, number>>(
    () => {
      const map: Record<string, number> = {};
      for (const talla of producto.tallas) {
        for (const color of talla.colores) {
          map[color.id] = 0;
        }
      }
      return map;
    },
  );

  const validate = (): boolean => {
    // Al menos uno debe tener stock > 0
    return Object.values(stockPorColor).some((s) => s > 0);
  };

  const handleGuardar = () => {
    setShowErrors(true);
    if (!validate()) return;
    setStep("confirmacion");
  };

  const handleConfirmarFinal = async () => {
    setStep("guardando");
    try {
      const cambios = Object.entries(stockPorColor)
        .map(([colorId, stock]) => ({ id: colorId, stock }))
        .filter((c) => c.stock > 0);

      await onGuardar(cambios);
      setStep("exito");
    } catch (error) {
      console.error("Error al guardar stock:", error);
      setStep("form");
    }
  };

  const totalStock = Object.values(stockPorColor).reduce((s, v) => s + v, 0);
  const err = showErrors && !validate();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={step === "form" ? onClose : undefined}
      />
      <div className="relative bg-background rounded-2xl shadow-2xl flex flex-col max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* ── FORM ── */}
        {step === "form" && (
          <>
            <div className="flex items-center justify-between px-6 py-5 border-b border-border shrink-0">
              <div>
                <h3 className="text-foreground">Agregar stock</h3>
                <p className="text-muted-foreground text-sm mt-0.5">
                  {producto.modelo} · {producto.tela} · {producto.disenio}
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
              {/* Tallas */}
              {producto.tallas.map((talla) => (
                <div key={talla.id} className="space-y-2">
                  <p className="text-sm font-medium text-foreground">
                    Talla {talla.talla}
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {talla.colores.map((color) => {
                      const stock = stockPorColor[color.id] ?? 0;
                      return (
                        <div
                          key={color.id}
                          className="space-y-1.5 rounded-lg border border-border bg-muted/30 p-3"
                        >
                          <label className="text-xs text-muted-foreground block">
                            {color.color}
                          </label>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min={0}
                              value={stock}
                              onChange={(e) =>
                                setStockPorColor((prev) => ({
                                  ...prev,
                                  [color.id]: Math.max(
                                    0,
                                    parseInt(e.target.value) || 0,
                                  ),
                                }))
                              }
                              className="flex-1 px-2 py-1.5 text-sm text-center rounded border border-border focus:outline-none focus:border-foreground"
                            />
                            <span className="text-xs text-muted-foreground">
                              ud.
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              {err && (
                <div className="flex items-start gap-2 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p>Debes ingresar stock para al menos un color.</p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between px-6 py-4 border-t border-border shrink-0">
              <div className="text-sm">
                <p className="text-muted-foreground">Total a registrar</p>
                <p className="text-xl font-semibold text-foreground">
                  {totalStock} ud.
                </p>
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
                  className="px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition"
                >
                  Siguiente
                </button>
              </div>
            </div>
          </>
        )}

        {/* ── CONFIRMACIÓN ── */}
        {step === "confirmacion" && (
          <>
            <div className="flex items-center justify-between px-6 py-5 border-b border-border shrink-0">
              <h3 className="text-foreground">Confirmar stock</h3>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-accent transition"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              {/* Resumen */}
              <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 space-y-2">
                <p className="text-sm text-foreground font-medium">
                  {producto.modelo}
                </p>
                <p className="text-xs text-muted-foreground">
                  {producto.tela} · {producto.disenio}
                </p>
              </div>

              {/* Detalle por talla */}
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">
                  Stock por talla
                </p>
                {producto.tallas.map((talla) => {
                  const tallaStock = talla.colores.reduce(
                    (s, c) => s + (stockPorColor[c.id] ?? 0),
                    0,
                  );
                  return (
                    <div
                      key={talla.id}
                      className="rounded-lg border border-border px-4 py-3 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-foreground">
                          Talla {talla.talla}
                        </p>
                        <span className="text-xs text-muted-foreground">
                          {tallaStock} ud.
                        </span>
                      </div>
                      <div className="space-y-1">
                        {talla.colores.map((color) => {
                          const stock = stockPorColor[color.id] ?? 0;
                          if (stock <= 0) return null;
                          return (
                            <div
                              key={color.id}
                              className="flex justify-between text-xs text-muted-foreground"
                            >
                              <span>{color.color}</span>
                              <span className="font-medium">{stock} ud.</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-foreground text-background">
                <span className="text-sm opacity-80">Total</span>
                <span className="text-lg font-semibold">{totalStock} ud.</span>
              </div>
            </div>

            <div className="flex gap-3 px-6 py-4 border-t border-border shrink-0">
              <button
                onClick={() => setStep("form")}
                className="flex-1 py-2.5 rounded-lg border border-border text-foreground text-sm hover:bg-accent transition"
              >
                Atrás
              </button>
              <button
                onClick={handleConfirmarFinal}
                className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition"
              >
                Confirmar y guardar
              </button>
            </div>
          </>
        )}

        {/* ── GUARDANDO ── */}
        {step === "guardando" && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 py-20">
            <Loader2 className="w-10 h-10 text-muted-foreground animate-spin" />
            <p className="text-muted-foreground text-sm">
              Actualizando inventario…
            </p>
          </div>
        )}

        {/* ── ÉXITO ── */}
        {step === "exito" && (
          <div className="px-6 py-10 text-center space-y-4 flex-1 flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-foreground">Stock actualizado</h3>
              <p className="text-muted-foreground text-sm mt-1">
                Se registró correctamente el stock en el inventario.
              </p>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-3 text-sm text-emerald-800 w-full">
              {totalStock} unidades agregadas
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
