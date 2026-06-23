export function prepararNotaParaGuardar(
  notaIngresada: string,
): string | undefined {
  return notaIngresada.trim() || undefined;
}

export function tieneNotasParaMostrar(notas?: string): boolean {
  return Boolean(notas);
}
