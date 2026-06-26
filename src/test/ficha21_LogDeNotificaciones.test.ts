import { describe, it, expect } from "vitest";
import {
  aplicarFiltroNotificaciones,
  clasificarEstadoEntrega,
  filtrarNotificacionesPorPedido,
  hayFiltroActivo,
  type FiltroNotificacionesLog,
  noHayNotificacionesRegistradas,
  ordenarNotificacionesPorFecha,
  tieneContenidoDisponible,
} from "../app/utils/notificacionesLog";

describe("RF21 - Log de Notificaciones", () => {
  it("CP01 - filtrarNotificacionesPorPedido retorna solo las notificaciones del pedido seleccionado", () => {
    // ARRANGE
    const historial = [
      {
        id: "n1",
        pedidoCodigo: "PED-001",
        fecha: "2026-06-10T10:00:00.000Z",
        medio: "Email",
        destinatario: "cliente@correo.com",
        contenido: "Se envio la confirmacion",
        estadoEntrega: "exitoso",
      },
      {
        id: "n2",
        pedidoCodigo: "PED-002",
        fecha: "2026-06-10T11:00:00.000Z",
        medio: "WhatsApp",
        destinatario: "999999999",
        contenido: "Otro pedido",
        estadoEntrega: "fallido",
      },
    ];

    // ACT
    const resultado = filtrarNotificacionesPorPedido(historial, "PED-001");

    // ASSERT
    expect(resultado).toHaveLength(1);
    expect(resultado[0].pedidoCodigo).toBe("PED-001");
  });

  it("CP02 - noHayNotificacionesRegistradas retorna true cuando el pedido no tiene notificaciones", () => {
    // ARRANGE
    const historial: Array<{
      id: string;
      pedidoCodigo: string;
      fecha: string;
      medio: string | null;
      destinatario: string | null;
      contenido: string | null;
      estadoEntrega: string | null;
    }> = [];

    // ACT
    const resultado = noHayNotificacionesRegistradas(historial);

    // ASSERT
    expect(resultado).toBe(true);
  });

  it("CP03 - clasificarEstadoEntrega normaliza valores desconocidos a no_confirmado", () => {
    // ARRANGE
    const estadoInvalido = "enviado_manual";

    // ACT
    const resultado = clasificarEstadoEntrega(estadoInvalido);

    // ASSERT
    expect(resultado).toBe("no_confirmado");
  });

  it("CP04 - ordenarNotificacionesPorFecha muestra primero la notificacion mas reciente", () => {
    // ARRANGE
    const historial = [
      {
        id: "n1",
        pedidoCodigo: "PED-001",
        fecha: "2026-06-10T10:00:00.000Z",
        medio: "Email",
        destinatario: null,
        contenido: "Primera",
        estadoEntrega: "exitoso",
      },
      {
        id: "n2",
        pedidoCodigo: "PED-001",
        fecha: "2026-06-10T12:00:00.000Z",
        medio: "SMS",
        destinatario: null,
        contenido: "Segunda",
        estadoEntrega: "exitoso",
      },
    ];

    // ACT
    const resultado = ordenarNotificacionesPorFecha(historial);

    // ASSERT
    expect(resultado[0].id).toBe("n2");
  });

  it("CP05 - aplicarFiltroNotificaciones respeta fecha, medio y estado", () => {
    // ARRANGE
    const historial = [
      {
        id: "n1",
        pedidoCodigo: "PED-001",
        fecha: "2026-06-10T10:00:00.000Z",
        medio: "Email",
        destinatario: "cliente@correo.com",
        contenido: "Envio correcto",
        estadoEntrega: "exitoso",
      },
      {
        id: "n2",
        pedidoCodigo: "PED-001",
        fecha: "2026-06-11T10:00:00.000Z",
        medio: "WhatsApp",
        destinatario: "999999999",
        contenido: "Envio fallido",
        estadoEntrega: "fallido",
      },
    ];

    // ACT
    const resultado = aplicarFiltroNotificaciones(historial, {
      fecha: "2026-06-10",
      medio: "Email",
      estado: "exitoso",
    });

    // ASSERT
    expect(resultado).toHaveLength(1);
    expect(resultado[0].id).toBe("n1");
  });

  it("CP06 - tieneContenidoDisponible distingue contenido visible de contenido ausente", () => {
    // ARRANGE
    const contenidoValido = "Pedido listo para envio";
    const contenidoVacio = "   ";

    // ACT
    const resultadoValido = tieneContenidoDisponible(contenidoValido);
    const resultadoVacio = tieneContenidoDisponible(contenidoVacio);

    // ASSERT
    expect(resultadoValido).toBe(true);
    expect(resultadoVacio).toBe(false);
  });

  it("CP07 - hayFiltroActivo detecta cuando el usuario aplico al menos un filtro", () => {
    // ARRANGE
    const filtroActivo: FiltroNotificacionesLog = {
      fecha: "2026-06-10",
      medio: "Email",
    };

    // ACT
    const resultado = hayFiltroActivo(filtroActivo);

    // ASSERT
    expect(resultado).toBe(true);
  });
});
