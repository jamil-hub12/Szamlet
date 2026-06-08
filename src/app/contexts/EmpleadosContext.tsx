import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useRef,
} from "react";
import { supabase } from "../../lib/supabase";
import type { Database } from "../../lib/supabase";
import { registrarAuditoria, obtenerUsuarioActual } from "../utils/auditoria";

type EmpleadoDB = Database["public"]["Tables"]["empleados"]["Row"];
type EmpleadoInsert = Database["public"]["Tables"]["empleados"]["Insert"];
type EmpleadoUpdate = Database["public"]["Tables"]["empleados"]["Update"];

export type Permiso =
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

export type Empleado = {
  id: string;
  codigo: string;
  nombre: string;
  email: string;
  telefono: string;
  rol: "Atención al cliente" | "Administrador";
  fechaIngreso: string;
  estado: "Activo" | "Licencia" | "Inactivo";
  permisos: Permiso[];
};

type EmpleadosContextType = {
  empleados: Empleado[];
  loading: boolean;
  error: string | null;
  agregarEmpleado: (
    data: Omit<Empleado, "id" | "codigo" | "fechaIngreso" | "permisos">,
    password: string,
  ) => Promise<Empleado | null>;
  actualizarEmpleado: (id: string, data: Partial<Empleado>) => Promise<boolean>;
  eliminarEmpleado: (id: string) => Promise<boolean>;
  establecerPassword: (email: string, password: string) => Promise<boolean>;
  refetch: () => Promise<void>;
};

const EmpleadosContext = createContext<EmpleadosContextType | undefined>(
  undefined,
);

function convertirEmpleado(emp: EmpleadoDB): Empleado {
  return {
    id: emp.codigo,
    codigo: emp.codigo,
    nombre: emp.nombre,
    email: emp.email,
    telefono: emp.telefono,
    rol: emp.rol as "Atención al cliente" | "Administrador",
    fechaIngreso: emp.fecha_ingreso,
    estado: emp.estado as "Activo" | "Licencia" | "Inactivo",
    permisos: (emp.permisos as Permiso[]) || [],
  };
}

// Función para obtener permisos por defecto según el rol
function obtenerPermisosDefault(
  rol: "Atención al cliente" | "Administrador",
): Permiso[] {
  if (rol === "Administrador") {
    return [
      "ver_pedidos",
      "crear_pedidos",
      "editar_pedidos",
      "cancelar_pedidos",
      "cambiar_estado_pedidos",
      "ver_clientes",
      "crear_clientes",
      "editar_clientes",
      "ver_historial_clientes",
      "ver_catalogo",
      "crear_productos",
      "editar_productos",
      "eliminar_productos",
      "ver_pagos",
      "registrar_pagos",
    ];
  } else {
    // Atención al cliente: solo puede trabajar con pedidos, clientes y pagos
    return [
      "ver_pedidos",
      "crear_pedidos",
      "editar_pedidos",
      "cambiar_estado_pedidos",
      "ver_clientes",
      "crear_clientes",
      "editar_clientes",
      "ver_historial_clientes",
      "ver_catalogo",
      "ver_pagos",
      "registrar_pagos",
    ];
  }
}

