import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import emailjs from "@emailjs/browser";
import {
  EMAILJS_CONFIG,
  isEmailJSConfigured,
} from "../../config/emailjs.config";
import { supabase } from "../../lib/supabase";

type Notificacion = {
  id: string;
  tipo: "exito" | "error" | "info" | "advertencia";
  titulo: string;
  mensaje: string;
  timestamp: string;
  leida: boolean;
  pedidoCodigo?: string;
  estadoAnterior?: string;
  estadoNuevo?: string;
  emailEnviado?: boolean;
};

type NotificacionesContextType = {
  notificaciones: Notificacion[];
  agregarNotificacion: (
    notif: Omit<Notificacion, "id" | "timestamp" | "leida">,
  ) => void;
  marcarComoLeida: (id: string) => void;
  marcarTodasComoLeidas: () => void;
  eliminarNotificacion: (id: string) => void;
  limpiarNotificaciones: () => void;
  noLeidas: number;
  enviarEmailCambioEstado: (data: {
    clienteNombre: string;
    clienteEmail: string;
    pedidoCodigo: string;
    pedidoNombre: string;
    pedidoDescripcion: string;
    color: string;
    talla: string;
    precio: string;
    fechaEntrega: string;
    articulo: string;
    estadoAnterior: string;
    estadoNuevo: string;
  }) => Promise<boolean>;
};

const NotificacionesContext = createContext<
  NotificacionesContextType | undefined
>(undefined);

