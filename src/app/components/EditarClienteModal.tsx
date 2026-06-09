import { useState } from "react";
import { X, User, Mail, Phone, MapPin, AlertCircle } from "lucide-react";
import {
  esNombreValido,
  esEmailConProveedorPermitido,
  esDireccionValida,
} from "../utils/validaciones";

type Cliente = {
  id: string;
  codigo: string;
  nombre: string;
  email: string | null;
  celular: string;
  direccion: string | null;
  dni: string;
  ruc: string | null;
};

type ClienteActualizado = {
  codigo: string;
  nombre: string;
  email: string | null;
  celular: string;
  direccion: string | null;
};

export function EditarClienteModal({
  cliente,
  onClose,
  onGuardar,
  clientesExistentes = [],
}: {
  cliente: Cliente;
  onClose: () => void;
  onGuardar: (actualizado: ClienteActualizado) => Promise<void>;
  clientesExistentes?: Cliente[];
}) {
  const [form, setForm] = useState({
    nombre: cliente.nombre,
    email: cliente.email || "",
    celular: cliente.celular,
    direccion: cliente.direccion || "",
  });

  const [showErrors, setShowErrors] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [errorEmail, setErrorEmail] = useState<string>("");

  // Verificar duplicado de email (excluyendo el cliente actual)
  const emailTrim = form.email.trim().toLowerCase();
  const emailDuplicado =
    emailTrim.length > 0
      ? clientesExistentes.find(
          (c) =>
            c.id !== cliente.id &&
            c.email &&
            c.email.toLowerCase() === emailTrim,
        )
      : undefined;

  const validate = () => {
    if (!form.nombre.trim()) return false;
    if (!esNombreValido(form.nombre)) {
      setErrorEmail("El nombre solo puede contener letras y espacios.");
      return false;
    }
    if (!form.celular.trim()) return false;
    if (!/^9\d{8}$/.test(form.celular.replace(/\s/g, ""))) {
      setErrorEmail("Número inválido (9 dígitos, empieza en 9).");
      return false;
    }
    if (form.email.trim() && !esEmailConProveedorPermitido(form.email)) {
      setErrorEmail(
        "El correo debe ser de @gmail.com, @outlook.com o @hotmail.com",
      );
      return false;
    }
    if (form.direccion.trim() && !esDireccionValida(form.direccion)) {
      setErrorEmail("La dirección contiene caracteres no válidos.");
      return false;
    }
    if (emailDuplicado) {
      setErrorEmail("Este email ya está registrado para otro cliente");
      return false;
    }
    return true;
  };

  const handleGuardar = async () => {
    setShowErrors(true);
    if (!validate()) return;

    setGuardando(true);
    try {
      await onGuardar({
        codigo: cliente.codigo,
        nombre: form.nombre.trim(),
        email: form.email.trim() || null,
        celular: form.celular.trim(),
        direccion: form.direccion.trim() || null,
      });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={guardando ? undefined : onClose}
      />

      <div className="relative z-10 bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <div>
            <h3 className="text-foreground">Editar cliente</h3>
            <p className="text-sm text-muted-foreground">{cliente.codigo}</p>
          </div>
          <button
            onClick={onClose}
            disabled={guardando}
            className="p-1.5 rounded-lg hover:bg-accent transition disabled:opacity-50"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Form */}
        <div className="px-6 py-5 space-y-4">
          {/* Nombre */}
          <div className="space-y-1.5">
            <label
              htmlFor="nombre"
              className="text-sm text-foreground flex items-center gap-1"
            >
              <User className="w-4 h-4" />
              Nombre completo <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="nombre"
              value={form.nombre}
              onChange={(e) => {
                // Solo letras y espacios
                const valor = e.target.value.replace(
                  /[^a-zA-ZáéíóúñÁÉÍÓÚÑ\s]/g,
                  "",
                );
                setForm({ ...form, nombre: valor });
              }}
              className={`w-full px-3 py-2.5 rounded-lg bg-input-background border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20 ${
                showErrors && !form.nombre.trim()
                  ? "border-red-400"
                  : "border-border"
              }`}
              placeholder="Juan Pérez"
              disabled={guardando}
            />
            {showErrors && !form.nombre.trim() && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> Nombre obligatorio
              </p>
            )}
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <label
              htmlFor="email"
              className="text-sm text-foreground flex items-center gap-1"
            >
              <Mail className="w-4 h-4" />
              Correo electrónico
            </label>
            <input
              type="email"
              id="email"
              value={form.email}
              onChange={(e) => {
                // Convertir a minúsculas
                const valor = e.target.value.toLowerCase();
                setForm({ ...form, email: valor });
                setErrorEmail("");
              }}
              className={`w-full px-3 py-2.5 rounded-lg bg-input-background border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20 ${
                showErrors && (errorEmail || emailDuplicado)
                  ? "border-red-400"
                  : "border-border"
              }`}
              placeholder="correo@ejemplo.com"
              disabled={guardando}
            />
            {showErrors && (errorEmail || emailDuplicado) && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errorEmail ||
                  "Este email ya está registrado para otro cliente"}
              </p>
            )}
          </div>

          {/* Celular */}
          <div className="space-y-1.5">
            <label
              htmlFor="celular"
              className="text-sm text-foreground flex items-center gap-1"
            >
              <Phone className="w-4 h-4" />
              Celular <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              id="celular"
              value={form.celular}
              onChange={(e) => {
                // Solo números, solo permite formato de teléfono peruano
                const valor = e.target.value.replace(/\D/g, "").slice(0, 9);
                setForm({ ...form, celular: valor });
              }}
              className={`w-full px-3 py-2.5 rounded-lg bg-input-background border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20 ${
                showErrors && !form.celular.trim()
                  ? "border-red-400"
                  : "border-border"
              }`}
              placeholder="987654321"
              disabled={guardando}
            />
            {showErrors && !form.celular.trim() && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> Celular obligatorio
              </p>
            )}
          </div>

          {/* Dirección */}
          <div className="space-y-1.5">
            <label
              htmlFor="direccion"
              className="text-sm text-foreground flex items-center gap-1"
            >
              <MapPin className="w-4 h-4" />
              Dirección
            </label>
            <textarea
              id="direccion"
              value={form.direccion}
              onChange={(e) => {
                // Permitir solo caracteres válidos para direcciones
                const valor = e.target.value.replace(
                  /[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ\s\.,#\-\/]/g,
                  "",
                );
                setForm({ ...form, direccion: valor });
              }}
              rows={2}
              className="w-full px-3 py-2.5 rounded-lg bg-input-background border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20 resize-none"
              placeholder="Av. Principal 123, Lima"
              disabled={guardando}
            />
          </div>

          {/* Campos no editables */}
          <div className="space-y-2 pt-2 border-t border-border">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">
              Información no editable
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="px-3 py-2 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">DNI</p>
                <p className="text-sm text-foreground font-mono">
                  {cliente.dni}
                </p>
              </div>
              <div className="px-3 py-2 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">RUC</p>
                <p className="text-sm text-foreground font-mono">
                  {cliente.ruc || "—"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex gap-3">
          <button
            onClick={onClose}
            disabled={guardando}
            className="flex-1 py-2.5 rounded-lg border border-border text-foreground hover:bg-accent transition text-sm disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleGuardar}
            disabled={guardando}
            className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition text-sm disabled:opacity-50"
          >
            {guardando ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </div>
    </div>
  );
}
