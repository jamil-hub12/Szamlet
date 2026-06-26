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
  rol: "Atención al cliente" | "Administrador" | "Producción";
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

        if (error) {
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

        if (!empleado) {
          console.warn("No se encontró empleado para:", authData.user.email);
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

        const permisos = Array.isArray(empleado.permisos)
          ? (empleado.permisos as Permiso[])
          : [];

        setUser({
          codigo: empleado.codigo || "",
          nombre: empleado.nombre || "",
          email: empleado.email || "",
          rol:
            (empleado.rol as
              | "Atención al cliente"
              | "Administrador"
              | "Producción") || "Atención al cliente",
          permisos: permisos,
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

    // Escuchar cambios de autenticación (útil para múltiples pestañas)
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_IN" || event === "USER_UPDATED") {
          // Refrescar datos del usuario cuando inicia sesión o se actualiza
          fetchCurrentUser();
        } else if (event === "SIGNED_OUT") {
          // Limpiar datos cuando cierra sesión
          setUser({
            codigo: "",
            nombre: "",
            email: "",
            rol: "Atención al cliente",
            permisos: [],
            loading: false,
          });
        }
      },
    );

    // Escuchar cambios en tiempo real de la tabla empleados
    let subscription: ReturnType<typeof supabase.channel> | null = null;
    try {
      subscription = supabase
        .channel("public:empleados")
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "empleados",
          },
          async (payload) => {
            // Cuando se actualiza un empleado, refetch los datos del usuario actual
            const { data: authData } = await supabase.auth.getUser();
            if (authData.user && payload.new.email === authData.user.email) {
              try {
                const { data: empleado } = await supabase
                  .from("empleados")
                  .select("codigo, nombre, email, rol, permisos")
                  .eq("email", authData.user.email)
                  .single();

                if (empleado) {
                  const permisos = Array.isArray(empleado.permisos)
                    ? (empleado.permisos as Permiso[])
                    : [];

                  setUser({
                    codigo: empleado.codigo || "",
                    nombre: empleado.nombre || "",
                    email: empleado.email || "",
                    rol:
                      (empleado.rol as
                        | "Atención al cliente"
                        | "Administrador"
                        | "Producción") || "Atención al cliente",
                    permisos: permisos,
                    loading: false,
                  });
                }
              } catch (err) {
                console.error("Error al refetch empleado en realtime:", err);
              }
            }
          },
        )
        .subscribe();
    } catch (err) {
      console.warn(
        "Realtime no disponible o deshabilitado, los permisos se cargarán solo al iniciar:",
        err,
      );
    }

    return () => {
      // Limpiar suscripciones
      if (subscription) {
        subscription.unsubscribe();
      }
      if (authListener && authListener.subscription) {
        authListener.subscription.unsubscribe();
      }
    };
  }, []);

  return user;
}
