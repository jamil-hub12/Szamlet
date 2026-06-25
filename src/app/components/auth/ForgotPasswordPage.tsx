import { useState } from "react";
import { useNavigate } from "react-router";
import { Scissors, Mail, ChevronRight, ArrowLeft } from "lucide-react";
import { supabase } from "../../../lib/supabase";

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email) {
      setError("Por favor ingresa tu correo electrónico.");
      return;
    }

    setLoading(true);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        {
          redirectTo: `${window.location.origin}/reset-password`,
        },
      );

      if (resetError) {
        setError(
          "No se pudo enviar el correo. Verifica la dirección ingresada.",
        );
        console.error(resetError);
        return;
      }

      setSent(true);
    } catch (err) {
      setError("Ocurrió un error. Por favor intenta nuevamente.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6 py-12">
      <div className="w-full max-w-md space-y-8">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-foreground flex items-center justify-center">
            <Scissors className="w-4 h-4 text-background" />
          </div>
          <span className="text-foreground text-lg tracking-wide">Szamlet</span>
        </div>

        {sent ? (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20 text-green-600 text-sm">
              ✅ Correo enviado. Revisa tu bandeja de entrada y sigue las
              instrucciones para restablecer tu contraseña.
            </div>
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition"
            >
              <ArrowLeft className="w-4 h-4" /> Volver al inicio de sesión
            </button>
          </div>
        ) : (
          <>
            <div className="space-y-1">
              <h2 className="text-foreground">Recuperar contraseña</h2>
              <p className="text-muted-foreground text-sm">
                Ingresa tu correo y te enviaremos un enlace para restablecer tu
                contraseña.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label htmlFor="email" className="text-sm text-foreground">
                  Correo electrónico
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    <Mail className="w-4 h-4" />
                  </span>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="usuario@szamlet.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-input-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20 transition"
                  />
                </div>
              </div>

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
                    Enviando...
                  </span>
                ) : (
                  <>
                    Enviar enlace <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => navigate("/")}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition"
              >
                <ArrowLeft className="w-4 h-4" /> Volver al inicio de sesión
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
