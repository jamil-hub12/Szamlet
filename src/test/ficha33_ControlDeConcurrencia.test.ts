import { describe, it, expect } from "vitest";
import {
  bloqueoEstaVigente,
  calcularExpiracion,
  esMiBloqueo,
  hayConflictoDeVersion,
  LOCK_DURACION_MINUTOS,
  type BloqueoInfo,
} from "../app/utils/concurrencia";

describe("RF33 - Control de Concurrencia", () => {
  // CP01 controlar edición concurrente
  it("CP01 - bloqueoEstaVigente retorna true cuando la expiración aún no llegó", () => {
    // ARRANGE
    const ahora = new Date("2026-06-26T10:00:00.000Z");
    const expiraEn = "2026-06-26T10:04:59.000Z";

    // ACT
    const resultado = bloqueoEstaVigente(expiraEn, ahora);

    // ASSERT
    expect(resultado).toBe(true);
  });

  // CP02 Pedido ya bloqueado para edición
  it("CP02 - bloqueoEstaVigente retorna false cuando el bloqueo ya expiró", () => {
    // ARRANGE
    const ahora = new Date("2026-06-26T10:05:00.000Z");
    const expiraEn = "2026-06-26T10:04:59.000Z";

    // ACT
    const resultado = bloqueoEstaVigente(expiraEn, ahora);

    // ASSERT
    expect(resultado).toBe(false);
  });

  // CP03 Bloqueo liberado por cierre de sesión
  it("CP03 - calcularExpiracion suma la duración de lock configurada", () => {
    // ARRANGE
    const ahora = new Date("2026-06-26T10:00:00.000Z");

    // ACT
    const expiracion = calcularExpiracion(ahora);

    // ASSERT
    const diferenciaMs = new Date(expiracion).getTime() - ahora.getTime();
    expect(diferenciaMs).toBe(LOCK_DURACION_MINUTOS * 60 * 1000);
  });

  // CP04 Conflicto de cambios simultáneos
  it("CP04 - esMiBloqueo y hayConflictoDeVersion detectan dueño del lock y cambios concurrentes", () => {
    // ARRANGE
    const bloqueo: BloqueoInfo = {
      pedidoCodigo: "PED-001",
      usuarioCodigo: "USR-001",
      usuarioNombre: "Ana",
      expiraEn: "2026-06-26T10:05:00.000Z",
    };

    // ACT
    const esMio = esMiBloqueo(bloqueo, "USR-001");
    const hayConflicto = hayConflictoDeVersion(
      "2026-06-26T10:00:00.000Z",
      "2026-06-26T10:01:00.000Z",
    );

    // ASSERT
    expect(esMio).toBe(true);
    expect(hayConflicto).toBe(true);
  });
});
