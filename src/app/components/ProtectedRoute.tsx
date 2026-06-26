import { type ReactNode, useEffect, useState } from "react";
import { Navigate } from "react-router";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { supabase } from "../../lib/supabase";
import { debeRevalidarSesionPorStorage } from "../utils/validaciones";

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
 * También revalida la sesión en dos casos donde React no se vuelve a
 * montar por sí solo:
 *
 * 1. Bfcache: el navegador restaura la página desde el back-forward cache
 *    (botón "atrás" tras cerrar sesión) sin remontar React, así que sin
 *    revalidar se llegaba a ver brevemente el dashboard cacheado.
 *
 * 2. Multi-pestaña: si la sesión se cierra desde OTRA pestaña, Supabase
 *    borra su token de localStorage, lo que dispara el evento nativo
 *    "storage" en esta pestaña. Aunque useCurrentUser ya escucha
 *    onAuthStateChange (que en teoría también reacciona a esto), se
 *    agrega esta verificación explícita como respaldo determinista: no
 *    depende de la implementación interna de Supabase, solo de que el
 *    token de sesión (clave "sb-...-auth-token") haya sido eliminado.
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

    const revalidarPorCambioDeOtraPestana = async (event: StorageEvent) => {
      if (!debeRevalidarSesionPorStorage(event.key, event.newValue)) return;

      setRevalidando(true);
      const { data } = await supabase.auth.getSession();
      setSesionRevalidada(Boolean(data.session));
      setRevalidando(false);
    };

    window.addEventListener("pageshow", revalidarSesion);
    window.addEventListener("storage", revalidarPorCambioDeOtraPestana);
    return () => {
      window.removeEventListener("pageshow", revalidarSesion);
      window.removeEventListener("storage", revalidarPorCambioDeOtraPestana);
    };
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
