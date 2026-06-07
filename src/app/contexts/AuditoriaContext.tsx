import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { supabase } from "../../lib/supabase";
import type { Database } from "../../lib/supabase";

type AuditoriaDB = Database["public"]["Tables"]["auditoria"]["Row"];
type AuditoriaInsert = Database["public"]["Tables"]["auditoria"]["Insert"];

export type RegistroAuditoria = {
  id: string;
  fechaHora: string;
  usuarioCodigo: string;
  usuarioNombre: string;
  accion:
    | "crear"
    | "editar"
    | "eliminar"
    | "cambiar_estado"
    | "cancelar"
    | "reactivar"
    | "login"
    | "logout"
    | "establecer_password";
  modulo: "empleados" | "clientes" | "productos" | "pedidos" | "autenticacion";
  entidadId: string | null;
  entidadNombre: string | null;
  detalles: any | null;
};

type AuditoriaContextType = {
  registros: RegistroAuditoria[];
  loading: boolean;
  error: string | null;
  registrarAccion: (
    data: Omit<RegistroAuditoria, "id" | "fechaHora">,
  ) => Promise<void>;
  refetch: () => Promise<void>;
};

const AuditoriaContext = createContext<AuditoriaContextType | undefined>(
  undefined,
);

function convertirRegistro(reg: AuditoriaDB): RegistroAuditoria {
  return {
    id: reg.id,
    fechaHora: reg.fecha_hora,
    usuarioCodigo: reg.usuario_codigo,
    usuarioNombre: reg.usuario_nombre,
    accion: reg.accion as RegistroAuditoria["accion"],
    modulo: reg.modulo as RegistroAuditoria["modulo"],
    entidadId: reg.entidad_id,
    entidadNombre: reg.entidad_nombre,
    detalles: reg.detalles,
  };
}

export function AuditoriaProvider({ children }: { children: ReactNode }) {
  const [registros, setRegistros] = useState<RegistroAuditoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRegistros = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log("🔄 Cargando registros de auditoría...");
      const { data, error: fetchError } = await supabase
        .from("auditoria")
        .select("*")
        .order("fecha_hora", { ascending: false })
        .limit(500); // Limitar a los últimos 500 registros

      if (fetchError) {
        console.error("❌ Error al cargar auditoría:", fetchError);
        throw fetchError;
      }

      console.log(`✅ Auditoría cargada: ${data?.length || 0} registros`);
      setRegistros((data || []).map(convertirRegistro));
    } catch (err) {
      console.error("❌ Excepción al cargar registros de auditoría:", err);
      setError(err instanceof Error ? err.message : "Error desconocido");
      setRegistros([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRegistros();

    // Suscripción a cambios en tiempo real
    console.log("📡 Configurando suscripción a cambios de auditoría...");
    const subscription = supabase
      .channel("auditoria-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "auditoria" },
        (payload) => {
          console.log(
            "🔔 Cambio detectado en auditoría:",
            payload.eventType,
            payload,
          );
          // Refetch inmediatamente cuando hay cambios
          fetchRegistros();
        },
      )
      .subscribe((status, err) => {
        if (status === "SUBSCRIBED") {
          console.log("✅ Suscripción a auditoría activa");
        } else if (status === "CHANNEL_ERROR") {
          console.warn(
            "⚠️ Error en canal de auditoría (real-time deshabilitado):",
            err,
          );
          console.warn(
            "💡 Para habilitar tiempo real, activa la replicación en Supabase:",
          );
          console.warn(
            "Database → Replication → Enable replication for 'auditoria' table",
          );
        } else if (status === "TIMED_OUT") {
          console.warn("⏱️ Timeout en suscripción de auditoría");
        } else if (status === "CLOSED") {
          console.log("🔌 Canal de auditoría cerrado");
        }
      });

    return () => {
      console.log("📡 Desuscribiendo de cambios de auditoría");
      subscription.unsubscribe();
    };
  }, []);

  const registrarAccion = async (
    data: Omit<RegistroAuditoria, "id" | "fechaHora">,
  ) => {
    try {
      const insertData: AuditoriaInsert = {
        usuario_codigo: data.usuarioCodigo,
        usuario_nombre: data.usuarioNombre,
        accion: data.accion,
        modulo: data.modulo,
        entidad_id: data.entidadId,
        entidad_nombre: data.entidadNombre,
        detalles: data.detalles,
      };

      const { error: insertError } = await supabase
        .from("auditoria")
        .insert(insertData);

      if (insertError) throw insertError;

      // No es necesario actualizar el estado manualmente porque la suscripción lo hará
    } catch (err) {
      console.error("Error al registrar acción de auditoría:", err);
      // No lanzamos el error para que no afecte la operación principal
    }
  };

  return (
    <AuditoriaContext.Provider
      value={{
        registros,
        loading,
        error,
        registrarAccion,
        refetch: fetchRegistros,
      }}
    >
      {children}
    </AuditoriaContext.Provider>
  );
}

export function useAuditoria() {
  const context = useContext(AuditoriaContext);
  if (context === undefined) {
    throw new Error("useAuditoria debe usarse dentro de AuditoriaProvider");
  }
  return context;
}
