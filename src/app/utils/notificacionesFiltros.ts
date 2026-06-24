// notificacionesFiltros.ts
// Funciones puras de lógica de negocio para el panel de notificaciones (RF47)

export type NotificacionFiltro = {
  id: string;
  leida: boolean;
};

/**
 * Cuenta las notificaciones sin leer
 */
export function contarNoLeidas(notificaciones: NotificacionFiltro[]): number {
  return notificaciones.filter((n) => !n.leida).length;
}

/**
 * Indica si hay modificaciones recientes (notificaciones sin leer)
 */
export function tieneModificacionesRecientes(
  notificaciones: NotificacionFiltro[],
): boolean {
  return contarNoLeidas(notificaciones) > 0;
}
