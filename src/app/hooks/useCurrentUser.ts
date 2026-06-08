import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";

type Permiso =
  | "ver_pedidos"
  | "crear_pedidos"
  | "editar_pedidos"
  | "cancelar_pedidos"
  | "cambiar_estado_pedidos"
  | "ver_clientes"
  | "crear_clientes"
  | "editar_clientes"
  | "ver_historial_clientes"
  | "ver_catalogo"
  | "crear_productos"
  | "editar_productos"
  | "eliminar_productos"
  | "ver_pagos"
  | "registrar_pagos";

type CurrentUser = {
  codigo: string;
  nombre: string;
  email: string;
  rol: "Atención al cliente" | "Administrador";
  permisos: Permiso[];
  loading: boolean;
};

export function useCurrentUser(): CurrentUser {
  const [user, setUser] = useState<CurrentUser>({
    codigo: "",
    nombre: "",
    email: "",
    rol: "Atención al cliente",
    permisos: [],
    loading: true,
  });

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        // Obtener usuario autenticado
        const { data: authData } = await supabase.auth.getUser();

        if (!authData.user) {
          setUser({
            codigo: "",
            nombre: "",
            email: "",
            rol: "Atención al cliente",
            permisos: [],
            loading: false,
          });
          return;
        }

        // Obtener información del empleado desde la base de datos
        const { data: empleado, error } = await supabase
          .from("empleados")
          .select("codigo, nombre, email, rol, permisos")
          .eq("email", authData.user.email)
          .single();

        if (error || !empleado) {
          console.error("Error al obtener empleado:", error);
          setUser({
            codigo: "",
            nombre: authData.user.email || "Usuario",
            email: authData.user.email || "",
            rol: "Atención al cliente",
            permisos: [],
            loading: false,
          });
          return;
        }

        setUser({
          codigo: empleado.codigo,
          nombre: empleado.nombre,
          email: empleado.email,
          rol: empleado.rol as "Atención al cliente" | "Administrador",
          permisos: (empleado.permisos as Permiso[]) || [],
          loading: false,
        });
      } catch (err) {
        console.error("Error en useCurrentUser:", err);
        setUser({
          codigo: "",
          nombre: "",
          email: "",
          rol: "Atención al cliente",
          permisos: [],
          loading: false,
        });
      }
    };

    fetchCurrentUser();
  }, []);

  return user;
}
