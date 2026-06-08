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

type ClienteDB = Database["public"]["Tables"]["clientes"]["Row"];
type ClienteInsert = Database["public"]["Tables"]["clientes"]["Insert"];
type ClienteUpdate = Database["public"]["Tables"]["clientes"]["Update"];

export type Cliente = {
  id: string; // UUID real de la base de datos
  codigo: string; // Código legible (CLI-0001)
  nombre: string;
  email: string | null;
  celular: string;
  direccion: string | null;
  dni: string;
  ruc: string | null;
  fechaRegistro: string;
};

type ClientesContextType = {
  clientes: Cliente[];
  loading: boolean;
  error: string | null;
  agregarCliente: (
    data: Omit<Cliente, "id" | "codigo" | "fechaRegistro">,
  ) => Promise<Cliente | null>;
  actualizarCliente: (
    codigo: string,
    data: Partial<Cliente>,
  ) => Promise<boolean>;
  eliminarCliente: (codigo: string) => Promise<boolean>;
  refetch: () => Promise<void>;
};

const ClientesContext = createContext<ClientesContextType | undefined>(
  undefined,
);

function convertirCliente(cliente: ClienteDB): Cliente {
  return {
    id: cliente.id, // UUID real
    codigo: cliente.codigo, // Código legible
    nombre: cliente.nombre,
    email: cliente.email,
    celular: cliente.celular,
    direccion: cliente.direccion,
    dni: cliente.dni,
    ruc: cliente.ruc,
    fechaRegistro: cliente.fecha_registro,
  };
}

export function ClientesProvider({ children }: { children: ReactNode }) {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const skipNextSubscriptionUpdate = useRef(false);
  const [error, setError] = useState<string | null>(null);

  const fetchClientes = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("clientes")
        .select("*")
        .order("codigo", { ascending: true });

      if (fetchError) throw fetchError;

      setClientes((data || []).map(convertirCliente));
    } catch (err) {
      console.error("Error al cargar clientes:", err);
      setError(err instanceof Error ? err.message : "Error desconocido");
      setClientes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClientes();

    const subscription = supabase
      .channel("clientes-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "clientes" },
        () => {
          if (!skipNextSubscriptionUpdate.current) {
            fetchClientes();
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

  const agregarCliente = async (
    data: Omit<Cliente, "id" | "codigo" | "fechaRegistro">,
  ): Promise<Cliente | null> => {
    try {
      const insertData: ClienteInsert = {
        nombre: data.nombre,
        email: data.email,
        celular: data.celular,
        direccion: data.direccion,
        dni: data.dni,
        ruc: data.ruc,
      };

      const { data: nuevoCliente, error: insertError } = await supabase
        .from("clientes")
        .insert(insertData)
        .select()
        .single();

      if (insertError) throw insertError;

      const clienteConvertido = convertirCliente(nuevoCliente);

      // Registrar en auditoría
      const usuario = await obtenerUsuarioActual();
      const usuarioFinal = usuario || { codigo: "SISTEMA", nombre: "Sistema" };

      await registrarAuditoria({
        usuarioCodigo: usuarioFinal.codigo,
        usuarioNombre: usuarioFinal.nombre,
        accion: "crear",
        modulo: "clientes",
        entidadId: clienteConvertido.codigo,
        entidadNombre: clienteConvertido.nombre,
        detalles: {
          dni: clienteConvertido.dni,
          ruc: clienteConvertido.ruc,
          celular: clienteConvertido.celular,
        },
      });

      // Evitar que la suscripción haga un fetch completo
      skipNextSubscriptionUpdate.current = true;
      setTimeout(() => {
        skipNextSubscriptionUpdate.current = false;
      }, 1000);

      setClientes((prev) => [...prev, clienteConvertido]);
      return clienteConvertido;
    } catch (err) {
      console.error("Error al agregar cliente:", err);
      setError(err instanceof Error ? err.message : "Error al agregar cliente");
      return null;
    }
  };

  const actualizarCliente = async (
    codigo: string,
    data: Partial<Cliente>,
  ): Promise<boolean> => {
    try {
      const clienteActual = clientes.find((c) => c.codigo === codigo);

      const updateData: ClienteUpdate = {};

      if (data.nombre !== undefined) updateData.nombre = data.nombre;
      if (data.email !== undefined) updateData.email = data.email;
      if (data.celular !== undefined) updateData.celular = data.celular;
      if (data.direccion !== undefined) updateData.direccion = data.direccion;
      if (data.dni !== undefined) updateData.dni = data.dni;
      if (data.ruc !== undefined) updateData.ruc = data.ruc;

      const { error: updateError } = await supabase
        .from("clientes")
        .update(updateData)
        .eq("codigo", codigo);

      if (updateError) throw updateError;

      // Registrar en auditoría
      const usuario = await obtenerUsuarioActual();
      const usuarioFinal = usuario || { codigo: "SISTEMA", nombre: "Sistema" };

      if (clienteActual) {
        await registrarAuditoria({
          usuarioCodigo: usuarioFinal.codigo,
          usuarioNombre: usuarioFinal.nombre,
          accion: "editar",
          modulo: "clientes",
          entidadId: codigo,
          entidadNombre: clienteActual.nombre,
          detalles: {
            cambios: updateData,
          },
        });
      }

      // Evitar que la suscripción haga un fetch completo
      skipNextSubscriptionUpdate.current = true;
      setTimeout(() => {
        skipNextSubscriptionUpdate.current = false;
      }, 1000);

      setClientes((prev) =>
        prev.map((cli) => (cli.codigo === codigo ? { ...cli, ...data } : cli)),
      );
      return true;
    } catch (err) {
      console.error("Error al actualizar cliente:", err);
      setError(
        err instanceof Error ? err.message : "Error al actualizar cliente",
      );
      return false;
    }
  };

  const eliminarCliente = async (codigo: string): Promise<boolean> => {
    try {
      const clienteActual = clientes.find((c) => c.codigo === codigo);

      const { error: deleteError } = await supabase
        .from("clientes")
        .delete()
        .eq("codigo", codigo);

      if (deleteError) throw deleteError;

      // Registrar en auditoría
      const usuario = await obtenerUsuarioActual();
      const usuarioFinal = usuario || { codigo: "SISTEMA", nombre: "Sistema" };

      if (clienteActual) {
        await registrarAuditoria({
          usuarioCodigo: usuarioFinal.codigo,
          usuarioNombre: usuarioFinal.nombre,
          accion: "eliminar",
          modulo: "clientes",
          entidadId: codigo,
          entidadNombre: clienteActual.nombre,
          detalles: {
            dni: clienteActual.dni,
            ruc: clienteActual.ruc,
          },
        });
      }

      // Evitar que la suscripción haga un fetch completo
      skipNextSubscriptionUpdate.current = true;
      setTimeout(() => {
        skipNextSubscriptionUpdate.current = false;
      }, 1000);

      setClientes((prev) => prev.filter((cli) => cli.codigo !== codigo));
      return true;
    } catch (err) {
      console.error("Error al eliminar cliente:", err);
      setError(
        err instanceof Error ? err.message : "Error al eliminar cliente",
      );
      return false;
    }
  };

  return (
    <ClientesContext.Provider
      value={{
        clientes,
        loading,
        error,
        agregarCliente,
        actualizarCliente,
        eliminarCliente,
        refetch: fetchClientes,
      }}
    >
      {children}
    </ClientesContext.Provider>
  );
}

export function useClientes() {
  const context = useContext(ClientesContext);
  if (context === undefined) {
    throw new Error("useClientes debe usarse dentro de ClientesProvider");
  }
  return context;
}
