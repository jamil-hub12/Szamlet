import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "⚠️ Supabase URL o Anon Key no están configuradas. El sistema funcionará en modo demo.",
  );
}

export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder-key",
);

// Tipos para la base de datos
export type Database = {
  public: {
    Tables: {
      empleados: {
        Row: {
          id: string;
          codigo: string;
          nombre: string;
          email: string;
          telefono: string;
          rol: "Atención al cliente" | "Administrador" | "Producción";
          fecha_ingreso: string;
          estado: "Activo" | "Licencia" | "Inactivo";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          codigo?: string;
          nombre: string;
          email: string;
          telefono: string;
          rol: "Atención al cliente" | "Administrador" | "Producción";
          fecha_ingreso?: string;
          estado?: "Activo" | "Licencia" | "Inactivo";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          codigo?: string;
          nombre?: string;
          email?: string;
          telefono?: string;
          rol?: "Atención al cliente" | "Administrador" | "Producción";
          fecha_ingreso?: string;
          estado?: "Activo" | "Licencia" | "Inactivo";
          created_at?: string;
          updated_at?: string;
        };
      };
      clientes: {
        Row: {
          id: string;
          codigo: string;
          nombre: string;
          email: string | null;
          celular: string;
          direccion: string | null;
          dni: string;
          ruc: string | null;
          fecha_registro: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          codigo?: string;
          nombre: string;
          email?: string | null;
          celular: string;
          direccion?: string | null;
          dni: string;
          ruc?: string | null;
          fecha_registro?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          codigo?: string;
          nombre?: string;
          email?: string | null;
          celular?: string;
          direccion?: string | null;
          dni?: string;
          ruc?: string | null;
          fecha_registro?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      pedidos: {
        Row: {
          id: string;
          codigo: string;
          cliente_id: string;
          articulo: string;
          estado:
            | "Recibido"
            | "En confección"
            | "Listo para entrega"
            | "Entregado"
            | "Cancelado";
          fecha: string;
          fecha_entrega: string | null;
          urgente: boolean;
          notas: string | null;
          motivo_cancelacion: string | null;
          estado_anterior_cancelacion: string | null;
          estado_pago: "Pendiente" | "Pagado" | "Parcial" | null;
          monto_total: number | null;
          monto_pagado: number | null;
          metodo_pago: string | null;
          referencia_pago: string | null;
          fecha_pago: string | null;
          notas_pago: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          codigo?: string;
          cliente_id: string;
          articulo: string;
          estado?:
            | "Recibido"
            | "En confección"
            | "Listo para entrega"
            | "Entregado"
            | "Cancelado";
          fecha?: string;
          fecha_entrega?: string | null;
          urgente?: boolean;
          notas?: string | null;
          motivo_cancelacion?: string | null;
          estado_anterior_cancelacion?: string | null;
          estado_pago?: "Pendiente" | "Pagado" | "Parcial" | null;
          monto_total?: number | null;
          monto_pagado?: number | null;
          metodo_pago?: string | null;
          referencia_pago?: string | null;
          fecha_pago?: string | null;
          notas_pago?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          codigo?: string;
          cliente_id?: string;
          articulo?: string;
          estado?:
            | "Recibido"
            | "En confección"
            | "Listo para entrega"
            | "Entregado"
            | "Cancelado";
          fecha?: string;
          fecha_entrega?: string | null;
          urgente?: boolean;
          notas?: string | null;
          motivo_cancelacion?: string | null;
          estado_anterior_cancelacion?: string | null;
          estado_pago?: "Pendiente" | "Pagado" | "Parcial" | null;
          monto_total?: number | null;
          monto_pagado?: number | null;
          metodo_pago?: string | null;
          referencia_pago?: string | null;
          fecha_pago?: string | null;
          notas_pago?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      productos: {
        Row: {
          id: string;
          codigo: string;
          modelo: string;
          tela: string;
          disenio: string;
          fecha_registro: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          codigo?: string;
          modelo: string;
          tela: string;
          disenio: string;
          fecha_registro?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          codigo?: string;
          modelo?: string;
          tela?: string;
          disenio?: string;
          fecha_registro?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      producto_variantes: {
        Row: {
          id: string;
          producto_id: string;
          talla: string;
          precio: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          producto_id: string;
          talla: string;
          precio?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          producto_id?: string;
          talla?: string;
          precio?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      producto_colores: {
        Row: {
          id: string;
          variante_id: string;
          color: string;
          stock: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          variante_id: string;
          color: string;
          stock?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          variante_id?: string;
          color?: string;
          stock?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      auditoria: {
        Row: {
          id: string;
          fecha_hora: string;
          usuario_codigo: string;
          usuario_nombre: string;
          accion: string;
          modulo: string;
          entidad_id: string | null;
          entidad_nombre: string | null;
          detalles: any | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          fecha_hora?: string;
          usuario_codigo: string;
          usuario_nombre: string;
          accion: string;
          modulo: string;
          entidad_id?: string | null;
          entidad_nombre?: string | null;
          detalles?: any | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          fecha_hora?: string;
          usuario_codigo?: string;
          usuario_nombre?: string;
          accion?: string;
          modulo?: string;
          entidad_id?: string | null;
          entidad_nombre?: string | null;
          detalles?: any | null;
          created_at?: string;
        };
      };
      pedido_items: {
        Row: {
          id: string;
          pedido_codigo: string;
          producto_codigo: string;
          modelo: string;
          tela: string;
          disenio: string;
          talla: string;
          color: string;
          cantidad: number;
          precio_unitario: number | null;
          subtotal: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          pedido_codigo: string;
          producto_codigo: string;
          modelo: string;
          tela: string;
          disenio: string;
          talla: string;
          color: string;
          cantidad: number;
          precio_unitario?: number | null;
          subtotal?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          pedido_codigo?: string;
          producto_codigo?: string;
          modelo?: string;
          tela?: string;
          disenio?: string;
          talla?: string;
          color?: string;
          cantidad?: number;
          precio_unitario?: number | null;
          subtotal?: number | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      stock_movimientos: {
        Row: {
          id: string;
          producto_codigo: string;
          variante_id: string;
          color_id: string;
          tipo: "entrada" | "salida" | "ajuste" | "devolucion";
          cantidad: number;
          stock_anterior: number;
          stock_nuevo: number;
          motivo: string;
          referencia: string | null;
          usuario_codigo: string | null;
          usuario_nombre: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          producto_codigo: string;
          variante_id: string;
          color_id: string;
          tipo: "entrada" | "salida" | "ajuste" | "devolucion";
          cantidad: number;
          stock_anterior: number;
          stock_nuevo: number;
          motivo: string;
          referencia?: string | null;
          usuario_codigo?: string | null;
          usuario_nombre?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          producto_codigo?: string;
          variante_id?: string;
          color_id?: string;
          tipo?: "entrada" | "salida" | "ajuste" | "devolucion";
          cantidad?: number;
          stock_anterior?: number;
          stock_nuevo?: number;
          motivo?: string;
          referencia?: string | null;
          usuario_codigo?: string | null;
          usuario_nombre?: string | null;
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
};
