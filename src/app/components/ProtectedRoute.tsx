import { type ReactNode, useEffect, useState } from "react";
import { Navigate } from "react-router";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { supabase } from "../../lib/supabase";

type RolPermitido = "Administrador" | "Atención al cliente" | "Producción";

/**
 * Protege una ruta verificando que exista una sesión activa de Supabase
 * Auth y que el rol del usuario coincida con los roles permitidos para
 * ese dashboard. Si no hay sesión, o el rol no coincide, redirige a "/"
 * (login) en vez de renderizar el contenido protegido.
 *
 * Antes de esto, las rutas /admin, /empleado y /produccion eran
 * accesibles escribiendo la URL directamente, sin haber iniciado sesión.
 *
 * También revalida la sesión cuando el navegador restaura la página desde
 * el back-forward cache (bfcache) — por ejemplo, al cerrar sesión y luego
 * presionar el botón "atrás". En ese caso React no se vuelve a montar, así
 * que sin esta revalidación se llegaba a ver brevemente el dashboard
 * cacheado de la sesión ya cerrada antes de cualquier otra verificación.
 */
export function ProtectedRoute({
  children,
  rolesPermitidos,
}: {
  children: ReactNode;
  rolesPermitidos: RolPermitido[];
}) {
  const usuario = useCurrentUser();
  const [revalidando, setRevalidando] = useState(false);
  const [sesionRevalidada, setSesionRevalidada] = useState(true);

  useEffect(() => {
    const revalidarSesion = async (event: PageTransitionEvent) => {
      if (!event.persisted) return;
      setRevalidando(true);
      const { data } = await supabase.auth.getSession();
      setSesionRevalidada(Boolean(data.session));
      setRevalidando(false);
    };

    window.addEventListener("pageshow", revalidarSesion);
    return () => window.removeEventListener("pageshow", revalidarSesion);
  }, []);

  if (usuario.loading || revalidando) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Cargando...</p>
      </div>
    );
  }

  const tieneSesion = Boolean(usuario.email) && sesionRevalidada;
  const rolValido = rolesPermitidos.includes(usuario.rol as RolPermitido);

  if (!tieneSesion || !rolValido) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
