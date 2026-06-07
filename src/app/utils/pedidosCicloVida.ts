/**
 * Sistema de Ciclo de Vida de Pedidos
 *
 * Estados:
 * 1. Recibido - Estado inicial al crear el pedido
 * 2. En confección - El taller inició la producción
 * 3. Listo para entrega - Producción finalizada
 * 4. Entregado - Cliente recibió su pedido (FINAL)
 * 5. Cancelado - Pedido anulado con motivo (FINAL)
 */

export type EstadoPedido =
  | "Recibido"
  | "En confección"
  | "Listo para entrega"
  | "Entregado"
  | "Cancelado";

// Transiciones permitidas según el ciclo de vida
const TRANSICIONES_PERMITIDAS: Record<EstadoPedido, EstadoPedido[]> = {
  "Recibido": ["En confección", "Cancelado"],
  "En confección": ["Listo para entrega", "Cancelado"],
  "Listo para entrega": ["Entregado", "Cancelado"],
  "Entregado": [], // Estado final, no permite transiciones
  "Cancelado": [], // Estado final, no permite transiciones
};

// Estados finales que no permiten más cambios
export const ESTADOS_FINALES: EstadoPedido[] = ["Entregado", "Cancelado"];

// Estados que permiten cancelación
export const ESTADOS_CANCELABLES: EstadoPedido[] = [
  "Recibido",
  "En confección",
  "Listo para entrega",
];

/**
 * Valida si una transición de estado es permitida
 */
export function validarTransicion(
  estadoActual: EstadoPedido,
  estadoNuevo: EstadoPedido
): { valido: boolean; mensaje: string } {
  // No se puede cambiar desde estados finales
  if (ESTADOS_FINALES.includes(estadoActual)) {
    return {
      valido: false,
      mensaje: `No se puede modificar un pedido en estado "${estadoActual}". Este es un estado final.`,
    };
  }

  // No se puede cambiar a estados finales sin ser una transición válida
  if (estadoNuevo === "Entregado" && estadoActual !== "Listo para entrega") {
    return {
      valido: false,
      mensaje: `Solo se puede marcar como "Entregado" un pedido que esté "Listo para entrega". Estado actual: "${estadoActual}".`,
    };
  }

  // Verificar si la transición está permitida
  const transicionesPermitidas = TRANSICIONES_PERMITIDAS[estadoActual] || [];

  if (!transicionesPermitidas.includes(estadoNuevo)) {
    return {
      valido: false,
      mensaje: `La transición de "${estadoActual}" a "${estadoNuevo}" no está permitida. Transiciones válidas: ${transicionesPermitidas.join(", ") || "ninguna"}.`,
    };
  }

  return {
    valido: true,
    mensaje: "Transición permitida",
  };
}

/**
 * Obtiene el siguiente estado válido en el flujo normal
 */
export function obtenerSiguienteEstado(
  estadoActual: EstadoPedido
): EstadoPedido | null {
  const transiciones = TRANSICIONES_PERMITIDAS[estadoActual] || [];

  // Excluir "Cancelado" del flujo normal
  const siguienteNormal = transiciones.filter((e) => e !== "Cancelado")[0];

  return siguienteNormal || null;
}

/**
 * Verifica si un pedido puede ser editado
 */
export function puedeEditarPedido(estado: EstadoPedido): {
  puede: boolean;
  mensaje: string;
} {
  if (ESTADOS_FINALES.includes(estado)) {
    return {
      puede: false,
      mensaje: `No se puede editar un pedido en estado "${estado}". Este es un estado final.`,
    };
  }

  return {
    puede: true,
    mensaje: "El pedido puede ser editado",
  };
}

/**
 * Verifica si un pedido puede ser cancelado
 */
export function puedeCancelarPedido(estado: EstadoPedido): {
  puede: boolean;
  mensaje: string;
} {
  if (estado === "Cancelado") {
    return {
      puede: false,
      mensaje: "El pedido ya está cancelado.",
    };
  }

  if (estado === "Entregado") {
    return {
      puede: false,
      mensaje: "No se puede cancelar un pedido que ya fue entregado.",
    };
  }

  if (ESTADOS_CANCELABLES.includes(estado)) {
    return {
      puede: true,
      mensaje: "El pedido puede ser cancelado",
    };
  }

  return {
    puede: false,
    mensaje: `No se puede cancelar un pedido en estado "${estado}".`,
  };
}

/**
 * Obtiene todas las transiciones válidas desde un estado
 */
export function obtenerTransicionesValidas(
  estadoActual: EstadoPedido
): EstadoPedido[] {
  return TRANSICIONES_PERMITIDAS[estadoActual] || [];
}

/**
 * Verifica si un estado es final
 */
export function esEstadoFinal(estado: EstadoPedido): boolean {
  return ESTADOS_FINALES.includes(estado);
}

/**
 * Obtiene el color y estilo para cada estado
 */
export function obtenerEstiloEstado(estado: EstadoPedido): {
  color: string;
  bgColor: string;
  borderColor: string;
} {
  const estilos: Record<EstadoPedido, { color: string; bgColor: string; borderColor: string }> = {
    "Recibido": {
      color: "text-indigo-700",
      bgColor: "bg-indigo-100",
      borderColor: "border-indigo-200",
    },
    "En confección": {
      color: "text-blue-700",
      bgColor: "bg-blue-100",
      borderColor: "border-blue-200",
    },
    "Listo para entrega": {
      color: "text-emerald-700",
      bgColor: "bg-emerald-100",
      borderColor: "border-emerald-200",
    },
    "Entregado": {
      color: "text-gray-500",
      bgColor: "bg-gray-100",
      borderColor: "border-gray-200",
    },
    "Cancelado": {
      color: "text-red-700",
      bgColor: "bg-red-100",
      borderColor: "border-red-200",
    },
  };

  return estilos[estado];
}

/**
 * Genera un mensaje descriptivo para el cambio de estado
 */
export function generarMensajeCambioEstado(
  estadoAnterior: EstadoPedido,
  estadoNuevo: EstadoPedido,
  codigoPedido: string
): string {
  const mensajes: Record<string, string> = {
    "Recibido->En confección": `El pedido ${codigoPedido} ha iniciado su producción.`,
    "En confección->Listo para entrega": `El pedido ${codigoPedido} está listo para ser entregado.`,
    "Listo para entrega->Entregado": `El pedido ${codigoPedido} fue entregado exitosamente al cliente.`,
    "Recibido->Cancelado": `El pedido ${codigoPedido} fue cancelado antes de iniciar la producción.`,
    "En confección->Cancelado": `El pedido ${codigoPedido} fue cancelado durante la producción.`,
    "Listo para entrega->Cancelado": `El pedido ${codigoPedido} fue cancelado antes de la entrega.`,
  };

  const clave = `${estadoAnterior}->${estadoNuevo}`;
  return mensajes[clave] || `El pedido ${codigoPedido} cambió de "${estadoAnterior}" a "${estadoNuevo}".`;
}
