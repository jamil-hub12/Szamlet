import { type ReactNode } from "react";
import { Navigate } from "react-router";
import { useCurrentUser } from "../hooks/useCurrentUser";

type RolPermitido = "Administrador" | "Atención al cliente" | "Producción";

/**
 * Protege una ruta verificando que exista una sesión activa de Supabase
 * Auth y que el rol del usuario coincida con los roles permitidos para
 * ese dashboard. Si no hay sesión, o el rol no coincide, redirige a "/"
 * (login) en vez de renderizar el contenido protegido.
 *
 * Antes de esto, las rutas /admin, /empleado y /produccion eran
 * accesibles escribiendo la URL directamente, sin haber iniciado sesión.
 */
export function ProtectedRoute({
  children,
  rolesPermitidos,
}: {
  children: ReactNode;
  rolesPermitidos: RolPermitido[];
}) {
  const usuario = useCurrentUser();

  if (usuario.loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Cargando...</p>
      </div>
    );
  }

  const tieneSesion = Boolean(usuario.email);
  const rolValido = rolesPermitidos.includes(usuario.rol as RolPermitido);

  if (!tieneSesion || !rolValido) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
