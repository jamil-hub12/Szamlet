import { useState } from "react";
import { X, Shield, CheckCircle2, Circle, AlertTriangle, Loader2 } from "lucide-react";
import type { Empleado, Permiso } from "../contexts/EmpleadosContext";

type Props = {
  empleado: Empleado;
  onClose: () => void;
  onGuardar: (permisos: Permiso[]) => Promise<boolean>;
};

const PERMISOS_DISPONIBLES: { categoria: string; permisos: { id: Permiso; label: string; descripcion: string }[] }[] = [
  {
    categoria: "Pedidos",
    permisos: [
      { id: "ver_pedidos", label: "Ver pedidos", descripcion: "Ver lista y detalles de pedidos" },
      { id: "crear_pedidos", label: "Crear pedidos", descripcion: "Registrar nuevos pedidos" },
      { id: "editar_pedidos", label: "Editar pedidos", descripcion: "Modificar pedidos existentes" },
      { id: "cancelar_pedidos", label: "Cancelar pedidos", descripcion: "Cancelar pedidos" },
      { id: "cambiar_estado_pedidos", label: "Cambiar estado", descripcion: "Cambiar estado de pedidos" },
    ],
  },
  {
    categoria: "Clientes",
    permisos: [
      { id: "ver_clientes", label: "Ver clientes", descripcion: "Ver lista de clientes" },
      { id: "crear_clientes", label: "Crear clientes", descripcion: "Registrar nuevos clientes" },
      { id: "editar_clientes", label: "Editar clientes", descripcion: "Modificar datos de clientes" },
      { id: "ver_historial_clientes", label: "Ver historial", descripcion: "Ver historial de pedidos del cliente" },
    ],
  },
  {
    categoria: "Catálogo",
    permisos: [
      { id: "ver_catalogo", label: "Ver catálogo", descripcion: "Ver productos del catálogo" },
      { id: "crear_productos", label: "Crear productos", descripcion: "Agregar nuevos productos" },
      { id: "editar_productos", label: "Editar productos", descripcion: "Modificar productos existentes" },
      { id: "eliminar_productos", label: "Eliminar productos", descripcion: "Eliminar productos del catálogo" },
    ],
  },
  {
    categoria: "Pagos",
    permisos: [
      { id: "ver_pagos", label: "Ver pagos", descripcion: "Ver registro de pagos" },
      { id: "registrar_pagos", label: "Registrar pagos", descripcion: "Registrar nuevos pagos" },
    ],
  },
];

export function GestionarPermisosModal({ empleado, onClose, onGuardar }: Props) {
  const [permisosSeleccionados, setPermisosSeleccionados] = useState<Permiso[]>(empleado.permisos);
  const [guardando, setGuardando] = useState(false);

  const togglePermiso = (permiso: Permiso) => {
    if (permisosSeleccionados.includes(permiso)) {
      setPermisosSeleccionados(permisosSeleccionados.filter((p) => p !== permiso));
    } else {
      setPermisosSeleccionados([...permisosSeleccionados, permiso]);
    }
  };

  const seleccionarTodos = () => {
    const todos = PERMISOS_DISPONIBLES.flatMap((cat) => cat.permisos.map((p) => p.id));
    setPermisosSeleccionados(todos);
  };

  const deseleccionarTodos = () => {
    setPermisosSeleccionados([]);
  };

  const handleGuardar = async () => {
    setGuardando(true);
    const exito = await onGuardar(permisosSeleccionados);
    setGuardando(false);

    if (exito) {
      onClose();
    } else {
      alert("❌ Error al actualizar permisos");
    }
  };

  // Si es administrador, mostrar mensaje especial
  if (empleado.rol === "Administrador") {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-card border border-border rounded-xl w-full max-w-md shadow-xl">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Shield className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">Permisos de Administrador</h2>
                <p className="text-sm text-muted-foreground">{empleado.nombre}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-accent rounded-lg transition">
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          <div className="p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Acceso Total</h3>
            <p className="text-muted-foreground text-sm">
              Los administradores tienen acceso completo a todas las funciones del sistema automáticamente.
              No es necesario configurar permisos individuales.
            </p>
          </div>

          <div className="flex gap-3 p-4 border-t border-border">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition"
            >
              Entendido
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-xl w-full max-w-3xl shadow-xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Gestionar Permisos</h2>
              <p className="text-sm text-muted-foreground">{empleado.nombre} • {empleado.rol}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-accent rounded-lg transition">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Alerta informativa */}
        <div className="mx-4 mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="text-blue-900 font-medium">Configura los permisos del empleado</p>
            <p className="text-blue-700 mt-1">
              Selecciona las acciones que este empleado puede realizar en el sistema.
            </p>
          </div>
        </div>

        {/* Acciones rápidas */}
        <div className="flex gap-2 mx-4 mt-3">
          <button
            onClick={seleccionarTodos}
            className="text-sm px-3 py-1.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition"
          >
            Seleccionar todos
          </button>
          <button
            onClick={deseleccionarTodos}
            className="text-sm px-3 py-1.5 border border-border text-foreground rounded-lg hover:bg-accent transition"
          >
            Deseleccionar todos
          </button>
          <div className="flex-1" />
          <div className="text-sm text-muted-foreground self-center">
            {permisosSeleccionados.length} de {PERMISOS_DISPONIBLES.reduce((acc, cat) => acc + cat.permisos.length, 0)} seleccionados
          </div>
        </div>

        {/* Body - Lista de permisos */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {PERMISOS_DISPONIBLES.map((categoria) => (
            <div key={categoria.categoria} className="bg-muted/30 border border-border rounded-lg p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3">{categoria.categoria}</h3>
              <div className="space-y-2">
                {categoria.permisos.map((permiso) => {
                  const seleccionado = permisosSeleccionados.includes(permiso.id);
                  return (
                    <button
                      key={permiso.id}
                      onClick={() => togglePermiso(permiso.id)}
                      className={`w-full flex items-start gap-3 p-3 rounded-lg border transition ${
                        seleccionado
                          ? "bg-primary/10 border-primary"
                          : "bg-background border-border hover:border-primary/50"
                      }`}
                    >
                      {seleccionado ? (
                        <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      ) : (
                        <Circle className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                      )}
                      <div className="text-left flex-1">
                        <p className={`text-sm font-medium ${seleccionado ? "text-foreground" : "text-foreground"}`}>
                          {permiso.label}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">{permiso.descripcion}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-4 border-t border-border">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-input rounded-lg text-foreground hover:bg-accent transition"
            disabled={guardando}
          >
            Cancelar
          </button>
          <button
            onClick={handleGuardar}
            disabled={guardando}
            className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {guardando ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Guardando...
              </>
            ) : (
              "Guardar Permisos"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
