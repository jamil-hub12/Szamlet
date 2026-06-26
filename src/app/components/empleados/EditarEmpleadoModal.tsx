import { useState } from "react";
import { X, User, Mail, Phone, Briefcase, Loader2 } from "lucide-react";
import type { Empleado } from "../../contexts/EmpleadosContext";
import { esEmailConProveedorPermitido, esNombreValido, puedeEditarPropioRol } from "../../utils/validaciones";

export function EditarEmpleadoModal({
  empleado,
  emailUsuarioActual,
  onClose,
  onGuardar,
}: {
  empleado: Empleado;
  emailUsuarioActual: string;
  onClose: () => void;
  onGuardar: (empleado: Empleado) => Promise<void>;
}) {
  const [form, setForm] = useState({
    nombre: empleado.nombre,
    email: empleado.email,
    telefono: empleado.telefono,
    rol: empleado.rol,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState(false);

  const rolesDisponibles = [
    "Atención al cliente",
    "Administrador",
    "Producción",
  ];

  const puedeEditarRol = puedeEditarPropioRol(
    empleado.email,
    emailUsuarioActual,
  );

  const handleChange = (field: keyof typeof form, value: string) => {
    let finalValue = value;

    // Nombre: solo letras, espacios, tildes y ñ
    if (field === "nombre") {
      finalValue = value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚüÜñÑ\s]/g, "");
    }

    // Email: solo letras, números, @, . y -
    if (field === "email") {
      finalValue = value.replace(/[^a-zA-Z0-9@.\-]/g, "").toLowerCase();
    }

    // Teléfono: solo números, máximo 9 dígitos
    if (field === "telefono") {
      finalValue = value.replace(/[^0-9]/g, "").slice(0, 9);
    }

    setForm((f) => ({ ...f, [field]: finalValue }));
    if (errors[field])
      setErrors((e) => {
        const next = { ...e };
        delete next[field];
        return next;
      });
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    if (!form.nombre.trim()) {
      errs.nombre = "El nombre es obligatorio.";
    } else if (!esNombreValido(form.nombre)) {
      errs.nombre = "El nombre solo puede contener letras y espacios.";
    }

    if (!form.email.trim()) {
      errs.email = "El correo es obligatorio.";
    } else if (!esEmailConProveedorPermitido(form.email)) {
      errs.email =
        "El correo debe ser @gmail.com, @hotmail.com o @outlook.com.";
    }

    if (!form.telefono.trim()) {
      errs.telefono = "El teléfono es obligatorio.";
    } else if (!/^9\d{8}$/.test(form.telefono)) {
      errs.telefono = "Número inválido (9 dígitos, comienza en 9).";
    }

    if (!form.rol) {
      errs.rol = "Selecciona un rol.";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleGuardar = async () => {
    if (!validate()) return;
    setGuardando(true);
    try {
      const rolFinal = puedeEditarRol ? form.rol : empleado.rol;
      await onGuardar({ ...empleado, ...form, rol: rolFinal });
    } catch (error) {
      console.error("Error al guardar:", error);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <div>
            <h3 className="text-foreground">Editar empleado</h3>
            <p className="text-muted-foreground text-sm mt-0.5">
              <span className="font-mono text-xs">{empleado.id}</span>
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
          {/* Nombre */}
          <div className="space-y-1.5">
            <label className="text-sm text-foreground">Nombre completo</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={form.nombre}
                onChange={(e) => handleChange("nombre", e.target.value)}
                className={`w-full pl-9 pr-4 py-2.5 rounded-lg bg-input-background border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20 transition ${
                  errors.nombre ? "border-red-400" : "border-border"
                }`}
              />
            </div>
            {errors.nombre && (
              <p className="text-xs text-red-500">{errors.nombre}</p>
            )}
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <label className="text-sm text-foreground">
              Correo electrónico
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="email"
                value={form.email}
                onChange={(e) => handleChange("email", e.target.value)}
                className={`w-full pl-9 pr-4 py-2.5 rounded-lg bg-input-background border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20 transition ${
                  errors.email ? "border-red-400" : "border-border"
                }`}
              />
            </div>
            {errors.email && (
              <p className="text-xs text-red-500">{errors.email}</p>
            )}
          </div>

          {/* Teléfono */}
          <div className="space-y-1.5">
            <label className="text-sm text-foreground">Teléfono</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={form.telefono}
                onChange={(e) => handleChange("telefono", e.target.value)}
                className={`w-full pl-9 pr-4 py-2.5 rounded-lg bg-input-background border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20 transition ${
                  errors.telefono ? "border-red-400" : "border-border"
                }`}
              />
            </div>
            {errors.telefono && (
              <p className="text-xs text-red-500">{errors.telefono}</p>
            )}
          </div>

          {/* Rol */}
          <div className="space-y-1.5">
            <label className="text-sm text-foreground">Rol</label>
            <div className="relative">
              <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <select
                value={form.rol}
                disabled={!puedeEditarRol}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    rol: e.target.value as typeof form.rol,
                  }))
                }
                className={`w-full pl-9 pr-4 py-2.5 rounded-lg bg-input-background border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20 transition disabled:opacity-60 disabled:cursor-not-allowed ${
                  errors.rol ? "border-red-400" : "border-border"
                }`}
              >
                {rolesDisponibles.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            {!puedeEditarRol && (
              <p className="text-xs text-muted-foreground">
                No puedes cambiar tu propio rol de Administrador.
              </p>
            )}
            {errors.rol && <p className="text-xs text-red-500">{errors.rol}</p>}
          </div>
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
            disabled={guardando}
            className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition flex items-center gap-2 disabled:opacity-60"
          >
            {guardando && <Loader2 className="w-4 h-4 animate-spin" />}
            Guardar cambios
          </button>
        </div>
      </div>
    </div>
  );
}
