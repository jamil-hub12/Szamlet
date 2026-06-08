import { useState } from "react";
import {
  X,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";

type Empleado = {
  id: string;
  codigo: string;
  nombre: string;
  email: string;
};

export function EstablecerPasswordModal({
  empleado,
  onClose,
  onGuardar,
}: {
  empleado: Empleado;
  onClose: () => void;
  onGuardar: (password: string) => Promise<boolean>;
}) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [exito, setExito] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!password.trim()) {
      setError("La contraseña es obligatoria.");
      return;
    }

    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    if (!/[A-Z]/.test(password)) {
      setError("La contraseña debe contener al menos 1 mayúscula.");
      return;
    }

    if (!/[0-9]/.test(password)) {
      setError("La contraseña debe contener al menos 1 número.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setGuardando(true);
    try {
      const resultado = await onGuardar(password);
      if (resultado) {
        setExito(true);
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        setError("Error al establecer contraseña. Intenta nuevamente.");
      }
    } catch (err) {
      setError("Error al establecer contraseña. Intenta nuevamente.");
      console.error(err);
    } finally {
      setGuardando(false);
    }
  };

  if (exito) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          onClick={onClose}
        />
        <div className="relative z-10 bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-7 h-7 text-emerald-600" />
          </div>
          <h3 className="text-foreground text-lg mb-2">
            Contraseña establecida
          </h3>
          <p className="text-muted-foreground text-sm">
            {empleado.nombre} ya puede iniciar sesión con su nueva contraseña.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative z-10 bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <div>
            <h3 className="text-foreground">Establecer contraseña</h3>
            <p className="text-muted-foreground text-sm mt-0.5">
              {empleado.nombre}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-accent transition"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-amber-800">
                Este empleado no tiene cuenta de acceso. Establece una
                contraseña para que pueda iniciar sesión.
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="password"
              className="text-sm text-foreground flex items-center gap-1"
            >
              Nueva contraseña <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-11 py-2.5 rounded-lg bg-input-background border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20 transition"
                disabled={guardando}
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
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full pl-9 pr-11 py-2.5 rounded-lg bg-input-background border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20 transition"
                disabled={guardando}
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
          </div>

          {error && (
            <div className="px-4 py-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={guardando}
              className="flex-1 px-4 py-2.5 rounded-lg border border-border text-foreground text-sm hover:bg-accent transition disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="flex-1 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {guardando && <Loader2 className="w-4 h-4 animate-spin" />}
              Establecer contraseña
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
