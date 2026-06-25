import { useState } from "react";
import { useNavigate } from "react-router";
import { Eye, EyeOff, Scissors, Lock, User, ChevronRight } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { registrarAuditoria } from "../../utils/auditoria";

export function LoginPage() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Por favor completa todos los campos.");
      return;
    }

    setLoading(true);

    try {
      // Autenticación con Supabase Auth
      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password,
        });

      if (authError) {
        setError("Credenciales inválidas. Verifica tu correo y contraseña.");
        console.error("Error de autenticación:", authError);
        return;
      }

      if (!authData.user) {
        setError("Error al iniciar sesión. Por favor intenta nuevamente.");
        return;
      }

      // Obtener información del empleado desde la base de datos
      const { data: empleado, error: empleadoError } = await supabase
        .from("empleados")
        .select("codigo, nombre, rol")
        .eq("email", authData.user.email)
        .single();

      if (empleadoError || !empleado) {
        setError("No se encontró información del empleado.");
        console.error("Error al obtener empleado:", empleadoError);
        await supabase.auth.signOut();
        return;
      }

      // Registrar inicio de sesión en auditoría
      console.log("📝 Registrando login en auditoría...", empleado);
      await registrarAuditoria({
        usuarioCodigo: empleado.codigo,
        usuarioNombre: empleado.nombre,
        accion: "login",
        modulo: "autenticacion",
        detalles: { email: authData.user.email },
      });

      // Pequeño delay para asegurar que la auditoría se registre antes de navegar
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Redirigir según el rol
      console.log("🚀 Redirigiendo a dashboard...", empleado.rol);
      if (empleado.rol === "Administrador") {
        navigate("/admin");
      } else if (empleado.rol === "Atención al cliente") {
        navigate("/empleado");
      } else if (empleado.rol === "Producción") {
        navigate("/produccion");
      } else {
        setError("Rol de usuario no válido.");
        await supabase.auth.signOut();
      }
    } catch (err) {
      setError("Error al iniciar sesión. Por favor intenta nuevamente.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-stretch">
      {/* Panel izquierdo */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1542044801-30d3e45ae49a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb2xvcmZ1bCUyMHRocmVhZHMlMjBzZXdpbmclMjBmYWJyaWMlMjB0ZXh0dXJlfGVufDF8fHx8MTc4MDUzODQ5NHww&ixlib=rb-4.1.0&q=80&w=1080"
          alt="Hilos de colores"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-black/75 via-black/45 to-transparent" />
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Scissors className="w-5 h-5 text-white" />
            </div>
            <span className="text-white text-xl tracking-wide">Szamlet</span>
          </div>
          <div className="space-y-4">
            <h1 className="text-white text-4xl leading-tight">
              Gestión integral
              <br />
              para tu taller textil
            </h1>
            <p className="text-white/70 text-base max-w-sm leading-relaxed">
              Administra pedidos, inventario, clientes y producción desde un
              solo lugar.
            </p>
            <div className="flex flex-wrap gap-2 pt-2">
              {["Pedidos", "Inventario", "Clientes", "Producción"].map(
                (tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm text-white/90 text-sm border border-white/20"
                  >
                    {tag}
                  </span>
                ),
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Panel derecho */}
      <div className="flex-1 flex items-center justify-center bg-background px-6 py-12">
        <div className="w-full max-w-md space-y-8">
          <div className="flex items-center gap-3 lg:hidden">
            <div className="w-9 h-9 rounded-full bg-foreground flex items-center justify-center">
              <Scissors className="w-4 h-4 text-background" />
            </div>
            <span className="text-foreground text-lg tracking-wide">
              Szamlet
            </span>
          </div>

          <div className="space-y-1">
            <h2 className="text-foreground">Bienvenido de nuevo</h2>
            <p className="text-muted-foreground text-sm">
              Ingresa tus credenciales para acceder al sistema
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm text-foreground">
                Usuario o correo electrónico
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <User className="w-4 h-4" />
                </span>
                <input
                  id="email"
                  type="text"
                  autoComplete="username"
                  placeholder="usuario@szamlet.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-input-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20 transition"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-sm text-foreground">
                  Contraseña
                </label>
                <button
                  type="button"
                  onClick={() => navigate("/forgot-password")}
                  className="text-xs text-muted-foreground hover:text-foreground transition"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-11 py-2.5 rounded-lg bg-input-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20 transition"
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

            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                className="w-4 h-4 rounded border-border accent-foreground cursor-pointer"
              />
              <span className="text-sm text-muted-foreground">
                Recordar sesión
              </span>
            </label>

            {error && (
              <div className="px-4 py-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.99] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg
                    className="animate-spin w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                    />
                  </svg>
                  Verificando...
                </span>
              ) : (
                <>
                  Iniciar sesión <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="pt-4 border-t border-border">
            <p className="text-center text-xs text-muted-foreground">
              © 2026 Taller Textil Szamlet. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