export function EmpleadosProvider({ children }: { children: ReactNode }) {
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const skipNextSubscriptionUpdate = useRef(false);

  const fetchEmpleados = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("empleados")
        .select("*")
        .order("codigo", { ascending: true });

      if (fetchError) throw fetchError;

      setEmpleados((data || []).map(convertirEmpleado));
    } catch (err) {
      console.error("Error al cargar empleados:", err);
      setError(err instanceof Error ? err.message : "Error desconocido");
      setEmpleados([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmpleados();

    // Suscripción a cambios en tiempo real
    const subscription = supabase
      .channel("empleados-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "empleados" },
        () => {
          if (!skipNextSubscriptionUpdate.current) {
            fetchEmpleados();
          } else {
            skipNextSubscriptionUpdate.current = false;
          }
        },
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const agregarEmpleado = async (
    data: Omit<Empleado, "id" | "codigo" | "fechaIngreso" | "permisos">,
    password: string,
  ): Promise<Empleado | null> => {
    try {
      // Paso 1: Crear usuario de autenticación en Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: password,
        options: {
          data: {
            nombre: data.nombre,
            telefono: data.telefono,
            rol: data.rol,
          },
        },
      });

      if (authError) throw authError;
      if (!authData.user)
        throw new Error("No se pudo crear el usuario de autenticación");

      // Paso 2: Crear registro en la tabla empleados
      const permisosDefault = obtenerPermisosDefault(data.rol);
      const insertData: EmpleadoInsert = {
        nombre: data.nombre,
        email: data.email,
        telefono: data.telefono,
        rol: data.rol,
        estado: data.estado,
        permisos: permisosDefault,
      };

      const { data: nuevoEmpleado, error: insertError } = await supabase
        .from("empleados")
        .insert(insertData)
        .select()
        .single();

      if (insertError) {
        // Si falla la inserción del empleado, eliminar el usuario de Auth
        await supabase.auth.admin.deleteUser(authData.user.id);
        throw insertError;
      }

      const empleadoConvertido = convertirEmpleado(nuevoEmpleado);

      // Evitar que la suscripción haga un fetch completo
      skipNextSubscriptionUpdate.current = true;
      setTimeout(() => {
        skipNextSubscriptionUpdate.current = false;
      }, 1000);

      setEmpleados((prev) => [...prev, empleadoConvertido]);

      // Registrar en auditoría
      const usuario = await obtenerUsuarioActual();
      const usuarioFinal = usuario || { codigo: "SISTEMA", nombre: "Sistema" };

      await registrarAuditoria({
        usuarioCodigo: usuarioFinal.codigo,
        usuarioNombre: usuarioFinal.nombre,
        accion: "crear",
        modulo: "empleados",
        entidadId: empleadoConvertido.codigo,
        entidadNombre: empleadoConvertido.nombre,
        detalles: {
          email: empleadoConvertido.email,
          telefono: empleadoConvertido.telefono,
          rol: empleadoConvertido.rol,
          estado: empleadoConvertido.estado,
        },
      });

      return empleadoConvertido;
    } catch (err) {
      console.error("Error al agregar empleado:", err);
      setError(
        err instanceof Error ? err.message : "Error al agregar empleado",
      );
      return null;
    }
  };

  const actualizarEmpleado = async (
    codigo: string,
    data: Partial<Empleado>,
  ): Promise<boolean> => {
    try {
      const updateData: EmpleadoUpdate = {};

      if (data.nombre !== undefined) updateData.nombre = data.nombre;
      if (data.email !== undefined) updateData.email = data.email;
      if (data.telefono !== undefined) updateData.telefono = data.telefono;
      if (data.rol !== undefined) updateData.rol = data.rol;
      if (data.estado !== undefined) updateData.estado = data.estado;
      if (data.permisos !== undefined) updateData.permisos = data.permisos;

      const { error: updateError } = await supabase
        .from("empleados")
        .update(updateData)
        .eq("codigo", codigo);

      if (updateError) throw updateError;

      // Evitar que la suscripción haga un fetch completo
      skipNextSubscriptionUpdate.current = true;
      setTimeout(() => {
        skipNextSubscriptionUpdate.current = false;
      }, 1000);

      setEmpleados((prev) =>
        prev.map((emp) => (emp.codigo === codigo ? { ...emp, ...data } : emp)),
      );

      // Registrar en auditoría
      const usuario = await obtenerUsuarioActual();
      const usuarioFinal = usuario || { codigo: "SISTEMA", nombre: "Sistema" };
      const empleadoActualizado = empleados.find(
        (emp) => emp.codigo === codigo,
      );

      await registrarAuditoria({
        usuarioCodigo: usuarioFinal.codigo,
        usuarioNombre: usuarioFinal.nombre,
        accion: "editar",
        modulo: "empleados",
        entidadId: codigo,
        entidadNombre: empleadoActualizado?.nombre || "Empleado",
        detalles: {
          cambios: updateData,
        },
      });

      return true;
    } catch (err) {
      console.error("Error al actualizar empleado:", err);
      setError(
        err instanceof Error ? err.message : "Error al actualizar empleado",
      );
      return false;
    }
  };

  const eliminarEmpleado = async (codigo: string): Promise<boolean> => {
    try {
      const empleadoAEliminar = empleados.find((emp) => emp.codigo === codigo);

      const { error: deleteError } = await supabase
        .from("empleados")
        .delete()
        .eq("codigo", codigo);

      if (deleteError) throw deleteError;

      // Evitar que la suscripción haga un fetch completo
      skipNextSubscriptionUpdate.current = true;
      setTimeout(() => {
        skipNextSubscriptionUpdate.current = false;
      }, 1000);

      setEmpleados((prev) => prev.filter((emp) => emp.codigo !== codigo));

      // Registrar en auditoría
      const usuario = await obtenerUsuarioActual();
      const usuarioFinal = usuario || { codigo: "SISTEMA", nombre: "Sistema" };

      await registrarAuditoria({
        usuarioCodigo: usuarioFinal.codigo,
        usuarioNombre: usuarioFinal.nombre,
        accion: "eliminar",
        modulo: "empleados",
        entidadId: codigo,
        entidadNombre: empleadoAEliminar?.nombre || "Empleado",
        detalles: {
          email: empleadoAEliminar?.email,
          rol: empleadoAEliminar?.rol,
        },
      });

      return true;
    } catch (err) {
      console.error("Error al eliminar empleado:", err);
      setError(
        err instanceof Error ? err.message : "Error al eliminar empleado",
      );
      return false;
    }
  };

  const establecerPassword = async (
    email: string,
    password: string,
  ): Promise<boolean> => {
    try {
      const empleadoTarget = empleados.find((emp) => emp.email === email);

      // Crear usuario de autenticación en Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          emailRedirectTo: undefined, // No enviar email de confirmación
        },
      });

      if (authError) throw authError;
      if (!authData.user)
        throw new Error("No se pudo crear el usuario de autenticación");

      // Registrar en auditoría
      const usuario = await obtenerUsuarioActual();
      const usuarioFinal = usuario || { codigo: "SISTEMA", nombre: "Sistema" };

      await registrarAuditoria({
        usuarioCodigo: usuarioFinal.codigo,
        usuarioNombre: usuarioFinal.nombre,
        accion: "establecer_password",
        modulo: "empleados",
        entidadId: empleadoTarget?.codigo || "UNKNOWN",
        entidadNombre: empleadoTarget?.nombre || email,
        detalles: {
          email: email,
        },
      });

      return true;
    } catch (err) {
      console.error("Error al establecer contraseña:", err);
      setError(
        err instanceof Error ? err.message : "Error al establecer contraseña",
      );
      return false;
    }
  };

  return (
    <EmpleadosContext.Provider
      value={{
        empleados,
        loading,
        error,
        agregarEmpleado,
        actualizarEmpleado,
        eliminarEmpleado,
        establecerPassword,
        refetch: fetchEmpleados,
      }}
    >
      {children}
    </EmpleadosContext.Provider>
  );
}

export function useEmpleados() {
  const context = useContext(EmpleadosContext);
  if (context === undefined) {
    throw new Error("useEmpleados debe usarse dentro de EmpleadosProvider");
  }
  return context;
}
