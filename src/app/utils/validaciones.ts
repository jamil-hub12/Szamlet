import { obtenerFechaPeruHoy } from "./fechas";

/**
 * Verifica si un pedido está vencido (fecha de entrega pasada)
 * No considera pedidos en estado Entregado o Cancelado
 */
export function esPedidoVencido(
  fechaEntrega?: string,
  estado?: string,
): boolean {
  if (!fechaEntrega || !estado) return false;
  if (estado === "Entregado" || estado === "Cancelado" || estado === "Vencido")
    return false;

  const hoy = obtenerFechaPeruHoy();
  return fechaEntrega < hoy;
}

/**
 * Calcula días hasta vencimiento (negativo si vencido)
 * No calcula si el pedido está Entregado, Cancelado o Vencido
 */
export function diasHastaVencimiento(
  fechaEntrega?: string,
  estado?: string,
): number | null {
  if (!fechaEntrega) return null;
  if (estado === "Entregado" || estado === "Cancelado" || estado === "Vencido")
    return null;

  const hoy = new Date(obtenerFechaPeruHoy());
  const entrega = new Date(fechaEntrega);
  const diferencia = entrega.getTime() - hoy.getTime();
  return Math.ceil(diferencia / (1000 * 60 * 60 * 24));
}

/**
 * Valida que una fecha no sea anterior a hoy (usada al crear/editar)
 */
export function esValidaFechaMinimaHoy(fecha: string): boolean {
  return fecha >= obtenerFechaPeruHoy();
}

/**
 * Valida que una fecha no sea futura (usada para fechas de pago/realización)
 */
export function esValidaFechaMaximaHoy(fecha: string): boolean {
  return fecha <= obtenerFechaPeruHoy();
}

/**
 * Genera mensaje de error para fecha inválida
 */
export function obtenerMensajeErrorFecha(
  fecha: string,
  contexto: "entrega" | "pago" | "creacion",
): string {
  const hoy = obtenerFechaPeruHoy();

  if (contexto === "entrega") {
    if (fecha < hoy) {
      return `La fecha de entrega no puede ser anterior a hoy (${hoy})`;
    }
  } else if (contexto === "pago") {
    if (fecha > hoy) {
      return `La fecha del pago no puede ser futura (hoy es ${hoy})`;
    }
  } else if (contexto === "creacion") {
    if (fecha < hoy) {
      return `La fecha no puede ser anterior a hoy (${hoy})`;
    }
  }

  return "Fecha inválida";
}

/**
 * Valida estructura de email
 */
