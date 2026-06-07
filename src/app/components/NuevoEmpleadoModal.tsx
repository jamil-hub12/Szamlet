import { useState } from "react";
import {
  X,
  User,
  Mail,
  Phone,
  Briefcase,
  CheckCircle,
  Loader2,
  Eye,
  EyeOff,
  Lock,
} from "lucide-react";

type Empleado = {
  id: string;
  nombre: string;
  email: string;
  telefono: string;
  rol: "Atención al cliente" | "Administrador";
  fechaIngreso: string;
  estado: "Activo" | "Licencia" | "Inactivo";
};

type FormData = {
  nombre: string;
  email: string;
  telefono: string;
  rol: string;
  password: string;
  confirmPassword: string;
};

type FormErrors = Partial<Record<keyof FormData, string>>;

const rolesDisponibles = ["Atención al cliente", "Administrador"];

function validateForm(data: FormData): FormErrors {
  const errors: FormErrors = {};
  if (!data.nombre.trim()) errors.nombre = "El nombre es obligatorio.";
  if (!data.email.trim()) errors.email = "El correo es obligatorio.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email))
    errors.email = "Ingresa un correo válido.";
  if (!data.telefono.trim()) errors.telefono = "El teléfono es obligatorio.";
  else if (!/^9\d{8}$/.test(data.telefono.replace(/\s/g, "")))
    errors.telefono = "Número inválido (9 dígitos, empieza en 9).";
  if (!data.rol) errors.rol = "Selecciona un rol.";
  if (!data.password.trim()) errors.password = "La contraseña es obligatoria.";
  else if (data.password.length < 6) errors.password = "Mínimo 6 caracteres.";
  if (data.password !== data.confirmPassword)
    errors.confirmPassword = "Las contraseñas no coinciden.";
  return errors;
}

function generateEmpleadoId(empleados: Empleado[]): string {
  const max = empleados.reduce((acc, e) => {
    const n = parseInt(e.id.replace("EMP-", ""), 10);
    return n > acc ? n : acc;
  }, 0);
  return `EMP-${String(max + 1).padStart(4, "0")}`;
}

type ModalStep = "form" | "confirmacion" | "exito";

