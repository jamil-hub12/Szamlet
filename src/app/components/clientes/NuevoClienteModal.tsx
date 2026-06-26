import { useState } from "react";
import {
  AlertCircle,
  CheckCircle,
  CreditCard,
  Loader2,
  Mail,
  MapPin,
  Phone,
  User,
  Users,
  X,
} from "lucide-react";
import { obtenerFechaPeruHoy } from "../../utils/fechas";
import type { Cliente } from "../../contexts/ClientesContext";
import {
  esNombreValido,
  esTelefonoValido,
  soloNumeros,
  esDNIValido,
  esEmailConProveedorPermitido,
  esDireccionValida,
  esRUCValido,
  normalizarTexto,
  detectarClienteDuplicado,
} from "../../utils/validaciones";

type FormData = {
  nombre: string;
  email: string;
  celular: string;
  direccion: string;
  dni: string;
  ruc: string;
};

type FormErrors = Partial<Record<keyof FormData, string>>;

const emptyForm: FormData = {
  nombre: "",
  email: "",
  celular: "",
  direccion: "",
  dni: "",
  ruc: "",
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function generateClienteId(lista: Cliente[]) {
  const max = lista.reduce((acc, c) => {
    const n = parseInt(c.id.replace("CLI-", ""), 10);
    return n > acc ? n : acc;
  }, 0);
  return `CLI-${String(max + 1).padStart(4, "0")}`;
}

function validateForm(data: FormData): FormErrors {
  const errors: FormErrors = {};

  // Validar nombre: solo letras y espacios
  if (!data.nombre.trim()) {
    errors.nombre = "El nombre es obligatorio.";
  } else if (!esNombreValido(data.nombre)) {
    errors.nombre = "El nombre solo puede contener letras y espacios.";
  }

  // Validar celular
  if (!data.celular.trim()) {
    errors.celular = "El celular es obligatorio.";
  } else if (!esTelefonoValido(data.celular.replace(/\s/g, ""))) {
    errors.celular = "Número inválido (9 dígitos, empieza en 9).";
  }

  // Validar DNI: solo números y exactamente 8 dígitos
  if (!data.dni.trim()) {
    errors.dni = "El DNI es obligatorio.";
  } else if (!soloNumeros(data.dni)) {
    errors.dni = "El DNI solo puede contener números.";
  } else if (!esDNIValido(data.dni.trim())) {
    errors.dni = "El DNI debe tener exactamente 8 dígitos.";
  }

  // Validar email con proveedores permitidos
  if (data.email.trim()) {
    if (!esEmailConProveedorPermitido(data.email)) {
      errors.email =
        "El correo debe ser de @gmail.com, @outlook.com o @hotmail.com";
    }
  }

  // Validar dirección
  if (data.direccion.trim() && !esDireccionValida(data.direccion)) {
    errors.direccion = "La dirección contiene caracteres no válidos.";
  }

  // Validar RUC: solo números
  if (data.ruc.trim()) {
    if (!soloNumeros(data.ruc)) {
      errors.ruc = "El RUC solo puede contener números.";
    } else if (!esRUCValido(data.ruc.trim())) {
      errors.ruc = "El RUC debe tener 11 dígitos y comenzar con 10 o 20.";
    }
  }

  return errors;
}

// ─── Modal de registro ──────────────────────────────────────────────────────

type ModalStep = "form" | "confirmacion" | "exito" | "guardando";

export function NuevoClienteModal({
  onClose,
  onGuardar,
  clientesExistentes,
}: {
  onClose: () => void;
  onGuardar: (c: Cliente) => Promise<void>;
  clientesExistentes: Cliente[];
}) {
  const [step, setStep] = useState<ModalStep>("form");
  const [form, setForm] = useState<FormData>(emptyForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const [guardando, setGuardando] = useState(false);
  const [nuevoCliente, setNuevoCliente] = useState<Cliente | null>(null);

  // Detección de duplicados en tiempo real solo para DNI y RUC
  const { dniDuplicado: dupDni, rucDuplicado: dupRuc } =
    detectarClienteDuplicado(clientesExistentes, form.dni, form.ruc);

  const handleChange = (field: keyof FormData, value: string) => {
    let finalValue = value;

    // Validar en tiempo real y filtrar caracteres no permitidos
    if (field === "nombre") {
      // Solo letras y espacios
      finalValue = value.replace(/[^a-zA-ZáéíóúñÁÉÍÓÚÑ\s]/g, "");
    } else if (field === "celular") {
      // Solo números, máximo 9 dígitos para Perú
      finalValue = value.replace(/\D/g, "").slice(0, 9);
    } else if (field === "dni") {
      // Solo números, máximo 8 dígitos
      finalValue = value.replace(/\D/g, "").slice(0, 8);
    } else if (field === "ruc") {
      // Solo números, máximo 11 dígitos
      finalValue = value.replace(/\D/g, "").slice(0, 11);
    } else if (field === "direccion") {
      // Solo caracteres válidos para direcciones
      finalValue = value.replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ\s\.,#\-\/]/g, "");
    } else if (field === "email") {
      // Convertir a minúsculas para validación
      finalValue = value.toLowerCase();
    }

    setForm((f) => ({ ...f, [field]: finalValue }));
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }));
  };

  const handleGuardar = () => {
    const errs = validateForm(form);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    if (dupDni || dupRuc) return; // bloqueado por duplicado en tiempo real

    setStep("confirmacion");
  };

  const handleConfirmar = async () => {
    setGuardando(true);
    try {
      const nuevo: Cliente = {
        id: generateClienteId(clientesExistentes),
        codigo: generateClienteId(clientesExistentes),
        nombre: normalizarTexto(form.nombre),
        email: form.email.trim() || null,
        celular: form.celular.trim(),
        direccion: form.direccion.trim() || null,
        dni: form.dni.trim(),
        ruc: form.ruc.trim() || null,
        fechaRegistro: obtenerFechaPeruHoy(),
      };
      setNuevoCliente(nuevo);
      await onGuardar(nuevo);
      setStep("exito");
    } catch (error) {
      console.error("Error al guardar cliente:", error);
    } finally {
      setGuardando(false);
    }
  };

  const field = (
    id: keyof FormData,
    label: string,
    placeholder: string,
    icon: React.ReactNode,
    required = true,
    type = "text",
  ) => (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="text-sm text-foreground flex items-center gap-1"
      >
        {label}
        {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          {icon}
        </span>
        <input
          id={id}
          type={type}
          placeholder={placeholder}
          value={form[id]}
          onChange={(e) => handleChange(id, e.target.value)}
          className={`w-full pl-9 pr-4 py-2.5 rounded-lg bg-input-background border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20 transition ${
            errors[id] ? "border-red-400 focus:ring-red-200" : "border-border"
          }`}
        />
      </div>
      {errors[id] && <p className="text-xs text-red-500">{errors[id]}</p>}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={step !== "guardando" ? onClose : undefined}
      />

      <div className="relative z-10 bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* ── Formulario ── */}
        {step === "form" && (
          <>
            <div className="flex items-center justify-between px-6 py-5 border-b border-border">
              <div>
                <h3 className="text-foreground">Nuevo cliente</h3>
                <p className="text-muted-foreground text-sm mt-0.5">
                  Completa los datos del cliente
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-accent transition"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4 max-h-[65vh] overflow-y-auto">
              {field(
                "nombre",
                "Nombre completo",
                "Ej. María Torres",
                <User className="w-4 h-4" />,
              )}
              {field(
                "celular",
                "Número de celular",
                "Ej. 987 654 321",
                <Phone className="w-4 h-4" />,
              )}
              {field(
                "email",
                "Correo electrónico",
                "Ej. cliente@email.com",
                <Mail className="w-4 h-4" />,
                false,
                "email",
              )}
              {field(
                "direccion",
                "Dirección",
                "Ej. Av. Arequipa 1234",
                <MapPin className="w-4 h-4" />,
                false,
              )}

              <div className="grid grid-cols-2 gap-4">
                {/* DNI */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="dni"
                    className="text-sm text-foreground flex items-center gap-1"
                  >
                    DNI <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      id="dni"
                      type="text"
                      placeholder="Ej. 12345678"
                      value={form.dni}
                      onChange={(e) => handleChange("dni", e.target.value)}
                      className={`w-full pl-9 pr-4 py-2.5 rounded-lg bg-input-background border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 transition ${
                        errors.dni
                          ? "border-red-400 focus:ring-red-200"
                          : dupDni
                            ? "border-red-400 focus:ring-red-200"
                            : "border-border focus:ring-foreground/20"
                      }`}
                    />
                  </div>
                  {errors.dni && (
                    <p className="text-xs text-red-500">{errors.dni}</p>
                  )}
                  {!errors.dni && dupDni && (
                    <div className="flex items-start gap-1.5 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-2.5 py-1.5">
                      <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
                      <span>
                        DNI ya registrado: <strong>{dupDni.nombre}</strong> (
                        {dupDni.id})
                      </span>
                    </div>
                  )}
                </div>

                {/* RUC */}
                <div className="space-y-1.5">
                  <label htmlFor="ruc" className="text-sm text-foreground">
                    RUC
                  </label>
                  <div className="relative">
                    <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      id="ruc"
                      type="text"
                      placeholder="Ej. 20123456789"
                      value={form.ruc}
                      onChange={(e) => handleChange("ruc", e.target.value)}
                      className={`w-full pl-9 pr-4 py-2.5 rounded-lg bg-input-background border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 transition ${
                        errors.ruc
                          ? "border-red-400 focus:ring-red-200"
                          : dupRuc
                            ? "border-red-400 focus:ring-red-200"
                            : "border-border focus:ring-foreground/20"
                      }`}
                    />
                  </div>
                  {errors.ruc && (
                    <p className="text-xs text-red-500">{errors.ruc}</p>
                  )}
                  {!errors.ruc && dupRuc && (
                    <div className="flex items-start gap-1.5 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-2.5 py-1.5">
                      <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
                      <span>
                        RUC ya registrado: <strong>{dupRuc.nombre}</strong> (
                        {dupRuc.id})
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <p className="text-xs text-muted-foreground pt-1">
                Los campos marcados con <span className="text-red-500">*</span>{" "}
                son obligatorios.
              </p>
            </div>

            <div className="px-6 py-4 border-t border-border flex gap-3 justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg border border-border text-foreground text-sm hover:bg-accent transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleGuardar}
                className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition"
              >
                Guardar
              </button>
            </div>
          </>
        )}

        {/* ── Confirmación ── */}
        {step === "confirmacion" && (
          <div className="px-6 py-8 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center mx-auto">
              <Users className="w-7 h-7 text-blue-600" />
            </div>
            <div>
              <h3 className="text-foreground">¿Confirmar registro?</h3>
              <p className="text-muted-foreground text-sm mt-1">
                Revisá los datos antes de guardar.
              </p>
            </div>
            <div className="bg-muted rounded-xl px-5 py-4 text-left space-y-2 text-sm">
              {(
                [
                  ["Nombre", form.nombre],
                  ["Celular", form.celular],
                  ["DNI", form.dni],
                  ...(form.email ? [["Correo", form.email]] : []),
                  ...(form.direccion ? [["Dirección", form.direccion]] : []),
                  ...(form.ruc ? [["RUC", form.ruc]] : []),
                ] as [string, string][]
              ).map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4">
                  <span className="text-muted-foreground shrink-0">
                    {label}
                  </span>
                  <span className="text-foreground text-right">{value}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-3 justify-center pt-2">
              <button
                onClick={() => setStep("form")}
                disabled={guardando}
                className="px-4 py-2 rounded-lg border border-border text-foreground text-sm hover:bg-accent transition disabled:opacity-50"
              >
                Editar
              </button>
              <button
                onClick={handleConfirmar}
                disabled={guardando}
                className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition flex items-center gap-2 disabled:opacity-60"
              >
                {guardando && <Loader2 className="w-4 h-4 animate-spin" />}
                Guardar cliente
              </button>
            </div>
          </div>
        )}

        {/* ── Éxito ── */}
        {step === "exito" && nuevoCliente && (
          <div className="px-6 py-8 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
              <CheckCircle className="w-7 h-7 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-foreground">Cliente registrado</h3>
              <p className="text-muted-foreground text-sm mt-1">
                El cliente fue guardado exitosamente en el sistema.
              </p>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-4 space-y-1">
              <p className="text-sm text-emerald-800">{nuevoCliente.nombre}</p>
              <p className="text-xs text-emerald-700 font-mono">
                Código asignado:{" "}
                <span className="font-semibold">{nuevoCliente.id}</span>
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
