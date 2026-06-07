import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";

type CurrentUser = {
  codigo: string;
  nombre: string;
  email: string;
  rol: "Atención al cliente" | "Administrador";
  loading: boolean;
};

export function useCurrentUser(): CurrentUser {
  const [user, setUser] = useState<CurrentUser>({
    codigo: "",
    nombre: "",
    email: "",
    rol: "Atención al cliente",
    loading: true,
  });

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        // Obtener usuario autenticado
        const { data: authData } = await supabase.auth.getUser();

        if (!authData.user) {
          setUser({ codigo: "", nombre: "", email: "", rol: "Atención al cliente", loading: false });
          return;
        }

        // Obtener información del empleado desde la base de datos
        const { data: empleado, error } = await supabase
          .from("empleados")
          .select("codigo, nombre, email, rol")
          .eq("email", authData.user.email)
          .single();

        if (error || !empleado) {
          console.error("Error al obtener empleado:", error);
          setUser({
            codigo: "",
            nombre: authData.user.email || "Usuario",
            email: authData.user.email || "",
            rol: "Atención al cliente",
            loading: false,
          });
          return;
        }

        setUser({
          codigo: empleado.codigo,
          nombre: empleado.nombre,
          email: empleado.email,
          rol: empleado.rol as "Atención al cliente" | "Administrador",
          loading: false,
        });
      } catch (err) {
        console.error("Error en useCurrentUser:", err);
        setUser({ codigo: "", nombre: "", email: "", rol: "Atención al cliente", loading: false });
      }
    };

    fetchCurrentUser();
  }, []);

  return user;
}