export function NotificacionesProvider({ children }: { children: ReactNode }) {
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [loading, setLoading] = useState(true);

  // Cargar notificaciones desde la base de datos
  useEffect(() => {
    const fetchNotificaciones = async () => {
      try {
        const { data, error } = await supabase
          .from("notificaciones")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(100);

        if (error) {
          // Si la tabla no existe, mostrar advertencia pero no bloquear la app
          if (error.code === "PGRST205") {
            console.warn(
              "⚠️ La tabla 'notificaciones' no existe. Ejecuta el script SQL en Supabase:",
            );
            console.warn("📄 /database/notificaciones-persistentes.sql");
            setLoading(false);
            return;
          }
          throw error;
        }

        if (data) {
          const notificacionesFormateadas: Notificacion[] = data.map(
            (n: any) => ({
              id: n.id,
              tipo: n.tipo,
              titulo: n.titulo,
              mensaje: n.mensaje,
              timestamp: n.created_at,
              leida: n.leida,
              pedidoCodigo: n.pedido_codigo,
              estadoAnterior: n.estado_anterior,
              estadoNuevo: n.estado_nuevo,
              emailEnviado: n.email_enviado,
            }),
          );

          setNotificaciones(notificacionesFormateadas);
        }
      } catch (error) {
        console.error("Error al cargar notificaciones:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchNotificaciones();

    // Suscripción en tiempo real
    const subscription = supabase
      .channel("notificaciones-changes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notificaciones" },
        (payload) => {
          console.log("🔔 Nueva notificación:", payload);
          const nuevaNotif: Notificacion = {
            id: payload.new.id,
            tipo: payload.new.tipo,
            titulo: payload.new.titulo,
            mensaje: payload.new.mensaje,
            timestamp: payload.new.created_at,
            leida: payload.new.leida,
            pedidoCodigo: payload.new.pedido_codigo,
            estadoAnterior: payload.new.estado_anterior,
            estadoNuevo: payload.new.estado_nuevo,
            emailEnviado: payload.new.email_enviado,
          };

          setNotificaciones((prev) => [nuevaNotif, ...prev]);

          // Reproducir sonido
          if (typeof Audio !== "undefined") {
            const audio = new Audio(
              "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZQA0PVqzn77BdGAk+ltryxnMpBSuAzPLaizsIGGS57OihUBELTKXh8bllHAU2jdXzzn0vBSh+ye/ekTwKElyx6OqnWBYKQpzd8sFuJAU1idDzzIU2Bxx0wO7mnEkODVOq5/CwYhgJO5TU88p2KgYpfcnt3ZI/CxVasOboq1oWCkCZ3PLEcCYFN4vR88qBMwYebrzt55pCDg9UquXvr2EYCDyV1vPKdioGKnzH79yRPwoUWK7n6KpYFgo9mNrywW4kBTWI0PPLgjQGHnC+7eSaQw0PUqvj77BfGAg7k9TzyXYpBil7x+7bkj0KFFit5+ipWRUJPpfa8sBtIwU0h9DyyoEzBh1vvO3km0QNEFG",
            );
            audio.volume = 0.3;
            audio.play().catch(() => {});
          }
        },
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const agregarNotificacion = async (
    notif: Omit<Notificacion, "id" | "timestamp" | "leida">,
  ) => {
    try {
      const { error } = await supabase.from("notificaciones").insert({
        tipo: notif.tipo,
        titulo: notif.titulo,
        mensaje: notif.mensaje,
        pedido_codigo: notif.pedidoCodigo,
        estado_anterior: notif.estadoAnterior,
        estado_nuevo: notif.estadoNuevo,
        email_enviado: notif.emailEnviado,
        leida: false,
      });

      if (error) {
        // Si la tabla no existe, agregar solo en memoria (fallback)
        if (error.code === "PGRST205") {
          const nuevaNotificacion: Notificacion = {
            ...notif,
            id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date().toISOString(),
            leida: false,
          };
          setNotificaciones((prev) => [nuevaNotificacion, ...prev]);

          // Reproducir sonido
          if (typeof Audio !== "undefined") {
            const audio = new Audio(
              "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZQA0PVqzn77BdGAk+ltryxnMpBSuAzPLaizsIGGS57OihUBELTKXh8bllHAU2jdXzzn0vBSh+ye/ekTwKElyx6OqnWBYKQpzd8sFuJAU1idDzzIU2Bxx0wO7mnEkODVOq5/CwYhgJO5TU88p2KgYpfcnt3ZI/CxVasOboq1oWCkCZ3PLEcCYFN4vR88qBMwYebrzt55pCDg9UquXvr2EYCDyV1vPKdioGKnzH79yRPwoUWK7n6KpYFgo9mNrywW4kBTWI0PPLgjQGHnC+7eSaQw0PUqvj77BfGAg7k9TzyXYpBil7x+7bkj0KFFit5+ipWRUJPpfa8sBtIwU0h9DyyoEzBh1vvO3km0QNEFG",
            );
            audio.volume = 0.3;
            audio.play().catch(() => {});
          }
          return;
        }
        throw error;
      }

      // La suscripción en tiempo real agregará automáticamente la notificación al estado
    } catch (error) {
      console.error("Error al agregar notificación:", error);
    }
  };

  const marcarComoLeida = async (id: string) => {
    try {
      const { error } = await supabase
        .from("notificaciones")
        .update({ leida: true })
        .eq("id", id);

      if (error && error.code !== "PGRST205") throw error;

      // Actualizar estado local (siempre, incluso si la tabla no existe)
      setNotificaciones((prev) =>
        prev.map((n) => (n.id === id ? { ...n, leida: true } : n)),
      );
    } catch (error) {
      console.error("Error al marcar notificación como leída:", error);
    }
  };

  const marcarTodasComoLeidas = async () => {
    try {
      const ids = notificaciones.filter((n) => !n.leida).map((n) => n.id);

      if (ids.length === 0) return;

      const { error } = await supabase
        .from("notificaciones")
        .update({ leida: true })
        .in("id", ids);

      if (error && error.code !== "PGRST205") throw error;

      // Actualizar estado local (siempre)
      setNotificaciones((prev) => prev.map((n) => ({ ...n, leida: true })));
    } catch (error) {
      console.error("Error al marcar todas como leídas:", error);
    }
  };

  const eliminarNotificacion = async (id: string) => {
    try {
      const { error } = await supabase
        .from("notificaciones")
        .delete()
        .eq("id", id);

      if (error && error.code !== "PGRST205") throw error;

      // Actualizar estado local (siempre)
      setNotificaciones((prev) => prev.filter((n) => n.id !== id));
    } catch (error) {
      console.error("Error al eliminar notificación:", error);
    }
  };

  const limpiarNotificaciones = async () => {
    try {
      const ids = notificaciones.map((n) => n.id);

      if (ids.length === 0) return;

      const { error } = await supabase
        .from("notificaciones")
        .delete()
        .in("id", ids);

      if (error && error.code !== "PGRST205") throw error;

      // Actualizar estado local (siempre)
      setNotificaciones([]);
    } catch (error) {
      console.error("Error al limpiar notificaciones:", error);
    }
  };

  const enviarEmailCambioEstado = async (data: {
    clienteNombre: string;
    clienteEmail: string;
    pedidoCodigo: string;
    pedidoNombre: string;
    pedidoDescripcion: string;
    color: string;
    talla: string;
    precio: string;
    fechaEntrega: string;
    articulo: string;
    estadoAnterior: string;
    estadoNuevo: string;
  }): Promise<boolean> => {
    if (!isEmailJSConfigured()) {
      console.warn("⚠️ EmailJS no está configurado.");
      return false;
    }

    try {
      const templateParams = {
        to_name: data.clienteNombre,
        to_email: data.clienteEmail,
        pedido_codigo: data.pedidoCodigo,
        pedido_nombre: data.pedidoNombre,
        pedido_descripcion: data.pedidoDescripcion,
        color: data.color,
        talla: data.talla,
        precio: data.precio,
        fecha_entrega: data.fechaEntrega,
        articulo: data.articulo,
        estado_anterior: data.estadoAnterior,
        estado_nuevo: data.estadoNuevo,
      };

      const response = await emailjs.send(
        EMAILJS_CONFIG.SERVICE_ID,
        EMAILJS_CONFIG.TEMPLATE_ID,
        templateParams,
        EMAILJS_CONFIG.PUBLIC_KEY,
      );

      return response.status === 200;
    } catch (error) {
      console.error("❌ Error al enviar email:", error);
      return false;
    }
  };

  const noLeidas = notificaciones.filter((n) => !n.leida).length;

  return (
    <NotificacionesContext.Provider
      value={{
        notificaciones,
        agregarNotificacion,
        marcarComoLeida,
        marcarTodasComoLeidas,
        eliminarNotificacion,
        limpiarNotificaciones,
        noLeidas,
        enviarEmailCambioEstado,
      }}
    >
      {children}
    </NotificacionesContext.Provider>
  );
}

export function useNotificaciones() {
  const context = useContext(NotificacionesContext);
  if (context === undefined) {
    throw new Error(
      "useNotificaciones debe usarse dentro de NotificacionesProvider",
    );
  }
  return context;
}