export function esEmailValido(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

/**
 * Valida número de teléfono peruano (9 dígitos, empieza en 9)
 */
export function esTelefonoValido(telefono: string): boolean {
  const regex = /^9\d{8}$/;
  return regex.test(telefono.replace(/[^\d]/g, ""));
}

/**
 * Valida DNI peruano (8 dígitos)
 */
export function esDNIValido(dni: string): boolean {
  return /^\d{8}$/.test(dni.replace(/[^\d]/g, ""));
}

/**
 * Valida RUC peruano (11 dígitos, debe iniciar con 10 o 20)
 */
export function esRUCValido(ruc: string): boolean {
  return /^(10|20)\d{9}$/.test(ruc.replace(/[^\d]/g, ""));
}

/**
 * Valida nombre: solo letras y espacios
 */
export function esNombreValido(nombre: string): boolean {
  return /^[a-zA-ZáéíóúÁÉÍÓÚüÜñÑ\s]+$/.test(nombre.trim());
}

/**
 * Valida email con proveedores permitidos (Gmail, Outlook, Hotmail)
 */
export function esEmailConProveedorPermitido(email: string): boolean {
  const dominiosPermitidos = ["@gmail.com", "@outlook.com", "@hotmail.com"];
  return dominiosPermitidos.some((dominio) =>
    email.toLowerCase().endsWith(dominio),
  );
}

/**
 * Valida dirección: permite letras, números, espacios y caracteres comunes en direcciones
 */
export function esDireccionValida(direccion: string): boolean {
  return /^[a-zA-Z0-9áéíóúñÁÉÍÓÚÑ\s\.,#\-\/]+$/.test(direccion.trim());
}

/**
 * Valida que solo contenga números
 */
export function soloNumeros(valor: string): boolean {
  return /^\d*$/.test(valor);
}

/**
 * Valida que un monto sea válido (positivo, máximo 2 decimales)
 */
export function esMontoValido(monto: string | number): boolean {
  const num = typeof monto === "string" ? parseFloat(monto) : monto;
  if (isNaN(num) || num <= 0) return false;
  // Verificar máximo 2 decimales
  if (typeof monto === "string") {
    const decimals = monto.split(".")[1];
    if (decimals && decimals.length > 2) return false;
  }
  return true;
}

/**
 * Valida que una cantidad sea válido (entero positivo)
 */
export function esCantidadValida(cantidad: number): boolean {
  return Number.isInteger(cantidad) && cantidad > 0;
}

/**
 * Obtiene todos los errores de validación en un formulario
 */
export type ErroresValidacion = Record<string, string>;

/**
 * Normaliza espacios en blanco en strings
 */
export function normalizarTexto(texto: string): string {
  return texto.trim().replace(/\s+/g, " ");
}

// RF01 — Registro de Clientes

type ClienteParaDuplicado = {
  dni: string;
  ruc?: string | null;
};

/**
 * Busca si el DNI o RUC ingresados ya pertenecen a otro cliente registrado.
 * Solo compara DNI cuando tiene 8 dígitos y RUC cuando tiene 11, igual que
 * la detección en tiempo real del formulario de Nuevo Cliente.
 */
export function detectarClienteDuplicado<T extends ClienteParaDuplicado>(
  clientesExistentes: T[],
  dni: string,
  ruc: string,
): { dniDuplicado?: T; rucDuplicado?: T } {
  const dniTrim = dni.trim();
  const rucTrim = ruc.trim();

  const dniDuplicado =
    dniTrim.length === 8
      ? clientesExistentes.find((c) => c.dni === dniTrim)
      : undefined;

  const rucDuplicado =
    rucTrim.length === 11
      ? clientesExistentes.find((c) => c.ruc === rucTrim)
      : undefined;

  return { dniDuplicado, rucDuplicado };
}

// RF05 — Edición de Clientes

type ClienteParaEdicion = {
  id: string;
  email: string | null;
};

type FormEdicionCliente = {
  nombre: string;
  email: string;
  celular: string;
  direccion: string;
};

export type ErrorEdicionCliente =
  | { campo: "nombre"; mensaje: "El nombre es obligatorio." }
  | { campo: "nombre"; mensaje: "El nombre solo puede contener letras y espacios." }
  | { campo: "celular"; mensaje: "El celular es obligatorio." }
  | { campo: "celular"; mensaje: "Número inválido (9 dígitos, empieza en 9)." }
  | { campo: "email"; mensaje: "El correo debe ser de @gmail.com, @outlook.com o @hotmail.com" }
  | { campo: "email"; mensaje: "Este email ya está registrado para otro cliente" }
  | { campo: "direccion"; mensaje: "La dirección contiene caracteres no válidos." };

/**
 * Valida los datos editables de un cliente (nombre, celular, email, dirección).
 * Replica exactamente las reglas de EditarClienteModal: nombre y celular son
 * obligatorios; email y dirección son opcionales pero deben tener formato
 * válido si se completan; el email no puede pertenecer a otro cliente.
 *
 * Devuelve `null` si todo es válido, o el primer error encontrado (mismo
 * orden de validación que el componente original). Los campos obligatorios
 * vacíos también devuelven un error explícito (campo "nombre"/"celular"),
 * en vez de `null`, para no confundirse con un formulario válido.
 */
export function validarEdicionCliente(
  form: FormEdicionCliente,
  clienteActualId: string,
  clientesExistentes: ClienteParaEdicion[],
): ErrorEdicionCliente | null {
  if (!form.nombre.trim()) {
    return { campo: "nombre", mensaje: "El nombre es obligatorio." };
  }
  if (!esNombreValido(form.nombre)) {
    return {
      campo: "nombre",
      mensaje: "El nombre solo puede contener letras y espacios.",
    };
  }
  if (!form.celular.trim()) {
    return { campo: "celular", mensaje: "El celular es obligatorio." };
  }
  if (!esTelefonoValido(form.celular.replace(/\s/g, ""))) {
    return {
      campo: "celular",
      mensaje: "Número inválido (9 dígitos, empieza en 9).",
    };
  }
  if (form.email.trim() && !esEmailConProveedorPermitido(form.email)) {
    return {
      campo: "email",
      mensaje: "El correo debe ser de @gmail.com, @outlook.com o @hotmail.com",
    };
  }
  if (form.direccion.trim() && !esDireccionValida(form.direccion)) {
    return {
      campo: "direccion",
      mensaje: "La dirección contiene caracteres no válidos.",
    };
  }

  const emailTrim = form.email.trim().toLowerCase();
  const emailDuplicado =
    emailTrim.length > 0
      ? clientesExistentes.find(
          (c) => c.id !== clienteActualId && c.email?.toLowerCase() === emailTrim,
        )
      : undefined;

  if (emailDuplicado) {
    return {
      campo: "email",
      mensaje: "Este email ya está registrado para otro cliente",
    };
  }

  return null;
}

// RF48 — Alertas de Pedidos Críticos
export const DIAS_UMBRAL_CRITICO = 3;

/**
 * Indica si un pedido es crítico (se entrega en <= DIAS_UMBRAL_CRITICO días
 * o ya venció pero aún no está en estado Vencido/Entregado/Cancelado)
 */
export function esPedidoCritico(
  fechaEntrega?: string,
  estado?: string,
): boolean {
  const dias = diasHastaVencimiento(fechaEntrega, estado);
  if (dias === null) return false;
  return dias <= DIAS_UMBRAL_CRITICO;
}

type PedidoParaAlertaCritica = {
  codigo: string;
  fechaEntrega?: string;
  estado?: string;
};

type NotificacionExistente = {
  pedidoCodigo?: string;
  titulo: string;
  timestamp: string;
};

/**
 * Determina qué pedidos críticos todavía no han recibido una alerta
 * automática hoy (zona horaria de Perú), para no duplicar notificaciones
 * cada vez que se carga el dashboard.
 *
 * @param fechaHoy fecha actual en formato YYYY-MM-DD (usar
 * obtenerFechaPeruHoy() al llamarla desde un componente)
 */
export function obtenerPedidosCriticosSinNotificar(
  pedidos: PedidoParaAlertaCritica[],
  notificacionesExistentes: NotificacionExistente[],
  fechaHoy: string,
): PedidoParaAlertaCritica[] {
  const yaNotificadosHoy = new Set(
    notificacionesExistentes
      .filter(
        (n) =>
          n.titulo === "Pedido crítico" &&
          n.timestamp.slice(0, 10) === fechaHoy,
      )
      .map((n) => n.pedidoCodigo),
  );

  return pedidos.filter(
    (p) =>
      esPedidoCritico(p.fechaEntrega, p.estado) &&
      !yaNotificadosHoy.has(p.codigo),
  );
}

/**
 * Indica si un pedido está próximo a vencer: NO está vencido todavía,
 * pero le quedan entre 1 y DIAS_UMBRAL_CRITICO días.
 * Extraído de DetallePedidoModal.tsx y RegistrarPagoModal.tsx, donde esta
 * misma condición estaba duplicada de forma idéntica.
 */
export function esPedidoProximoAVencer(
  fechaEntrega?: string,
  estado?: string,
): boolean {
  if (esPedidoVencido(fechaEntrega, estado)) return false;
  const dias = diasHastaVencimiento(fechaEntrega, estado);
  if (dias === null) return false;
  return dias > 0 && dias <= DIAS_UMBRAL_CRITICO;
}

// RF — Gestión de roles de Empleados

/**
 * Determina si el campo "rol" debe estar habilitado al editar un empleado.
 *
 * Regla de negocio: la cuenta de Administrador es única en el sistema, así
 * que un administrador no puede cambiar su propio rol (se quedaría sin
 * ningún admin que pueda revertirlo). Editar el rol de OTRO empleado sigue
 * permitido sin restricciones.
 *
 * Comparación por email, porque es el identificador con el que
 * useCurrentUser empareja la sesión de Supabase Auth con la fila de
 * "empleados" (no expone el UUID/id del registro).
 */
export function puedeEditarPropioRol(
  emailEmpleadoEditado: string,
  emailUsuarioActual: string,
): boolean {
  if (!emailUsuarioActual) return true;
  return emailEmpleadoEditado.toLowerCase() !== emailUsuarioActual.toLowerCase();
}

// RF — Registro de Productos (catálogo)

type ProductoParaDuplicado = {
  modelo: string;
  tela: string;
  disenio: string;
};

/**
 * Verifica si la combinación modelo + tela + diseño ya existe en el
 * catálogo. La comparación es insensible a mayúsculas/minúsculas y a
 * espacios al inicio/final, igual que la deduplicación de telas/diseños
 * en el selector y la verificación de colores duplicados — para que un
 * usuario no pueda registrar "Algodón" cuando ya existe "algodón " en
 * el catálogo.
 *
 * Extraído de NuevoProductoModal.tsx, donde esta misma comparación estaba
 * duplicada en dos lugares (la tarjeta de variante y el validate() del
 * modal principal) usando "===" exacto, sin normalizar.
 */
export function esVarianteProductoDuplicada<T extends ProductoParaDuplicado>(
  productosExistentes: T[],
  modelo: string,
  tela: string,
  disenio: string,
): boolean {
  if (!modelo.trim() || !tela.trim() || !disenio.trim()) return false;

  const modeloNorm = modelo.trim().toLowerCase();
  const telaNorm = tela.trim().toLowerCase();
  const disenioNorm = disenio.trim().toLowerCase();

  return productosExistentes.some(
    (p) =>
      p.modelo.trim().toLowerCase() === modeloNorm &&
      p.tela.trim().toLowerCase() === telaNorm &&
      p.disenio.trim().toLowerCase() === disenioNorm,
  );
}

// RF17 — Registro de Motivo de Cancelación

/**
 * Verifica que el motivo de cancelación de un pedido sea una explicación
 * válida: no vacío, no compuesto solo por espacios, y no compuesto
 * únicamente por caracteres que no forman una explicación real (signos de
 * puntuación, símbolos sueltos como "???", "...", "!!!", etc.).
 *
 * Exige al menos una letra o número en el texto. Esto permite motivos con
 * puntuación normal ("Cliente cambió de opinión.") pero rechaza entradas
 * que no comunican ninguna razón real.
 */
export function esMotivoCancelacionValido(motivo: string): boolean {
  const motivoTrim = motivo.trim();
  if (!motivoTrim) return false;
  return /[a-zA-Z0-9áéíóúÁÉÍÓÚüÜñÑ]/.test(motivoTrim);
}

// RF23 — Cierre de Sesión

/**
 * Determina si un cambio en localStorage, detectado mediante el evento
 * nativo "storage" del navegador, corresponde a un cierre de sesión de
 * Supabase ocurrido en OTRA pestaña, y por lo tanto amerita revalidar la
 * sesión en la pestaña actual.
 *
 * Supabase guarda su token de sesión bajo una clave con el patrón
 * "sb-{projectId}-auth-token". El evento "storage" se dispara en las demás
 * pestañas (no en la que originó el cambio) cuando esa clave se modifica o
 * elimina. Un logout ocurre cuando:
 *   - se borró localStorage por completo (key === null), o
 *   - la clave de sesión de Supabase quedó sin valor (newValue vacío/null).
 *
 * Extraído de ProtectedRoute.tsx para poder testearlo de forma aislada,
 * sin necesidad de simular un StorageEvent real del navegador.
 */
export function debeRevalidarSesionPorStorage(
  key: string | null,
  newValue: string | null,
): boolean {
  if (key === null) return true; // localStorage.clear()

  const esClaveDeSesionSupabase =
    key.startsWith("sb-") && key.endsWith("-auth-token");
  if (!esClaveDeSesionSupabase) return false;

  return !newValue; // la clave de sesión quedó vacía o fue eliminada
}

// RF30 — Filtro por Rango de Fechas

/**
 * Formato exacto "YYYY-MM-DD" con año de 4 dígitos, mes 01-12 y día
 * 01-31. No valida días por mes (ej. 31 de febrero pasa este regex),
 * porque <input type="date"> ya impide esos casos en uso normal; lo
 * que esta regex sí bloquea es justamente el caso del bug reportado:
 * un año con más (o menos) de 4 dígitos, como "20255-06-26".
 */
const FORMATO_FECHA_ISO = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

/**
 * Verifica que un rango de fechas sea válido: si ambas fechas están
 * presentes, deben tener el formato exacto "YYYY-MM-DD" (el mismo que
 * produce formatearFechaISO y un <input type="date">) con año de 4
 * dígitos, y la fecha inicial no puede ser posterior a la fecha final.
 *
 * El control nativo <input type="date"> permite, mientras se está
 * editando el sub-campo de año (especialmente en Chrome/Edge), escribir
 * más de 4 dígitos antes de que el usuario complete el resto de la
 * fecha (ej. "20255-06-26"). Sin la validación de formato, la
 * comparación lexicográfica de strings ("20255-06-26" <= "2026-06-26")
 * da resultados sin sentido cronológico y el filtro se aplicaba con una
 * fecha basura sin avisar al usuario. Por eso cualquier fecha presente
 * que no respete el formato exacto se trata como rango inválido, igual
 * que un "fecha inicial > fecha final": se ignora el filtro y se
 * muestra el aviso correspondiente.
 *
 * Si falta alguna de las dos fechas, no hay rango que comparar todavía,
 * así que se considera válido (la validación de "campo obligatorio" es
 * responsabilidad de otra capa, no de esta función).
 */
export function esRangoDeFechasValido(
  fechaDesde: string,
  fechaHasta: string,
): boolean {
  if (!fechaDesde || !fechaHasta) return true;
  if (!FORMATO_FECHA_ISO.test(fechaDesde)) return false;
  if (!FORMATO_FECHA_ISO.test(fechaHasta)) return false;
  return fechaDesde <= fechaHasta;
}
