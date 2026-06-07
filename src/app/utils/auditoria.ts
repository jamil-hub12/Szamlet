import { supabase } from "../../lib/supabase";

type RegistrarAuditoriaParams = {
  usuarioCodigo: string;
  usuarioNombre: string;
  accion: "crear" | "editar" | "eliminar" | "cambiar_estado" | "cancelar" | "login" | "logout" | "establecer_password";
  modulo: "empleados" | "clientes" | "productos" | "pedidos" | "autenticacion";
  entidadId?: string | null;
  entidadNombre?: string | null;
  detalles?: any | null;
};

export async function registrarAuditoria(params: RegistrarAuditoriaParams): Promise<void> {
  try {
    const { data, error } = await supabase.from("auditoria").insert({
      usuario_codigo: params.usuarioCodigo,
      usuario_nombre: params.usuarioNombre,
      accion: params.accion,
      modulo: params.modulo,
      entidad_id: params.entidadId || null,
      entidad_nombre: params.entidadNombre || null,
      detalles: params.detalles || null,
    });

    if (error) {
      console.error("❌ Error al registrar auditoría:", error);
      console.error("Parámetros:", params);
    } else {
      console.log("✅ Auditoría registrada:", params.accion, params.modulo, params.usuarioCodigo);
    }
  } catch (err) {
    console.error("❌ Excepción al registrar auditoría:", err);
    console.error("Parámetros:", params);
    // No lanzamos el error para que no afecte la operación principal
  }
}

// Hook para obtener el usuario actual desde el contexto de auditoría
export async function obtenerUsuarioActual(): Promise<{ codigo: string; nombre: string } | null> {
  try {
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) return null;

    const { data: empleado } = await supabase
      .from("empleados")
      .select("codigo, nombre")
      .eq("email", authData.user.email)
      .single();

    return empleado ? { codigo: empleado.codigo, nombre: empleado.nombre } : null;
  } catch (err) {
    console.error("Error al obtener usuario actual:", err);
    return null;
  }
}