export function NuevoEmpleadoModal({
  onClose,
  onGuardar,
  empleadosExistentes,
}: {
  onClose: () => void;
  onGuardar: (empleado: Empleado, password: string) => Promise<void>;
  empleadosExistentes: Empleado[];
}) {
  const [step, setStep] = useState<ModalStep>("form");
  const [form, setForm] = useState<FormData>({
    nombre: "",
    email: "",
    telefono: "",
    rol: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [guardando, setGuardando] = useState(false);
  const [nuevoEmpleado, setNuevoEmpleado] = useState<Empleado | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = (field: keyof FormData, value: string | boolean) => {
    setForm((f) => ({ ...f, [field]: value }));
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }));
  };

  const handleGuardar = () => {
    const errs = validateForm(form);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setStep("confirmacion");
  };

  const handleConfirmar = async () => {
    setGuardando(true);
    try {
      const nuevo: Empleado = {
        id: generateEmpleadoId(empleadosExistentes),
        nombre: form.nombre.trim(),
        email: form.email.trim(),
        telefono: form.telefono.trim(),
        rol: form.rol,
        fechaIngreso: new Date().toISOString().split("T")[0],
        estado: "Activo",
      };
      setNuevoEmpleado(nuevo);
      await onGuardar(nuevo, form.password);
      setStep("exito");
    } catch (error) {
      console.error("Error al guardar empleado:", error);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={
          step !== "confirmacion" && step !== "exito" ? onClose : undefined
        }
      />

      <div className="relative z-10 bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        {step === "form" && (
          <>
            <div className="flex items-center justify-between px-6 py-5 border-b border-border">
              <div>
                <h3 className="text-foreground">Nuevo empleado</h3>
                <p className="text-muted-foreground text-sm mt-0.5">
                  Completa los datos del empleado
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
              <div className="space-y-1.5">
                <label
                  htmlFor="nombre"
                  className="text-sm text-foreground flex items-center gap-1"
                >
                  Nombre completo <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    id="nombre"
                    type="text"
                    placeholder="Ej. María González"
                    value={form.nombre}
                    onChange={(e) => handleChange("nombre", e.target.value)}
                    className={`w-full pl-9 pr-4 py-2.5 rounded-lg bg-input-background border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20 transition ${
                      errors.nombre
                        ? "border-red-400 focus:ring-red-200"
                        : "border-border"
                    }`}
                  />
                </div>
                {errors.nombre && (
                  <p className="text-xs text-red-500">{errors.nombre}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="email"
                  className="text-sm text-foreground flex items-center gap-1"
                >
                  Correo electrónico <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    id="email"
                    type="email"
                    placeholder="Ej. maria@szamlet.com"
                    value={form.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    className={`w-full pl-9 pr-4 py-2.5 rounded-lg bg-input-background border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20 transition ${
                      errors.email
                        ? "border-red-400 focus:ring-red-200"
                        : "border-border"
                    }`}
                  />
                </div>
                {errors.email && (
                  <p className="text-xs text-red-500">{errors.email}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="telefono"
                  className="text-sm text-foreground flex items-center gap-1"
                >
                  Teléfono <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    id="telefono"
                    type="text"
                    placeholder="Ej. 987 654 321"
                    value={form.telefono}
                    onChange={(e) => handleChange("telefono", e.target.value)}
                    className={`w-full pl-9 pr-4 py-2.5 rounded-lg bg-input-background border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20 transition ${
                      errors.telefono
                        ? "border-red-400 focus:ring-red-200"
                        : "border-border"
                    }`}
                  />
                </div>
                {errors.telefono && (
                  <p className="text-xs text-red-500">{errors.telefono}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="rol"
                  className="text-sm text-foreground flex items-center gap-1"
                >
                  Rol <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <select
                    id="rol"
                    value={form.rol}
                    onChange={(e) => handleChange("rol", e.target.value)}
                    className={`w-full pl-9 pr-4 py-2.5 rounded-lg bg-input-background border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20 transition ${
                      errors.rol
                        ? "border-red-400 focus:ring-red-200"
                        : "border-border"
                    }`}
                  >
                    <option value="">Selecciona un rol</option>
                    {rolesDisponibles.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
                {errors.rol && (
                  <p className="text-xs text-red-500">{errors.rol}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="password"
                  className="text-sm text-foreground flex items-center gap-1"
                >
                  Contraseña <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Mínimo 6 caracteres"
                    value={form.password}
                    onChange={(e) => handleChange("password", e.target.value)}
                    className={`w-full pl-9 pr-11 py-2.5 rounded-lg bg-input-background border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20 transition ${
                      errors.password
                        ? "border-red-400 focus:ring-red-200"
                        : "border-border"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-red-500">{errors.password}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="confirmPassword"
                  className="text-sm text-foreground flex items-center gap-1"
                >
                  Confirmar contraseña <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Repite la contraseña"
                    value={form.confirmPassword}
                    onChange={(e) =>
                      handleChange("confirmPassword", e.target.value)
                    }
                    className={`w-full pl-9 pr-11 py-2.5 rounded-lg bg-input-background border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20 transition ${
                      errors.confirmPassword
                        ? "border-red-400 focus:ring-red-200"
                        : "border-border"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-xs text-red-500">
                    {errors.confirmPassword}
                  </p>
                )}
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

        {step === "confirmacion" && (
          <div className="px-6 py-8 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center mx-auto">
              <User className="w-7 h-7 text-blue-600" />
            </div>
            <div>
              <h3 className="text-foreground">¿Confirmar registro?</h3>
              <p className="text-muted-foreground text-sm mt-1">
                Revisá los datos antes de guardar.
              </p>
            </div>
            <div className="bg-muted rounded-xl px-5 py-4 text-left space-y-2 text-sm">
              {[
                ["Nombre", form.nombre],
                ["Correo", form.email],
                ["Teléfono", form.telefono],
                ["Rol", form.rol],
              ].map(([label, value]) => (
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
                Guardar empleado
              </button>
            </div>
          </div>
        )}

        {step === "exito" && nuevoEmpleado && (
          <div className="px-6 py-8 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
              <CheckCircle className="w-7 h-7 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-foreground">Empleado registrado</h3>
              <p className="text-muted-foreground text-sm mt-1">
                El empleado fue guardado exitosamente en el sistema.
              </p>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-4 space-y-1">
              <p className="text-sm text-emerald-800">{nuevoEmpleado.nombre}</p>
              <p className="text-xs text-emerald-700 font-mono">
                Código asignado:{" "}
                <span className="font-semibold">{nuevoEmpleado.id}</span>
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
