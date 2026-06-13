import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { useSearchParams } from "react-router";

import {
  Scissors,
  ClipboardList,
  Search,
  Plus,
  LogOut,
  Clock,
  CheckCircle2,
  AlertCircle,
  Package,
  ChevronRight,
  Phone,
  Mail,
  User,
  X,
  Loader2,
  Users,
  MapPin,
  CreditCard,
  CheckCircle,
  ArrowUp,
  ArrowDown,
  Edit2,
  XCircle,
  FileText,
  Filter,
  AlertTriangle,
  History,
  Coins,
  ShoppingBag,
  Layers,
} from "lucide-react";
import { toast } from "sonner";
import { NuevoPedidoModal, type NuevoPedidoOutput } from "./NuevoPedidoModal";
import { NuevoProductoModal } from "./NuevoProductoModal";
import { EditarProductoModal } from "./EditarProductoModal";
import {
  usePedidos,
  type EstadoPedido,
  type Pedido,
} from "../contexts/PedidosContext";
import { useClientes } from "../contexts/ClientesContext";
import {
  useProductos,
  type ProductoCatalogo,
} from "../contexts/ProductosContext";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { useNotificaciones } from "../contexts/NotificacionesContext";
import { usePagos } from "../contexts/PagosContext";
import {
  obtenerSiguienteEstado,
  esEstadoFinal,
  puedeCancelarPedido,
  puedeEditarPedido,
} from "../utils/pedidosCicloVida";
import { HistorialClienteModal } from "./HistorialClienteModal";
import { DetallePedidoModal } from "./DetallePedidoModal";
import { EditarClienteModal } from "./EditarClienteModal";
import { EditarPedidoModal } from "./EditarPedidoModal";
import { PanelNotificaciones } from "./PanelNotificaciones";
import { RegistrarPagoModal } from "./RegistrarPagoModal";
import { supabase } from "../../lib/supabase";
import { formatearSoles } from "../utils/formatoMoneda";
import {
  obtenerFechaPeruHoy,
  formatearFechaHoraPeru,
  formatearFechaCorta,
} from "../../utils/fechas";
import {
  esPedidoVencido,
  diasHastaVencimiento,
  esNombreValido,
  esEmailConProveedorPermitido,
  esDireccionValida,
  soloNumeros,
} from "../utils/validaciones";

// ─── Datos de pedidos ────────────────────────────────────────────────────────

const estadoConfig: Record<
  EstadoPedido,
  { color: string; icon: React.ReactNode }
> = {
  Recibido: {
    color: "bg-indigo-100 text-indigo-700 border-indigo-200",
    icon: <Clock className="w-3 h-3" />,
  },
  "En confección": {
    color: "bg-blue-100 text-blue-700 border-blue-200",
    icon: <Loader2 className="w-3 h-3 animate-spin" />,
  },
  "Listo para entrega": {
    color: "bg-emerald-100 text-emerald-700 border-emerald-200",
    icon: <Package className="w-3 h-3" />,
  },
  Entregado: {
    color: "bg-gray-100 text-gray-500 border-gray-200",
    icon: <CheckCircle2 className="w-3 h-3" />,
  },
  Cancelado: {
    color: "bg-red-100 text-red-700 border-red-200",
    icon: <XCircle className="w-3 h-3" />,
  },
  Vencido: {
    color: "bg-red-200 text-red-800 border-red-300",
    icon: <XCircle className="w-3 h-3" />,
  },
};

// ─── Datos de clientes ───────────────────────────────────────────────────────

export type Cliente = {
  id: string;
  codigo: string;
  nombre: string;
  email: string | null;
  celular: string;
  direccion: string | null;
  dni: string;
  ruc: string | null;
  fechaRegistro: string;
};

// ─── Tipos ──────────────────────────────────────────────────────────────────

type FormData = {
  nombre: string;
  email: string;
  celular: string;
  direccion: string;
  dni: string;
  ruc: string;
};

type FormErrors = Partial<Record<keyof FormData, string>>;

const emptyForm: FormData = {
  nombre: "",
  email: "",
  celular: "",
  direccion: "",
  dni: "",
  ruc: "",
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function generateClienteId(lista: Cliente[]) {
  const max = lista.reduce((acc, c) => {
    const n = parseInt(c.id.replace("CLI-", ""), 10);
    return n > acc ? n : acc;
  }, 0);
  return `CLI-${String(max + 1).padStart(4, "0")}`;
}

function validateForm(data: FormData): FormErrors {
  const errors: FormErrors = {};

  // Validar nombre: solo letras y espacios
  if (!data.nombre.trim()) {
    errors.nombre = "El nombre es obligatorio.";
  } else if (!esNombreValido(data.nombre)) {
    errors.nombre = "El nombre solo puede contener letras y espacios.";
  }

  // Validar celular
  if (!data.celular.trim()) {
    errors.celular = "El celular es obligatorio.";
  } else if (!/^9\d{8}$/.test(data.celular.replace(/\s/g, ""))) {
    errors.celular = "Número inválido (9 dígitos, empieza en 9).";
  }

  // Validar DNI: solo números y exactamente 8 dígitos
  if (!data.dni.trim()) {
    errors.dni = "El DNI es obligatorio.";
  } else if (!soloNumeros(data.dni)) {
    errors.dni = "El DNI solo puede contener números.";
  } else if (!/^\d{8}$/.test(data.dni.trim())) {
    errors.dni = "El DNI debe tener exactamente 8 dígitos.";
  }

  // Validar email con proveedores permitidos
  if (data.email.trim()) {
    if (!esEmailConProveedorPermitido(data.email)) {
      errors.email =
        "El correo debe ser de @gmail.com, @outlook.com o @hotmail.com";
    }
  }

  // Validar dirección
  if (data.direccion.trim() && !esDireccionValida(data.direccion)) {
    errors.direccion = "La dirección contiene caracteres no válidos.";
  }

  // Validar RUC: solo números
  if (data.ruc.trim()) {
    if (!soloNumeros(data.ruc)) {
      errors.ruc = "El RUC solo puede contener números.";
    } else if (!/^(10|20)\d{9}$/.test(data.ruc.trim())) {
      errors.ruc = "El RUC debe tener 11 dígitos y comenzar con 10 o 20.";
    }
  }

  return errors;
}

// ─── Modal de registro ──────────────────────────────────────────────────────

type ModalStep = "form" | "confirmacion" | "exito" | "guardando";

function NuevoClienteModal({
  onClose,
  onGuardar,
  clientesExistentes,
}: {
  onClose: () => void;
  onGuardar: (c: Cliente) => Promise<void>;
  clientesExistentes: Cliente[];
}) {
  const [step, setStep] = useState<ModalStep>("form");
  const [form, setForm] = useState<FormData>(emptyForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const [guardando, setGuardando] = useState(false);
  const [nuevoCliente, setNuevoCliente] = useState<Cliente | null>(null);

  // Detección de duplicados en tiempo real solo para DNI y RUC
  const dniTrim = form.dni.trim();
  const rucTrim = form.ruc.trim();
  const dupDni =
    dniTrim.length === 8
      ? clientesExistentes.find((c) => c.dni === dniTrim)
      : undefined;
  const dupRuc =
    rucTrim.length === 11
      ? clientesExistentes.find((c) => c.ruc === rucTrim)
      : undefined;

  const handleChange = (field: keyof FormData, value: string) => {
    let finalValue = value;

    // Validar en tiempo real y filtrar caracteres no permitidos
    if (field === "nombre") {
      // Solo letras y espacios
      finalValue = value.replace(/[^a-zA-ZáéíóúñÁÉÍÓÚÑ\s]/g, "");
    } else if (field === "celular") {
      // Solo números, máximo 9 dígitos para Perú
      finalValue = value.replace(/\D/g, "").slice(0, 9);
    } else if (field === "dni") {
      // Solo números, máximo 8 dígitos
      finalValue = value.replace(/\D/g, "").slice(0, 8);
    } else if (field === "ruc") {
      // Solo números, máximo 11 dígitos
      finalValue = value.replace(/\D/g, "").slice(0, 11);
    } else if (field === "direccion") {
      // Solo caracteres válidos para direcciones
      finalValue = value.replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ\s\.,#\-\/]/g, "");
    } else if (field === "email") {
      // Convertir a minúsculas para validación
      finalValue = value.toLowerCase();
    }

    setForm((f) => ({ ...f, [field]: finalValue }));
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }));
  };

  const handleGuardar = () => {
    const errs = validateForm(form);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    if (dupDni || dupRuc) return; // bloqueado por duplicado en tiempo real

    setStep("confirmacion");
  };

  const handleConfirmar = async () => {
    setGuardando(true);
    try {
      const nuevo: Cliente = {
        id: generateClienteId(clientesExistentes),
        codigo: generateClienteId(clientesExistentes),
        nombre: form.nombre.trim(),
        email: form.email.trim() || null,
        celular: form.celular.trim(),
        direccion: form.direccion.trim() || null,
        dni: form.dni.trim(),
        ruc: form.ruc.trim() || null,
        fechaRegistro: obtenerFechaPeruHoy(),
      };
      setNuevoCliente(nuevo);
      await onGuardar(nuevo);
      setStep("exito");
    } catch (error) {
      console.error("Error al guardar cliente:", error);
    } finally {
      setGuardando(false);
    }
  };

  const field = (
    id: keyof FormData,
    label: string,
    placeholder: string,
    icon: React.ReactNode,
    required = true,
    type = "text",
  ) => (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="text-sm text-foreground flex items-center gap-1"
      >
        {label}
        {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          {icon}
        </span>
        <input
          id={id}
          type={type}
          placeholder={placeholder}
          value={form[id]}
          onChange={(e) => handleChange(id, e.target.value)}
          className={`w-full pl-9 pr-4 py-2.5 rounded-lg bg-input-background border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20 transition ${
            errors[id] ? "border-red-400 focus:ring-red-200" : "border-border"
          }`}
        />
      </div>
      {errors[id] && <p className="text-xs text-red-500">{errors[id]}</p>}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={step !== "guardando" ? onClose : undefined}
      />

      <div className="relative z-10 bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* ── Formulario ── */}
        {step === "form" && (
          <>
            <div className="flex items-center justify-between px-6 py-5 border-b border-border">
              <div>
                <h3 className="text-foreground">Nuevo cliente</h3>
                <p className="text-muted-foreground text-sm mt-0.5">
                  Completa los datos del cliente
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-accent transition"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4 max-h-[65vh] overflow-y-auto">
              {field(
                "nombre",
                "Nombre completo",
                "Ej. María Torres",
                <User className="w-4 h-4" />,
              )}
              {field(
                "celular",
                "Número de celular",
                "Ej. 987 654 321",
                <Phone className="w-4 h-4" />,
              )}
              {field(
                "email",
                "Correo electrónico",
                "Ej. cliente@email.com",
                <Mail className="w-4 h-4" />,
                false,
                "email",
              )}
              {field(
                "direccion",
                "Dirección",
                "Ej. Av. Arequipa 1234",
                <MapPin className="w-4 h-4" />,
                false,
              )}

              <div className="grid grid-cols-2 gap-4">
                {/* DNI */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="dni"
                    className="text-sm text-foreground flex items-center gap-1"
                  >
                    DNI <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      id="dni"
                      type="text"
                      placeholder="Ej. 12345678"
                      value={form.dni}
                      onChange={(e) => handleChange("dni", e.target.value)}
                      className={`w-full pl-9 pr-4 py-2.5 rounded-lg bg-input-background border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 transition ${
                        errors.dni
                          ? "border-red-400 focus:ring-red-200"
                          : dupDni
                            ? "border-red-400 focus:ring-red-200"
                            : "border-border focus:ring-foreground/20"
                      }`}
                    />
                  </div>
                  {errors.dni && (
                    <p className="text-xs text-red-500">{errors.dni}</p>
                  )}
                  {!errors.dni && dupDni && (
                    <div className="flex items-start gap-1.5 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-2.5 py-1.5">
                      <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
                      <span>
                        DNI ya registrado: <strong>{dupDni.nombre}</strong> (
                        {dupDni.id})
                      </span>
                    </div>
                  )}
                </div>

                {/* RUC */}
                <div className="space-y-1.5">
                  <label htmlFor="ruc" className="text-sm text-foreground">
                    RUC
                  </label>
                  <div className="relative">
                    <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      id="ruc"
                      type="text"
                      placeholder="Ej. 20123456789"
                      value={form.ruc}
                      onChange={(e) => handleChange("ruc", e.target.value)}
                      className={`w-full pl-9 pr-4 py-2.5 rounded-lg bg-input-background border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 transition ${
                        errors.ruc
                          ? "border-red-400 focus:ring-red-200"
                          : dupRuc
                            ? "border-red-400 focus:ring-red-200"
                            : "border-border focus:ring-foreground/20"
                      }`}
                    />
                  </div>
                  {errors.ruc && (
                    <p className="text-xs text-red-500">{errors.ruc}</p>
                  )}
                  {!errors.ruc && dupRuc && (
                    <div className="flex items-start gap-1.5 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-2.5 py-1.5">
                      <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
                      <span>
                        RUC ya registrado: <strong>{dupRuc.nombre}</strong> (
                        {dupRuc.id})
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <p className="text-xs text-muted-foreground pt-1">
                Los campos marcados con <span className="text-red-500">*</span>{" "}
                son obligatorios.
              </p>
            </div>

            <div className="px-6 py-4 border-t border-border flex gap-3 justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg border border-border text-foreground text-sm hover:bg-accent transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleGuardar}
                className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition"
              >
                Guardar
              </button>
            </div>
          </>
        )}

        {/* ── Confirmación ── */}
        {step === "confirmacion" && (
          <div className="px-6 py-8 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center mx-auto">
              <Users className="w-7 h-7 text-blue-600" />
            </div>
            <div>
              <h3 className="text-foreground">¿Confirmar registro?</h3>
              <p className="text-muted-foreground text-sm mt-1">
                Revisá los datos antes de guardar.
              </p>
            </div>
            <div className="bg-muted rounded-xl px-5 py-4 text-left space-y-2 text-sm">
              {(
                [
                  ["Nombre", form.nombre],
                  ["Celular", form.celular],
                  ["DNI", form.dni],
                  ...(form.email ? [["Correo", form.email]] : []),
                  ...(form.direccion ? [["Dirección", form.direccion]] : []),
                  ...(form.ruc ? [["RUC", form.ruc]] : []),
                ] as [string, string][]
              ).map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4">
                  <span className="text-muted-foreground shrink-0">
                    {label}
                  </span>
                  <span className="text-foreground text-right">{value}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-3 justify-center pt-2">
              <button
                onClick={() => setStep("form")}
                disabled={guardando}
                className="px-4 py-2 rounded-lg border border-border text-foreground text-sm hover:bg-accent transition disabled:opacity-50"
              >
                Editar
              </button>
              <button
                onClick={handleConfirmar}
                disabled={guardando}
                className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition flex items-center gap-2 disabled:opacity-60"
              >
                {guardando && <Loader2 className="w-4 h-4 animate-spin" />}
                Guardar cliente
              </button>
            </div>
          </div>
        )}

        {/* ── Éxito ── */}
        {step === "exito" && nuevoCliente && (
          <div className="px-6 py-8 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
              <CheckCircle className="w-7 h-7 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-foreground">Cliente registrado</h3>
              <p className="text-muted-foreground text-sm mt-1">
                El cliente fue guardado exitosamente en el sistema.
              </p>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-4 space-y-1">
              <p className="text-sm text-emerald-800">{nuevoCliente.nombre}</p>
              <p className="text-xs text-emerald-700 font-mono">
                Código asignado:{" "}
                <span className="font-semibold">{nuevoCliente.id}</span>
              </p>
            </div>
            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition"
            >
              Aceptar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Productos iniciales ─────────────────────────────────────────────────────

// ─── Modal de edición de cliente ─────────────────────────────────────────────

type EditFormData = {
  nombre: string;
  email: string;
  celular: string;
  direccion: string;
};
type EditFormErrors = Partial<Record<keyof EditFormData, string>>;

function validateEditForm(data: EditFormData): EditFormErrors {
  const errors: EditFormErrors = {};
  if (!data.nombre.trim()) errors.nombre = "El nombre es obligatorio.";
  if (!data.email.trim()) errors.email = "El correo es obligatorio.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email))
    errors.email = "Ingresa un correo válido.";
  if (!data.celular.trim()) errors.celular = "El celular es obligatorio.";
  else if (!/^9\d{8}$/.test(data.celular.replace(/\s/g, "")))
    errors.celular = "Número inválido (9 dígitos, empieza en 9).";
  if (!data.direccion.trim()) errors.direccion = "La dirección es obligatoria.";
  return errors;
}

export function EmpleadoDashboard() {
  const navigate = useNavigate();
  const currentUser = useCurrentUser();
  const {
    pedidos,
    agregarPedido,
    actualizarPedido,
    cancelarPedido,
    reactivarPedido,
    refetch: refetchPedidos,
    loading: loadingPedidos,
  } = usePedidos();
  const {
    clientes,
    agregarCliente,
    actualizarCliente,
    loading: loadingClientes,
  } = useClientes();
  const {
    productos,
    loading: loadingProductos,
    agregarProducto,
    actualizarProducto,
    refetch: refetchProductos,
  } = useProductos();
  const { agregarNotificacion, enviarEmailCambioEstado } = useNotificaciones();
  const { obtenerInfoPagoPedido } = usePagos();
  const [searchParams, setSearchParams] = useSearchParams();
  const seccion = (searchParams.get("seccion") ?? "pedidos") as
    | "pedidos"
    | "clientes"
    | "pagos"
    | "catalogo";
  const setSeccion = (s: "pedidos" | "clientes" | "pagos" | "catalogo") =>
    setSearchParams({ seccion: s });

  // Fecha actual formateada en zona horaria de Perú
  const fechaActual = formatearFechaHoraPeru(new Date()).split(",")[0];
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("Todos");
  const [filtroPrioridad, setFiltroPrioridad] = useState("Todas");
  const [ordenFecha, setOrdenFecha] = useState<"desc" | "asc">("desc");
  const [tabPedidos, setTabPedidos] = useState<"normales" | "especiales">(
    "normales",
  );
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState<Pedido | null>(
    null,
  );
  const [busquedaCliente, setBusquedaCliente] = useState("");
  const [modalAbierto, setModalAbierto] = useState(false);
  const [modalPedidoAbierto, setModalPedidoAbierto] = useState(false);
  const [clienteEditando, setClienteEditando] = useState<Cliente | null>(null);
  const [modalCancelarAbierto, setModalCancelarAbierto] = useState(false);
  const [motivoCancelacion, setMotivoCancelacion] = useState("");
  const [mostrarFiltrosAvanzados, setMostrarFiltrosAvanzados] = useState(false);
  const [errorAlerta, setErrorAlerta] = useState<string | null>(null);
  const [clienteHistorial, setClienteHistorial] = useState<Cliente | null>(
    null,
  );
  const [pedidoDetalle, setPedidoDetalle] = useState<Pedido | null>(null);
  const [modalCambiarEstadoAbierto, setModalCambiarEstadoAbierto] =
    useState(false);
  const [pedidoEditando, setPedidoEditando] = useState<Pedido | null>(null);
  const [modalPagoAbierto, setModalPagoAbierto] = useState(false);
  const [infoPagoPedido, setInfoPagoPedido] = useState<{
    montoTotal: number;
    montoPagado: number;
    estadoPago: string;
  } | null>(null);
  const [busquedaPagos, setBusquedaPagos] = useState("");
  const [filtroPagos, setFiltroPagos] = useState<
    "Todos" | "Sin pagar" | "Pago parcial" | "Pagados"
  >("Todos");

  // Estados para la sección de catálogo
  const [busquedaProducto, setBusquedaProducto] = useState("");
  const [expandedProductos, setExpandedProductos] = useState<Set<string>>(
    new Set(),
  );
  const [modalProductoAbierto, setModalProductoAbierto] = useState(false);
  const [productoEditando, setProductoEditando] =
    useState<ProductoCatalogo | null>(null);

  const toggleExpanded = (id: string) =>
    setExpandedProductos((prev) => {
      const nuevo = new Set(prev);
      nuevo.has(id) ? nuevo.delete(id) : nuevo.add(id);
      return nuevo;
    });

  // Función para validar si puede ver una sección según sus permisos
  const puedeVer = (
    seccionName: "pedidos" | "clientes" | "pagos" | "catalogo",
  ): boolean => {
    // Si es administrador, puede ver todo
    if (currentUser.rol === "Administrador") return true;

    const permisos = currentUser.permisos || [];

    // Validar permisos específicos por sección
    switch (seccionName) {
      case "pedidos":
        return permisos.some((p) =>
          [
            "ver_pedidos",
            "crear_pedidos",
            "editar_pedidos",
            "cambiar_estado_pedidos",
          ].includes(p),
        );
      case "clientes":
        return permisos.some((p) =>
          [
            "ver_clientes",
            "crear_clientes",
            "editar_clientes",
            "ver_historial_clientes",
          ].includes(p),
        );
      case "pagos":
        return permisos.some((p) =>
          ["ver_pagos", "registrar_pagos"].includes(p),
        );
      case "catalogo":
        return permisos.includes("ver_catalogo");
      default:
        return false;
    }
  };

  // Si la sección actual no está permitida, cambiar a una que sí lo esté
  useEffect(() => {
    // Si solo tiene ver_catalogo, ir directamente al catálogo
    if (
      currentUser.permisos?.length === 1 &&
      currentUser.permisos.includes("ver_catalogo")
    ) {
      setSeccion("catalogo");
      return;
    }

    if (!puedeVer(seccion)) {
      if (puedeVer("pedidos")) setSeccion("pedidos");
      else if (puedeVer("clientes")) setSeccion("clientes");
      else if (puedeVer("pagos")) setSeccion("pagos");
      else if (puedeVer("catalogo")) setSeccion("catalogo");
    }
  }, [currentUser.permisos, currentUser.rol]);

  const handleNuevoPedidoGuardado = async (output: NuevoPedidoOutput) => {
    setErrorAlerta(null);

    const resultado = await agregarPedido({
      clienteId: output.clienteId,
      articulo: output.articulo,
      urgente: output.urgente,
      notas: output.notas,
      fechaEntrega: output.fechaEntrega,
      tipoPedido: output.tipoPedido,
      items: output.items.map((item) => ({
        productoCodigo: item.productoCodigo,
        modelo: item.modelo,
        tela: item.tela,
        disenio: item.disenio,
        talla: item.talla,
        color: item.color,
        cantidad: item.cantidad,
        precioUnitario: item.precioUnitario,
        esEspecial: item.esEspecial ?? false, // ← agregar esto
      })),
    });

    if (resultado) {
      setModalPedidoAbierto(false);
      toast.success(`Pedido ${resultado.codigo} creado exitosamente`);

      // Venta directa: el pedido nace en "Entregado" → notificar si corresponde
      if (resultado.tipoPedido === "venta_directa") {
        const estadosNotificables = resultado.notificarEstados ?? ["Entregado"];
        const debeNotificar = estadosNotificables.includes("Entregado");
        let emailEnviado = false;

        if (debeNotificar) {
          // ✅ Fix: usar output.items en lugar de resultado.items
          // resultado.items siempre es undefined al momento de crear porque
          // agregarPedido no lo incluye en pedidoConvertido (solo lo hace fetchPedidos).
          // output.items sí tiene los datos completos que vienen del modal.
          const primerItem = output.items?.[0];
          emailEnviado = await enviarEmailCambioEstado({
            clienteNombre: resultado.cliente,
            clienteEmail: resultado.email,
            pedidoCodigo: resultado.codigo,
            pedidoNombre: resultado.articulo,
            pedidoDescripcion: output.items?.length
              ? output.items.map((i) => `${i.cantidad}x ${i.modelo}`).join(", ")
              : resultado.articulo,
            color: primerItem?.color ?? "—",
            talla: primerItem?.talla ?? "—",
            precio: resultado.montoTotal
              ? `S/ ${resultado.montoTotal.toFixed(2)}`
              : "—",
            fechaEntrega: resultado.fechaEntrega
              ? new Date(
                  resultado.fechaEntrega + "T12:00:00",
                ).toLocaleDateString("es-PE", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })
              : "Por confirmar",
            articulo: resultado.articulo,
            estadoAnterior: "Recibido",
            estadoNuevo: "Entregado",
          });
        }

        agregarNotificacion({
          tipo: "exito",
          titulo: "Venta directa registrada",
          mensaje: `El pedido ${resultado.codigo} fue creado y entregado directamente`,
          pedidoCodigo: resultado.codigo,
          estadoAnterior: "Recibido",
          estadoNuevo: "Entregado",
          emailEnviado,
        });
      }

      // Refrescar stock de productos inmediatamente tras crear el pedido
      await refetchProductos();
    } else {
      setErrorAlerta(
        "No se pudo crear el pedido. Verifica los datos e intenta nuevamente.",
      );
    }
  };

  const handleConfirmarCambioEstado = async () => {
    if (!pedidoSeleccionado) return;

    const siguiente = obtenerSiguienteEstado(
      pedidoSeleccionado.estado as EstadoPedido,
    );
    if (!siguiente) return;

    setErrorAlerta(null);
    const estadoAnterior = pedidoSeleccionado.estado;
    const exito = await actualizarPedido(pedidoSeleccionado.codigo, {
      estado: siguiente,
    });

    if (exito) {
      setPedidoSeleccionado((prev) =>
        prev && prev.codigo === pedidoSeleccionado.codigo
          ? { ...prev, estado: siguiente }
          : prev,
      );

      // Extraer datos del primer item (si existe)
      const primerItem = pedidoSeleccionado.items?.[0];

      // Determinar si este estado dispara notificación según tipo de pedido
      const estadosNotificables =
        pedidoSeleccionado.notificarEstados ??
        (pedidoSeleccionado.tipoPedido === "venta_directa"
          ? ["Entregado"]
          : ["Listo para entrega", "Entregado"]);
      const debeNotificar = estadosNotificables.includes(siguiente);

      // Construir descripción completa de todos los items
      const itemsResumen =
        pedidoSeleccionado.items && pedidoSeleccionado.items.length > 0
          ? pedidoSeleccionado.items
              .map(
                (i) =>
                  `${i.cantidad}x ${i.modelo} (Talla ${i.talla} · ${i.color})`,
              )
              .join("\n")
          : pedidoSeleccionado.articulo;

      // Resumen de tallas y colores para campos individuales
      const tallasResumen =
        pedidoSeleccionado.items && pedidoSeleccionado.items.length > 0
          ? [...new Set(pedidoSeleccionado.items.map((i) => i.talla))].join(
              ", ",
            )
          : "—";
      const coloresResumen =
        pedidoSeleccionado.items && pedidoSeleccionado.items.length > 0
          ? [...new Set(pedidoSeleccionado.items.map((i) => i.color))].join(
              ", ",
            )
          : "—";

      // Texto del notice según estado nuevo
      const noticeTexto: Record<string, string> = {
        "Listo para entrega":
          "¡Tu pedido está listo para ser recogido! Puedes pasar a buscarlo cuando gustes.",
        Entregado:
          "¡Tu pedido ha sido entregado con éxito! Gracias por confiar en Taller Szamlet.",
      };
      const noticeMsg =
        noticeTexto[siguiente] ??
        "Tu pedido está progresando según lo planificado. El equipo de Taller Szamlet está trabajando con dedicación en tu encargo.";

      let emailEnviado = false;
      if (debeNotificar) {
        emailEnviado = await enviarEmailCambioEstado({
          clienteNombre: pedidoSeleccionado.cliente,
          clienteEmail: pedidoSeleccionado.email,
          pedidoCodigo: pedidoSeleccionado.codigo,
          pedidoNombre: pedidoSeleccionado.articulo,
          pedidoDescripcion: itemsResumen,
          color: coloresResumen,
          talla: tallasResumen,
          precio: pedidoSeleccionado.montoTotal
            ? `S/ ${pedidoSeleccionado.montoTotal.toFixed(2)}`
            : "—",
          fechaEntrega: pedidoSeleccionado.fechaEntrega
            ? new Date(
                pedidoSeleccionado.fechaEntrega + "T12:00:00",
              ).toLocaleDateString("es-PE", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })
            : "Por confirmar",
          articulo: pedidoSeleccionado.articulo,
          estadoAnterior: estadoAnterior,
          estadoNuevo: siguiente,
          noticeMensaje: noticeMsg,
        });
      }

      agregarNotificacion({
        tipo: "exito",
        titulo: "Estado actualizado",
        mensaje: `El pedido ${pedidoSeleccionado.codigo} cambió de "${estadoAnterior}" a "${siguiente}"`,
        pedidoCodigo: pedidoSeleccionado.codigo,
        estadoAnterior: estadoAnterior,
        estadoNuevo: siguiente,
        emailEnviado,
      });

      console.log(
        `📧 Email ${emailEnviado ? "enviado" : "no enviado"} a ${pedidoSeleccionado.email}`,
      );
      setModalCambiarEstadoAbierto(false);
    } else {
      setErrorAlerta(
        "No se pudo cambiar el estado del pedido. Verifica que la transición sea válida.",
      );
      setModalCambiarEstadoAbierto(false);
    }
  };

  const handleCancelarPedido = async () => {
    if (!pedidoSeleccionado || !motivoCancelacion.trim()) return;

    setErrorAlerta(null);
    const exito = await cancelarPedido(
      pedidoSeleccionado.codigo,
      motivoCancelacion.trim(),
    );

    if (exito) {
      console.log(
        `📧 Notificación de cancelación enviada a ${pedidoSeleccionado.email}`,
      );
      setModalCancelarAbierto(false);
      setPedidoSeleccionado(null);
      setMotivoCancelacion("");
    } else {
      setErrorAlerta(
        "No se pudo cancelar el pedido. Verifica que el estado permita cancelación.",
      );
    }
  };

  const handleExportarPDF = () => {
    const contenido =
      seccion === "pedidos" ? pedidosFiltrados : clientesFiltrados;
    console.log(
      "📄 Exportando PDF de",
      seccion,
      "con",
      contenido.length,
      "registros",
    );
    alert(`Exportando ${contenido.length} registros de ${seccion} a PDF...`);
  };

  const handleExportarPedidoIndividualPDF = async (pedido: Pedido) => {
    try {
      const { default: jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");

      const doc = new jsPDF();
      const clienteDelPedido = clientes.find((c) => c.id === pedido.clienteId);

      doc.setFontSize(18);
      doc.setFont("", "bold");
      doc.text("Detalle del Pedido", 14, 20);

      doc.setFontSize(10);
      doc.setFont("", "normal");
      doc.text(`Código: ${pedido.codigo}`, 14, 28);
      doc.text(`Generado: ${formatearFechaHoraPeru(new Date())}`, 14, 34);

      doc.setFontSize(11);
      doc.setFont("", "bold");
      doc.text("Información del Cliente", 14, 44);

      doc.setFontSize(9);
      doc.setFont("", "normal");
      doc.text(`Nombre: ${clienteDelPedido?.nombre ?? pedido.cliente}`, 14, 50);
      doc.text(`Código: ${clienteDelPedido?.codigo ?? "-"}`, 14, 56);
      doc.text(`DNI: ${clienteDelPedido?.dni ?? "-"}`, 14, 62);
      doc.text(`Celular: ${clienteDelPedido?.celular ?? "-"}`, 14, 68);

      doc.setFontSize(11);
      doc.setFont("", "bold");
      doc.text("Información del Pedido", 14, 78);

      doc.setFontSize(9);
      doc.setFont("", "normal");
      doc.text(`Artículo: ${pedido.articulo}`, 14, 84);
      doc.text(`Fecha: ${formatearFechaCorta(pedido.fecha)}`, 14, 90);
      doc.text(`Estado: ${pedido.estado}`, 14, 96);
      if (pedido.fechaEntrega) {
        doc.text(
          `Fecha de entrega: ${formatearFechaCorta(pedido.fechaEntrega)}`,
          14,
          102,
        );
      }

      let startY = 112;
      if (pedido.items && pedido.items.length > 0) {
        autoTable(doc, {
          head: [["Producto", "Talla", "Color", "Cantidad"]],
          body: pedido.items.map((item) => [
            item.productoNombre || item.productoId,
            item.talla,
            item.color,
            String(item.cantidad),
          ]),
          startY,
          theme: "striped",
          headStyles: {
            fillColor: [37, 99, 235],
            textColor: 255,
            fontStyle: "bold",
            fontSize: 9,
          },
          bodyStyles: {
            fontSize: 8,
            textColor: 50,
          },
          margin: { left: 14, right: 14 },
        });
      }

      const nombreArchivo = `pedido_${pedido.codigo}_${obtenerFechaPeruHoy()}.pdf`;
      doc.save(nombreArchivo);
    } catch (error) {
      console.error("❌ Error al generar PDF del pedido:", error);
    }
  };

  const pedidosFiltrados = pedidos
    .filter((p) => {
      const matchBusqueda =
        p.cliente.toLowerCase().includes(busqueda.toLowerCase()) ||
        p.id.toLowerCase().includes(busqueda.toLowerCase()) ||
        p.articulo.toLowerCase().includes(busqueda.toLowerCase());
      const matchEstado = filtroEstado === "Todos" || p.estado === filtroEstado;
      const matchPrioridad =
        filtroPrioridad === "Todas" ||
        (filtroPrioridad === "Urgente" && p.urgente) ||
        (filtroPrioridad === "Normal" && !p.urgente);

      return matchBusqueda && matchEstado && matchPrioridad;
    })
    .sort((a, b) => {
      const na = parseInt(a.id.replace("PED-", ""), 10);
      const nb = parseInt(b.id.replace("PED-", ""), 10);
      return ordenFecha === "desc" ? nb - na : na - nb;
    });

  const pedidosNormalesFiltrados = pedidosFiltrados.filter(
    (p) => !p.tieneEspeciales,
  );
  const pedidosEspecialesFiltrados = pedidosFiltrados.filter(
    (p) => p.tieneEspeciales === true,
  );
  const pedidosTabActual =
    tabPedidos === "normales"
      ? pedidosNormalesFiltrados
      : pedidosEspecialesFiltrados;
  const clientesFiltrados = clientes.filter(
    (c) =>
      c.nombre.toLowerCase().includes(busquedaCliente.toLowerCase()) ||
      c.dni.includes(busquedaCliente) ||
      (c.email?.toLowerCase().includes(busquedaCliente.toLowerCase()) ?? false),
  );

  const fechaHoy = obtenerFechaPeruHoy();

  const statsPedidos = [
    {
      label: "Pedidos hoy",
      value: pedidos.filter(
        (p) => p.fecha === fechaHoy && p.estado !== "Cancelado",
      ).length,
      icon: <ClipboardList className="w-5 h-5" />,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Recibidos",
      value: pedidos.filter((p) => p.estado === "Recibido").length,
      icon: <Clock className="w-5 h-5" />,
      color: "text-indigo-600",
      bg: "bg-indigo-50",
    },
    {
      label: "En confección",
      value: pedidos.filter((p) => p.estado === "En confección").length,
      icon: <Loader2 className="w-5 h-5" />,
      color: "text-violet-600",
      bg: "bg-violet-50",
    },
    {
      label: "Listos p/ entregar",
      value: pedidos.filter((p) => p.estado === "Listo para entrega").length,
      icon: <Package className="w-5 h-5" />,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      label: "Entregados",
      value: pedidos.filter((p) => p.estado === "Entregado").length,
      icon: <CheckCircle2 className="w-5 h-5" />,
      color: "text-gray-600",
      bg: "bg-gray-100",
    },
    {
      label: "Cancelados",
      value: pedidos.filter((p) => p.estado === "Cancelado").length,
      icon: <XCircle className="w-5 h-5" />,
      color: "text-red-600",
      bg: "bg-red-50",
    },
    {
      label: "Urgentes",
      value: pedidos.filter(
        (p) =>
          p.urgente && p.estado !== "Entregado" && p.estado !== "Cancelado",
      ).length,
      icon: <AlertCircle className="w-5 h-5" />,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
  ];

  return (
    <div className="h-screen bg-background flex overflow-hidden">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-56 border-r border-border bg-card px-4 py-6 gap-1 shrink-0 h-screen overflow-y-auto">
        <div className="flex items-center gap-2.5 px-2 mb-6">
          <div className="w-8 h-8 rounded-lg bg-foreground flex items-center justify-center shrink-0">
            <Scissors className="w-4 h-4 text-background" />
          </div>
          <span className="text-foreground tracking-wide">Szamlet</span>
        </div>

        {(
          [
            {
              label: "Pedidos",
              icon: <ClipboardList className="w-4 h-4" />,
              key: "pedidos",
            },
            {
              label: "Clientes",
              icon: <Users className="w-4 h-4" />,
              key: "clientes",
            },
            {
              label: "Pagos",
              icon: <Coins className="w-4 h-4" />,
              key: "pagos",
            },
            {
              label: "Catálogo",
              icon: <ShoppingBag className="w-4 h-4" />,
              key: "catalogo",
            },
          ] as const
        )
          .filter(({ key }) => puedeVer(key))
          .map(({ label, icon, key }) => (
            <button
              key={key}
              onClick={() => setSeccion(key)}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition w-full text-left ${
                seccion === key
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              {icon} {label}
            </button>
          ))}

        <div className="mt-auto">
          <div className="px-3 py-3 rounded-lg bg-muted mb-3">
            <p className="text-xs text-muted-foreground">Conectado como</p>
            <p className="text-sm text-foreground mt-0.5">
              {currentUser.loading
                ? "Cargando..."
                : currentUser.nombre || "Usuario"}
            </p>
            <p className="text-xs text-muted-foreground">{currentUser.rol}</p>
          </div>
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition w-full"
          >
            <LogOut className="w-4 h-4" /> Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Contenido principal */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Topbar */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
          <div>
            <h3 className="text-foreground capitalize">
              {seccion === "pedidos"
                ? "Pedidos"
                : seccion === "clientes"
                  ? "Clientes"
                  : seccion === "catalogo"
                    ? "Catálogo"
                    : "Pagos"}
            </h3>
            <p className="text-muted-foreground text-sm capitalize">
              {fechaActual}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <PanelNotificaciones />
            <div className="w-8 h-8 rounded-full bg-foreground flex items-center justify-center text-background text-sm">
              {currentUser?.nombre
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase() || "SR"}
            </div>
          </div>
        </header>

        {/* Área scrollable */}
        <div className="flex-1 overflow-y-auto">
          {/* Alerta de error */}
          {errorAlerta && (
            <div className="mx-6 mt-6">
              <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-red-50 border border-red-200">
                <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-red-700">{errorAlerta}</p>
                </div>
                <button
                  onClick={() => setErrorAlerta(null)}
                  className="p-0.5 rounded hover:bg-red-100 transition"
                >
                  <X className="w-4 h-4 text-red-600" />
                </button>
              </div>
            </div>
          )}

          {/* ── Sección Catálogo ── */}
          {seccion === "catalogo" && (
            <div className="flex-1 p-6">
              <div className="space-y-5">
                {/* Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
                      <Layers className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-2xl text-foreground">
                        {productos.length}
                      </p>
                      <p className="text-xs text-muted-foreground">Productos</p>
                    </div>
                  </div>
                  <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                      <Package className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-2xl text-foreground">
                        {productos.reduce(
                          (s, p) =>
                            s +
                            p.tallas.reduce(
                              (ts, t) =>
                                ts +
                                t.colores.reduce((cs, c) => cs + c.stock, 0),
                              0,
                            ),
                          0,
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Unidades en stock
                      </p>
                    </div>
                  </div>
                  <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-2xl text-foreground">
                        {[...new Set(productos.map((p) => p.modelo))].length}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Modelos distintos
                      </p>
                    </div>
                  </div>
                </div>

                {/* Barra de búsqueda y acción */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Buscar por modelo, tela, diseño o código…"
                      value={busquedaProducto}
                      onChange={(e) => setBusquedaProducto(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-input-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20 transition text-sm"
                    />
                  </div>
                  {currentUser.permisos?.includes("crear_productos") && (
                    <button
                      onClick={() => setModalProductoAbierto(true)}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition text-sm shrink-0"
                    >
                      <Plus className="w-4 h-4" /> Agregar producto
                    </button>
                  )}
                </div>

                {/* Tabla de productos */}
                <div className="bg-card border border-border rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/40">
                          <th className="w-8 px-3 py-3" />
                          {["Modelo", "Tela", "Diseño", "Tallas", "Stock"].map(
                            (h) => (
                              <th
                                key={h}
                                className="text-left px-4 py-3 text-muted-foreground font-normal whitespace-nowrap"
                              >
                                {h}
                              </th>
                            ),
                          )}
                          <th className="px-4 py-3 text-muted-foreground font-normal text-right">
                            Acción
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const filtrados = productos.filter(
                            (p) =>
                              !busquedaProducto ||
                              p.modelo
                                .toLowerCase()
                                .includes(busquedaProducto.toLowerCase()) ||
                              p.tela
                                .toLowerCase()
                                .includes(busquedaProducto.toLowerCase()) ||
                              p.disenio
                                .toLowerCase()
                                .includes(busquedaProducto.toLowerCase()) ||
                              p.id
                                .toLowerCase()
                                .includes(busquedaProducto.toLowerCase()),
                          );
                          if (filtrados.length === 0)
                            return (
                              <tr>
                                <td
                                  colSpan={7}
                                  className="px-4 py-10 text-center text-muted-foreground text-sm"
                                >
                                  {productos.length === 0
                                    ? "No hay productos registrados aún. Agrega el primero."
                                    : "No se encontraron productos con ese criterio."}
                                </td>
                              </tr>
                            );
                          return filtrados.map((p, i) => {
                            const stockTotal = p.tallas.reduce(
                              (s, t) =>
                                s +
                                t.colores.reduce((cs, c) => cs + c.stock, 0),
                              0,
                            );
                            const isExpanded = expandedProductos.has(p.id);
                            return (
                              <React.Fragment key={p.id}>
                                <tr
                                  className={`border-b border-border hover:bg-accent/40 transition ${i % 2 === 0 ? "" : "bg-muted/20"} ${isExpanded ? "bg-accent/20" : ""}`}
                                >
                                  <td className="px-3 py-3">
                                    <button
                                      type="button"
                                      onClick={() => toggleExpanded(p.id)}
                                      className="p-1 rounded hover:bg-accent transition text-muted-foreground"
                                    >
                                      <ChevronRight
                                        className={`w-3.5 h-3.5 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                                      />
                                    </button>
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                      <div className="w-7 h-7 rounded-lg bg-foreground text-background flex items-center justify-center shrink-0">
                                        <Package className="w-3.5 h-3.5" />
                                      </div>
                                      <span className="text-foreground">
                                        {p.modelo}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-muted-foreground">
                                    {p.tela}
                                  </td>
                                  <td className="px-4 py-3 text-muted-foreground">
                                    {p.disenio}
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="flex flex-wrap gap-1">
                                      {p.tallas.map((t) => (
                                        <span
                                          key={t.talla}
                                          className={`text-xs px-1.5 py-0.5 rounded border ${
                                            t.talla === "XL"
                                              ? "bg-amber-50 text-amber-700 border-amber-200"
                                              : !["S", "M", "L", "XL"].includes(
                                                    t.talla,
                                                  )
                                                ? "bg-violet-50 text-violet-700 border-violet-200"
                                                : "bg-muted text-muted-foreground border-border"
                                          }`}
                                        >
                                          {t.talla}
                                        </span>
                                      ))}
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-foreground">
                                    {stockTotal} uds.
                                  </td>
                                  <td className="px-4 py-3 text-right">
                                    {currentUser.permisos?.includes(
                                      "editar_productos",
                                    ) && (
                                      <button
                                        type="button"
                                        onClick={() => setProductoEditando(p)}
                                        className="px-3 py-1.5 rounded-lg text-xs border border-border text-foreground hover:bg-accent transition"
                                      >
                                        Agregar tallas y colores
                                      </button>
                                    )}
                                  </td>
                                </tr>
                                {isExpanded && (
                                  <tr
                                    key={`${p.id}-detail`}
                                    className="border-b border-border bg-muted/10"
                                  >
                                    <td colSpan={8} className="px-6 py-4">
                                      <div className="space-y-3">
                                        <p className="text-xs text-muted-foreground uppercase tracking-wider">
                                          Detalle de stock — {p.modelo} ·{" "}
                                          {p.tela} · {p.disenio}
                                        </p>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                          {p.tallas.map((t) => {
                                            const stockTalla = t.colores.reduce(
                                              (s, c) => s + c.stock,
                                              0,
                                            );
                                            const esXL = t.talla === "XL";
                                            const esPersonalizada = ![
                                              "S",
                                              "M",
                                              "L",
                                              "XL",
                                            ].includes(t.talla);
                                            return (
                                              <div
                                                key={t.talla}
                                                className={`rounded-xl border p-3 space-y-2 ${esXL ? "border-amber-200 bg-amber-50/40" : esPersonalizada ? "border-violet-200 bg-violet-50/40" : "border-border bg-card"}`}
                                              >
                                                <div className="flex items-center justify-between">
                                                  <span
                                                    className={`text-sm px-2 py-0.5 rounded-full border ${esXL ? "bg-amber-100 text-amber-800 border-amber-300" : esPersonalizada ? "bg-violet-100 text-violet-800 border-violet-300" : "bg-foreground text-background border-foreground"}`}
                                                  >
                                                    {t.talla}
                                                  </span>
                                                  <span className="text-xs text-muted-foreground">
                                                    {stockTalla} uds. total
                                                  </span>
                                                </div>
                                                <div className="space-y-1">
                                                  {t.colores.map((c) => (
                                                    <div
                                                      key={c.color}
                                                      className="flex items-center justify-between text-xs"
                                                    >
                                                      <span className="text-foreground">
                                                        {c.color}
                                                      </span>
                                                      <span
                                                        className={`font-mono ${c.stock === 0 ? "text-red-500" : "text-muted-foreground"}`}
                                                      >
                                                        {c.stock} ud.
                                                      </span>
                                                    </div>
                                                  ))}
                                                  {t.colores.length === 0 && (
                                                    <p className="text-xs text-muted-foreground">
                                                      Sin colores
                                                    </p>
                                                  )}
                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            );
                          });
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Sección Pedidos ── */}
          {seccion === "pedidos" && (
            <div className="flex-1 p-6 space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
                {statsPedidos.map((s) => (
                  <div
                    key={s.label}
                    className="bg-card border border-border rounded-xl p-4 flex items-center gap-3"
                  >
                    <div
                      className={`w-10 h-10 rounded-lg ${s.bg} ${s.color} flex items-center justify-center shrink-0`}
                    >
                      {s.icon}
                    </div>
                    <div>
                      <p className="text-2xl text-foreground">{s.value}</p>
                      <p className="text-xs text-muted-foreground leading-tight">
                        {s.label}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Buscar por cliente, artículo o número de pedido…"
                      value={busqueda}
                      onChange={(e) => setBusqueda(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-input-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20 transition text-sm"
                    />
                  </div>
                  <button
                    onClick={() =>
                      setMostrarFiltrosAvanzados(!mostrarFiltrosAvanzados)
                    }
                    className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-border bg-input-background text-foreground text-sm hover:bg-accent transition shrink-0"
                  >
                    <Filter className="w-4 h-4" />
                    <span>Filtros</span>
                    {(filtroEstado !== "Todos" ||
                      filtroPrioridad !== "Todas") && (
                      <span className="w-2 h-2 rounded-full bg-primary" />
                    )}
                  </button>
                  <button
                    onClick={() => setModalPedidoAbierto(true)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition text-sm shrink-0"
                  >
                    <Plus className="w-4 h-4" /> Nuevo pedido
                  </button>
                </div>

                {/* Filtros avanzados */}
                {mostrarFiltrosAvanzados && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 bg-muted/30 rounded-lg border border-border">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1.5 block">
                        Estado
                      </label>
                      <select
                        value={filtroEstado}
                        onChange={(e) => setFiltroEstado(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20"
                      >
                        <option>Todos</option>
                        <option>Recibido</option>
                        <option>En confección</option>
                        <option>Listo para entrega</option>
                        <option>Entregado</option>
                        <option>Cancelado</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1.5 block">
                        Prioridad
                      </label>
                      <select
                        value={filtroPrioridad}
                        onChange={(e) => setFiltroPrioridad(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20"
                      >
                        <option>Todas</option>
                        <option>Normal</option>
                        <option>Urgente</option>
                      </select>
                    </div>
                    <div className="sm:col-span-2 flex gap-2">
                      <button
                        onClick={() =>
                          setOrdenFecha((o) => (o === "desc" ? "asc" : "desc"))
                        }
                        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-input-background text-foreground text-sm hover:bg-accent transition"
                      >
                        {ordenFecha === "desc" ? (
                          <ArrowDown className="w-4 h-4" />
                        ) : (
                          <ArrowUp className="w-4 h-4" />
                        )}
                        <span>
                          Ordenar:{" "}
                          {ordenFecha === "desc"
                            ? "Más reciente primero"
                            : "Más antiguo primero"}
                        </span>
                      </button>
                      <button
                        onClick={() => {
                          setFiltroEstado("Todos");
                          setFiltroPrioridad("Todas");
                        }}
                        className="px-3 py-2 rounded-lg border border-border bg-input-background text-muted-foreground text-sm hover:bg-accent transition"
                      >
                        Limpiar filtros
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Pestañas Normales / Especiales */}
              <div className="flex gap-1 p-1 bg-muted/40 rounded-xl border border-border w-fit">
                <button
                  onClick={() => setTabPedidos("normales")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition ${
                    tabPedidos === "normales"
                      ? "bg-card text-foreground shadow-sm border border-border"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Normales
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded-full ${
                      tabPedidos === "normales"
                        ? "bg-foreground text-background"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {pedidosNormalesFiltrados.length}
                  </span>
                </button>
                <button
                  onClick={() => setTabPedidos("especiales")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition ${
                    tabPedidos === "especiales"
                      ? "bg-card text-foreground shadow-sm border border-amber-200"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Especiales
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded-full ${
                      tabPedidos === "especiales"
                        ? "bg-amber-500 text-white"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {pedidosEspecialesFiltrados.length}
                  </span>
                </button>
              </div>

              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/40">
                        {[
                          "N° Pedido",
                          "Cliente",
                          "Artículo",
                          "Estado",
                          "Estado de Pago",
                          "Fecha de Entrega",
                          "",
                        ].map((h) => (
                          <th
                            key={h}
                            className="text-left px-4 py-3 text-muted-foreground font-normal"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {pedidosTabActual.map((p, i) => (
                        <tr
                          key={p.id}
                          className={`border-b border-border last:border-0 hover:bg-accent/50 transition cursor-pointer ${esPedidoVencido(p.fechaEntrega, p.estado) ? "bg-red-50/50" : i % 2 === 0 ? "" : "bg-muted/20"}`}
                          onClick={() => setPedidoSeleccionado(p)}
                        >
                          <td className="px-4 py-3 text-foreground font-mono">
                            <span className="flex items-center gap-1.5">
                              {p.urgente && (
                                <span
                                  className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0"
                                  title="Urgente"
                                />
                              )}
                              {esPedidoVencido(p.fechaEntrega, p.estado) && (
                                <span
                                  className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0"
                                  title="Vencido"
                                />
                              )}
                              {p.id}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-foreground">
                            {p.cliente}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {p.articulo}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs border ${estadoConfig[p.estado]?.color}`}
                            >
                              {estadoConfig[p.estado]?.icon}
                              {p.estado}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {(() => {
                              const montoTotal = p.montoTotal || 0;
                              const montoPagado = p.montoPagado || 0;
                              const pendiente = montoTotal - montoPagado;

                              if (p.estado === "Cancelado") {
                                return (
                                  <span className="text-xs text-muted-foreground">
                                    -
                                  </span>
                                );
                              }

                              if (pendiente <= 0 && montoTotal > 0) {
                                return (
                                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs border bg-green-50 text-green-700 border-green-200">
                                    <CheckCircle className="w-3 h-3" />
                                    Pagado
                                  </span>
                                );
                              }

                              if (montoPagado > 0 && pendiente > 0) {
                                return (
                                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs border bg-yellow-50 text-yellow-700 border-yellow-200">
                                    <Clock className="w-3 h-3" />
                                    Parcial
                                  </span>
                                );
                              }

                              return (
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs border bg-red-50 text-red-700 border-red-200">
                                  <AlertCircle className="w-3 h-3" />
                                  Pendiente
                                </span>
                              );
                            })()}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {p.fechaEntrega
                              ? formatearFechaCorta(p.fechaEntrega)
                              : "-"}
                          </td>
                          <td className="px-4 py-3">
                            <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto" />
                          </td>
                        </tr>
                      ))}
                      {pedidosFiltrados.length === 0 && (
                        <tr>
                          <td
                            colSpan={7}
                            className="px-4 py-10 text-center text-muted-foreground text-sm"
                          >
                            {busqueda || filtroEstado !== "Todos"
                              ? "No se encontraron pedidos con ese criterio."
                              : "Aún no hay pedidos registrados. Usa 'Nuevo pedido' para agregar."}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── Sección Clientes ── */}
          {seccion === "clientes" && (
            <div className="flex-1 p-6 space-y-5">
              {/* Encabezado con stats */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-2xl text-foreground">
                      {clientes.length}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Clientes totales
                    </p>
                  </div>
                </div>
                <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-2xl text-foreground">
                      {
                        clientes.filter((c) => c.fechaRegistro === fechaHoy)
                          .length
                      }
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Registrados hoy
                    </p>
                  </div>
                </div>
                <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3 col-span-2 sm:col-span-1">
                  <div className="w-10 h-10 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
                    <ClipboardList className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-2xl text-foreground">
                      {
                        clientes.filter((c) =>
                          pedidos.some(
                            (p) =>
                              p.cliente === c.nombre &&
                              p.estado !== "Entregado" &&
                              p.estado !== "Cancelado",
                          ),
                        ).length
                      }
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Con pedidos activos
                    </p>
                  </div>
                </div>
              </div>

              {/* Barra de búsqueda y acción */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Buscar por nombre, DNI o correo…"
                    value={busquedaCliente}
                    onChange={(e) => setBusquedaCliente(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-input-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20 transition text-sm"
                  />
                </div>
                <button
                  onClick={() => setModalAbierto(true)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition text-sm shrink-0"
                >
                  <Plus className="w-4 h-4" /> Nuevo cliente
                </button>
              </div>

              {/* Tabla de clientes */}
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/40">
                        {[
                          "Código",
                          "Nombre",
                          "Correo",
                          "Celular",
                          "DNI",
                          "RUC",
                          "Dirección",
                          "",
                        ].map((h) => (
                          <th
                            key={h}
                            className="text-left px-4 py-3 text-muted-foreground font-normal whitespace-nowrap"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {clientesFiltrados.map((c, i) => (
                        <tr
                          key={c.id}
                          className={`border-b border-border last:border-0 hover:bg-accent/50 transition ${i % 2 === 0 ? "" : "bg-muted/20"}`}
                        >
                          <td className="px-4 py-3 font-mono text-muted-foreground text-xs">
                            {c.codigo}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-foreground text-background flex items-center justify-center text-xs shrink-0">
                                {c.nombre
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")
                                  .slice(0, 2)
                                  .toUpperCase()}
                              </div>
                              <span className="text-foreground">
                                {c.nombre}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {c.email}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                            {c.celular}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {c.dni}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {c.ruc || (
                              <span className="text-muted-foreground/40">
                                —
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground max-w-[180px] truncate">
                            {c.direccion}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setClienteHistorial(c)}
                                className="px-3 py-1 rounded-lg border border-border text-xs text-foreground hover:bg-accent transition whitespace-nowrap flex items-center gap-1.5"
                                title="Ver historial de pedidos"
                              >
                                <History className="w-3.5 h-3.5" />
                                Historial
                              </button>
                              <button
                                onClick={() => setClienteEditando(c)}
                                className="px-3 py-1 rounded-lg border border-border text-xs text-foreground hover:bg-accent transition whitespace-nowrap"
                              >
                                Editar
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {clientesFiltrados.length === 0 && (
                        <tr>
                          <td
                            colSpan={9}
                            className="px-4 py-10 text-center text-muted-foreground text-sm"
                          >
                            {busquedaCliente
                              ? "No se encontraron clientes con ese criterio."
                              : "Aún no hay clientes registrados. Usa 'Nuevo cliente' para agregar."}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── Sección Pagos ── */}
          {seccion === "pagos" && (
            <div className="flex-1 p-6 space-y-5">
              {/* Estadísticas de pagos */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                {/* Total pendiente */}
                <button
                  onClick={() => setFiltroPagos("Todos")}
                  className={`bg-card border rounded-xl p-4 text-left transition ${
                    filtroPagos === "Todos"
                      ? "border-foreground ring-2 ring-foreground/10"
                      : "border-border hover:border-foreground/30"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                      <Coins className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-2xl text-foreground">
                        {formatearSoles(
                          pedidos
                            .filter((p) => {
                              if (p.estado === "Cancelado") return false;
                              const pendiente =
                                (p.montoTotal || 0) - (p.montoPagado || 0);
                              return pendiente > 0;
                            })
                            .reduce(
                              (sum, p) =>
                                sum +
                                ((p.montoTotal || 0) - (p.montoPagado || 0)),
                              0,
                            ),
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Total pendiente
                      </p>
                    </div>
                  </div>
                </button>

                {/* Pedidos con deuda */}
                <button
                  onClick={() => setFiltroPagos("Sin pagar")}
                  className={`bg-card border rounded-xl p-4 text-left transition ${
                    filtroPagos === "Sin pagar"
                      ? "border-red-400 ring-2 ring-red-100"
                      : "border-border hover:border-red-300"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                      <AlertCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-2xl text-foreground">
                        {
                          pedidos.filter((p) => {
                            if (p.estado === "Cancelado") return false;
                            const montoPagado = p.montoPagado || 0;
                            const montoTotal = p.montoTotal || 0;
                            return montoPagado === 0 && montoTotal > 0;
                          }).length
                        }
                      </p>
                      <p className="text-xs text-muted-foreground">Sin pagar</p>
                    </div>
                  </div>
                </button>

                {/* Pagos parciales */}
                <button
                  onClick={() => setFiltroPagos("Pago parcial")}
                  className={`bg-card border rounded-xl p-4 text-left transition ${
                    filtroPagos === "Pago parcial"
                      ? "border-yellow-400 ring-2 ring-yellow-100"
                      : "border-border hover:border-yellow-300"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-yellow-50 text-yellow-600 flex items-center justify-center shrink-0">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-2xl text-foreground">
                        {
                          pedidos.filter((p) => {
                            if (p.estado === "Cancelado") return false;
                            const montoPagado = p.montoPagado || 0;
                            const montoTotal = p.montoTotal || 0;
                            const pendiente = montoTotal - montoPagado;
                            return montoPagado > 0 && pendiente > 0;
                          }).length
                        }
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Pago parcial
                      </p>
                    </div>
                  </div>
                </button>

                {/* Pagados */}
                <button
                  onClick={() => setFiltroPagos("Pagados")}
                  className={`bg-card border rounded-xl p-4 text-left transition ${
                    filtroPagos === "Pagados"
                      ? "border-emerald-400 ring-2 ring-emerald-100"
                      : "border-border hover:border-emerald-300"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-2xl text-foreground">
                        {
                          pedidos.filter((p) => {
                            if (p.estado === "Cancelado") return false;
                            const montoTotal = p.montoTotal || 0;
                            const montoPagado = p.montoPagado || 0;
                            const pendiente = montoTotal - montoPagado;
                            return montoTotal > 0 && pendiente <= 0;
                          }).length
                        }
                      </p>
                      <p className="text-xs text-muted-foreground">Pagados</p>
                    </div>
                  </div>
                </button>
              </div>

              {/* Tabla de pedidos pendientes de pago */}
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-border">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="text-foreground font-medium">
                        {filtroPagos === "Pagados"
                          ? "Pedidos pagados"
                          : filtroPagos === "Sin pagar"
                            ? "Pedidos sin pagar"
                            : filtroPagos === "Pago parcial"
                              ? "Pedidos con pago parcial"
                              : "Pedidos con pagos pendientes"}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Gestiona los pagos de los pedidos activos
                      </p>
                    </div>
                  </div>

                  {/* Buscador */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Buscar por cliente o código de pedido..."
                      value={busquedaPagos}
                      onChange={(e) => setBusquedaPagos(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-input-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20 transition text-sm"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/50 border-b border-border">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs text-muted-foreground font-medium">
                          Pedido
                        </th>
                        <th className="px-4 py-3 text-left text-xs text-muted-foreground font-medium">
                          Cliente
                        </th>
                        <th className="px-4 py-3 text-left text-xs text-muted-foreground font-medium">
                          Estado
                        </th>
                        <th className="px-4 py-3 text-right text-xs text-muted-foreground font-medium">
                          Total
                        </th>
                        <th className="px-4 py-3 text-right text-xs text-muted-foreground font-medium">
                          Pagado
                        </th>
                        <th className="px-4 py-3 text-right text-xs text-muted-foreground font-medium">
                          Pendiente
                        </th>
                        <th className="px-4 py-3 text-center text-xs text-muted-foreground font-medium">
                          Acción
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {pedidos
                        .filter((p) => {
                          // Filtrar pedidos cancelados
                          if (p.estado === "Cancelado") return false;

                          // Calcular saldo pendiente directamente
                          const montoTotal = p.montoTotal || 0;
                          const montoPagado = p.montoPagado || 0;
                          const montoPendiente = montoTotal - montoPagado;

                          // Filtrar según el estado de pago seleccionado
                          if (filtroPagos === "Pagados") {
                            if (!(montoTotal > 0 && montoPendiente <= 0))
                              return false;
                          } else if (filtroPagos === "Sin pagar") {
                            if (!(montoPagado === 0 && montoTotal > 0))
                              return false;
                          } else if (filtroPagos === "Pago parcial") {
                            if (!(montoPagado > 0 && montoPendiente > 0))
                              return false;
                          } else {
                            // Todos: solo pedidos con saldo pendiente
                            if (montoPendiente <= 0) return false;
                          }

                          // Filtrar por búsqueda
                          if (busquedaPagos.trim()) {
                            const busqueda = busquedaPagos.toLowerCase();
                            return (
                              p.cliente.toLowerCase().includes(busqueda) ||
                              p.codigo.toLowerCase().includes(busqueda) ||
                              p.telefono.toLowerCase().includes(busqueda)
                            );
                          }

                          return true;
                        })
                        .sort((a, b) => {
                          const pendienteA =
                            (a.montoTotal || 0) - (a.montoPagado || 0);
                          const pendienteB =
                            (b.montoTotal || 0) - (b.montoPagado || 0);
                          return pendienteB - pendienteA; // Ordenar por mayor deuda primero
                        })
                        .map((pedido) => {
                          const montoTotal = pedido.montoTotal || 0;
                          const montoPagado = pedido.montoPagado || 0;
                          const montoPendiente = montoTotal - montoPagado;

                          return (
                            <tr
                              key={pedido.codigo}
                              className="border-b border-border hover:bg-muted/30 transition"
                            >
                              <td className="px-4 py-3">
                                <span className="text-sm font-mono text-foreground">
                                  {pedido.codigo}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <div>
                                  <p className="text-sm text-foreground">
                                    {pedido.cliente}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {pedido.telefono}
                                  </p>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                {montoPendiente <= 0 && montoTotal > 0 ? (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                                    <CheckCircle className="w-3 h-3" /> Pagado
                                  </span>
                                ) : (
                                  <span
                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                                      pedido.estadoPago === "Pendiente"
                                        ? "bg-red-50 text-red-700 border border-red-200"
                                        : "bg-yellow-50 text-yellow-700 border border-yellow-200"
                                    }`}
                                  >
                                    {pedido.estadoPago === "Pendiente" ? (
                                      <>
                                        <AlertCircle className="w-3 h-3" />{" "}
                                        Pendiente
                                      </>
                                    ) : (
                                      <>
                                        <Clock className="w-3 h-3" /> Parcial
                                      </>
                                    )}
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <span className="text-sm text-foreground font-medium">
                                  {formatearSoles(montoTotal)}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <span className="text-sm text-green-600 font-medium">
                                  {formatearSoles(montoPagado)}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <span className="text-sm text-orange-600 font-semibold">
                                  {formatearSoles(montoPendiente)}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                {montoPendiente > 0 ? (
                                  <button
                                    onClick={async () => {
                                      const info = await obtenerInfoPagoPedido(
                                        pedido.codigo,
                                      );
                                      if (info) {
                                        setPedidoSeleccionado(pedido);
                                        setInfoPagoPedido(info);
                                        setModalPagoAbierto(true);
                                      }
                                    }}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700 transition text-xs font-medium"
                                  >
                                    <Coins className="w-3.5 h-3.5" />
                                    Registrar Pago
                                  </button>
                                ) : (
                                  <span className="text-xs text-muted-foreground">
                                    -
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      {(() => {
                        const matchFiltro = (p: (typeof pedidos)[number]) => {
                          if (p.estado === "Cancelado") return false;
                          const montoTotal = p.montoTotal || 0;
                          const montoPagado = p.montoPagado || 0;
                          const montoPendiente = montoTotal - montoPagado;

                          if (filtroPagos === "Pagados") {
                            return montoTotal > 0 && montoPendiente <= 0;
                          } else if (filtroPagos === "Sin pagar") {
                            return montoPagado === 0 && montoTotal > 0;
                          } else if (filtroPagos === "Pago parcial") {
                            return montoPagado > 0 && montoPendiente > 0;
                          }
                          return montoPendiente > 0;
                        };

                        const pedidosFiltradosPagos = pedidos.filter((p) => {
                          if (!matchFiltro(p)) return false;
                          if (busquedaPagos.trim()) {
                            const busqueda = busquedaPagos.toLowerCase();
                            return (
                              p.cliente.toLowerCase().includes(busqueda) ||
                              p.codigo.toLowerCase().includes(busqueda) ||
                              p.telefono.toLowerCase().includes(busqueda)
                            );
                          }
                          return true;
                        });

                        if (pedidosFiltradosPagos.length === 0) {
                          const todosLosDelFiltro = pedidos.filter(matchFiltro);

                          return (
                            <tr>
                              <td
                                colSpan={7}
                                className="px-4 py-10 text-center text-muted-foreground text-sm"
                              >
                                {busquedaPagos.trim() ? (
                                  <>
                                    <Search className="w-12 h-12 text-muted-foreground mx-auto mb-2 opacity-50" />
                                    <p className="font-medium">
                                      No se encontraron resultados
                                    </p>
                                    <p className="text-xs mt-1">
                                      Intenta con otro término de búsqueda
                                    </p>
                                  </>
                                ) : todosLosDelFiltro.length === 0 ? (
                                  <>
                                    <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
                                    <p className="font-medium">
                                      {filtroPagos === "Pagados"
                                        ? "Aún no hay pedidos pagados"
                                        : filtroPagos === "Sin pagar"
                                          ? "No hay pedidos sin pagar"
                                          : filtroPagos === "Pago parcial"
                                            ? "No hay pedidos con pago parcial"
                                            : "¡Todos los pedidos están pagados!"}
                                    </p>
                                    <p className="text-xs mt-1">
                                      No hay registros para mostrar en este
                                      momento.
                                    </p>
                                  </>
                                ) : null}
                              </td>
                            </tr>
                          );
                        }
                        return null;
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
        {/* fin área scrollable */}
      </main>

      {/* Panel lateral de detalle de pedido */}
      {pedidoSeleccionado && (
        <div className="fixed inset-0 z-40 flex justify-end">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setPedidoSeleccionado(null)}
          />
          <aside className="relative z-50 w-full max-w-md bg-card border-l border-border h-full flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <p className="text-xs text-muted-foreground font-mono">
                  {pedidoSeleccionado.id}
                </p>
                <h3 className="text-foreground">
                  {pedidoSeleccionado.cliente}
                </h3>
              </div>
              <button
                onClick={() => setPedidoSeleccionado(null)}
                className="p-1.5 rounded-lg hover:bg-accent transition"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">
                  Estado actual
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm border ${estadoConfig[pedidoSeleccionado.estado as EstadoPedido]?.color}`}
                  >
                    {
                      estadoConfig[pedidoSeleccionado.estado as EstadoPedido]
                        ?.icon
                    }
                    {pedidoSeleccionado.estado}
                  </span>
                  {pedidoSeleccionado.estadoPago && (
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm border ${
                        pedidoSeleccionado.estadoPago === "Pagado"
                          ? "bg-green-100 text-green-700 border-green-200"
                          : pedidoSeleccionado.estadoPago === "Parcial"
                            ? "bg-orange-100 text-orange-700 border-orange-200"
                            : "bg-gray-100 text-gray-700 border-gray-200"
                      }`}
                    >
                      <Coins className="w-3 h-3" />
                      {pedidoSeleccionado.estadoPago}
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">
                  Artículo
                </p>
                <p className="text-foreground">{pedidoSeleccionado.articulo}</p>
              </div>

              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">
                  Fecha de ingreso
                </p>
                <p className="text-foreground">
                  {pedidoSeleccionado.fecha} de junio
                </p>
              </div>

              {pedidoSeleccionado.urgente && (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-red-50 border border-red-200">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                  <p className="text-sm text-red-700">
                    Pedido marcado como urgente
                  </p>
                </div>
              )}

              {pedidoSeleccionado.motivoCancelacion && (
                <div className="space-y-2">
                  <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-red-50 border border-red-200">
                    <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-red-700 font-medium">
                        Pedido cancelado
                      </p>
                      <p className="text-xs text-red-600 mt-1">
                        {pedidoSeleccionado.motivoCancelacion}
                      </p>
                      {pedidoSeleccionado.estadoAnteriorCancelacion && (
                        <p className="text-xs text-red-600 mt-1">
                          Estado anterior:{" "}
                          <span className="font-medium">
                            {pedidoSeleccionado.estadoAnteriorCancelacion}
                          </span>
                        </p>
                      )}
                    </div>
                  </div>
                  {pedidoSeleccionado.estadoAnteriorCancelacion && (
                    <button
                      onClick={async () => {
                        if (
                          !confirm(
                            `¿Reactivar el pedido ${pedidoSeleccionado.codigo}? Se restaurará al estado: ${pedidoSeleccionado.estadoAnteriorCancelacion}`,
                          )
                        )
                          return;

                        const exito = await reactivarPedido(
                          pedidoSeleccionado.codigo,
                        );

                        if (exito) {
                          toast.success("Pedido reactivado", {
                            description: `El pedido ha sido reactivado correctamente al estado: ${pedidoSeleccionado.estadoAnteriorCancelacion}`,
                          });
                          setPedidoSeleccionado(null);
                        } else {
                          toast.error("Error al reactivar", {
                            description:
                              "No se pudo reactivar el pedido. Por favor, intenta de nuevo.",
                          });
                        }
                      }}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition text-sm"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Reactivar pedido
                    </button>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">
                  Contacto del cliente
                </p>
                <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-muted">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-foreground">
                    {pedidoSeleccionado.telefono}
                  </span>
                </div>
                <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-muted">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-foreground">
                    {pedidoSeleccionado.email}
                  </span>
                </div>
              </div>

              {pedidoSeleccionado.notas && (
                <div className="space-y-1.5">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">
                    Notas internas
                  </p>
                  <div className="px-3 py-2.5 rounded-lg bg-muted text-sm text-foreground">
                    {pedidoSeleccionado.notas}
                  </div>
                </div>
              )}

              {/* Información de pago */}
              {pedidoSeleccionado.montoTotal &&
                pedidoSeleccionado.montoTotal > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">
                      Información de pago
                    </p>
                    <div className="px-3 py-2.5 rounded-lg bg-muted/50 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Total:</span>
                        <span className="text-foreground font-medium">
                          {formatearSoles(pedidoSeleccionado.montoTotal)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Pagado:</span>
                        <span className="text-green-600 font-medium">
                          {formatearSoles(pedidoSeleccionado.montoPagado || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm border-t border-border pt-2">
                        <span className="text-muted-foreground font-medium">
                          Pendiente:
                        </span>
                        <span className="text-orange-600 font-semibold">
                          {formatearSoles(
                            (pedidoSeleccionado.montoTotal || 0) -
                              (pedidoSeleccionado.montoPagado || 0),
                          )}
                        </span>
                      </div>
                    </div>
                    {pedidoSeleccionado.estado === "Cancelado" ? (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200">
                        <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                        <p className="text-xs text-red-700">
                          Este pedido está{" "}
                          <span className="font-semibold">cancelado</span> y no
                          puede registrar pagos
                        </p>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 border border-blue-200">
                        <Coins className="w-4 h-4 text-blue-600 shrink-0" />
                        <p className="text-xs text-blue-700">
                          Para registrar pagos, ve al módulo{" "}
                          <span className="font-semibold">Pagos</span>
                        </p>
                      </div>
                    )}
                  </div>
                )}
            </div>

            <div className="p-5 border-t border-border space-y-2">
              {/* Mensaje de estado final */}
              {esEstadoFinal(pedidoSeleccionado.estado) && (
                <div
                  className={`flex items-start gap-2 px-3 py-2.5 rounded-lg ${
                    pedidoSeleccionado.estado === "Entregado"
                      ? "bg-gray-50 border border-gray-200"
                      : "bg-red-50 border border-red-200"
                  }`}
                >
                  <AlertCircle
                    className={`w-4 h-4 shrink-0 mt-0.5 ${
                      pedidoSeleccionado.estado === "Entregado"
                        ? "text-gray-500"
                        : "text-red-600"
                    }`}
                  />
                  <div className="flex-1">
                    <p
                      className={`text-sm font-medium ${
                        pedidoSeleccionado.estado === "Entregado"
                          ? "text-gray-700"
                          : "text-red-700"
                      }`}
                    >
                      Pedido {pedidoSeleccionado.estado.toLowerCase()}
                    </p>
                    <p
                      className={`text-xs mt-0.5 ${
                        pedidoSeleccionado.estado === "Entregado"
                          ? "text-gray-600"
                          : "text-red-600"
                      }`}
                    >
                      No se puede editar ni cambiar de estado. Este es un estado
                      final.
                    </p>
                  </div>
                </div>
              )}

              {/* Cambiar estado */}
              {!esEstadoFinal(pedidoSeleccionado.estado) &&
                obtenerSiguienteEstado(pedidoSeleccionado.estado) && (
                  <button
                    onClick={() => setModalCambiarEstadoAbierto(true)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition text-sm"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Cambiar a "
                    {obtenerSiguienteEstado(pedidoSeleccionado.estado)}"
                  </button>
                )}

              {/* Editar pedido */}
              {puedeEditarPedido(pedidoSeleccionado.estado).puede && (
                <button
                  onClick={() => setPedidoEditando(pedidoSeleccionado)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-border text-foreground hover:bg-accent transition text-sm"
                >
                  <Edit2 className="w-4 h-4" />
                  Editar pedido
                </button>
              )}

              {/* Cancelar pedido */}
              {puedeCancelarPedido(pedidoSeleccionado.estado).puede && (
                <button
                  onClick={() => setModalCancelarAbierto(true)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-red-300 bg-red-50 text-red-700 hover:bg-red-100 transition text-sm"
                >
                  <XCircle className="w-4 h-4" />
                  Cancelar pedido
                </button>
              )}

              <button
                onClick={() => setPedidoDetalle(pedidoSeleccionado)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-border text-muted-foreground hover:bg-accent transition text-sm"
              >
                <FileText className="w-4 h-4" />
                Ver detalle del pedido
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Modal de cancelación de pedido */}
      {modalCancelarAbierto && pedidoSeleccionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setModalCancelarAbierto(false)}
          />
          <div className="relative z-10 bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-foreground">Cancelar pedido</h3>
                  <p className="text-muted-foreground text-sm">
                    Esta acción notificará al cliente
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalCancelarAbierto(false)}
                className="p-1.5 rounded-lg hover:bg-accent transition"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div className="bg-muted rounded-lg px-4 py-3 space-y-1">
                <p className="text-xs text-muted-foreground">Pedido</p>
                <p className="text-sm text-foreground font-mono">
                  {pedidoSeleccionado.id}
                </p>
                <p className="text-sm text-foreground">
                  {pedidoSeleccionado.cliente} · {pedidoSeleccionado.articulo}
                </p>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="motivo"
                  className="text-sm text-foreground flex items-center gap-1"
                >
                  Motivo de cancelación <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="motivo"
                  rows={4}
                  placeholder="Ej. Cliente solicitó cancelación, error en especificaciones..."
                  value={motivoCancelacion}
                  onChange={(e) => setMotivoCancelacion(e.target.value)}
                  className={`w-full px-3 py-2.5 rounded-lg bg-input-background border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 transition resize-none ${
                    motivoCancelacion.trim()
                      ? "border-border focus:ring-foreground/20"
                      : "border-red-300 focus:ring-red-200"
                  }`}
                />
                {!motivoCancelacion.trim() && (
                  <p className="text-xs text-red-500">
                    El motivo es obligatorio
                  </p>
                )}
              </div>

              <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-amber-50 border border-amber-200">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">
                  El cliente recibirá una notificación automática por correo
                  electrónico indicando que su pedido fue cancelado.
                </p>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-border flex gap-3 justify-end">
              <button
                onClick={() => {
                  setModalCancelarAbierto(false);
                  setMotivoCancelacion("");
                }}
                className="px-4 py-2 rounded-lg border border-border text-foreground text-sm hover:bg-accent transition"
              >
                Volver
              </button>
              <button
                onClick={handleCancelarPedido}
                disabled={!motivoCancelacion.trim()}
                className="px-5 py-2 rounded-lg bg-red-600 text-white text-sm hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <XCircle className="w-4 h-4" />
                Confirmar cancelación
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación de cambio de estado */}
      {modalCambiarEstadoAbierto && pedidoSeleccionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setModalCambiarEstadoAbierto(false)}
          />
          <div className="relative z-10 bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-foreground">
                    Confirmar cambio de estado
                  </h3>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    ¿Estás seguro?
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalCambiarEstadoAbierto(false)}
                className="p-1.5 rounded-lg hover:bg-accent transition"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground font-mono">
                  {pedidoSeleccionado.codigo}
                </p>
                <p className="text-sm text-foreground">
                  {pedidoSeleccionado.cliente} · {pedidoSeleccionado.articulo}
                </p>
              </div>

              <div className="flex items-center justify-center gap-3 py-4">
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border ${estadoConfig[pedidoSeleccionado.estado as EstadoPedido]?.color}`}
                >
                  {
                    estadoConfig[pedidoSeleccionado.estado as EstadoPedido]
                      ?.icon
                  }
                  {pedidoSeleccionado.estado}
                </span>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border ${estadoConfig[obtenerSiguienteEstado(pedidoSeleccionado.estado) as EstadoPedido]?.color}`}
                >
                  {
                    estadoConfig[
                      obtenerSiguienteEstado(
                        pedidoSeleccionado.estado,
                      ) as EstadoPedido
                    ]?.icon
                  }
                  {obtenerSiguienteEstado(pedidoSeleccionado.estado)}
                </span>
              </div>

              <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-blue-50 border border-blue-200">
                <AlertCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700">
                  El cliente recibirá una notificación automática por correo
                  electrónico sobre este cambio de estado.
                </p>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-border flex gap-3">
              <button
                onClick={() => setModalCambiarEstadoAbierto(false)}
                className="flex-1 py-2.5 rounded-lg border border-border text-foreground text-sm hover:bg-accent transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmarCambioEstado}
                className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                Confirmar cambio
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de nuevo pedido */}
      {modalPedidoAbierto && (
        <NuevoPedidoModal
          onClose={() => setModalPedidoAbierto(false)}
          clientes={clientes.map((c) => ({
            id: c.id,
            codigo: c.codigo,
            nombre: c.nombre,
            email: c.email ?? "",
            celular: c.celular,
            dni: c.dni,
            ruc: c.ruc ?? "",
          }))}
          onGuardar={handleNuevoPedidoGuardado}
          pedidosExistentes={pedidos}
          productos={productos}
        />
      )}

      {/* Modal de nuevo cliente */}
      {modalAbierto && (
        <NuevoClienteModal
          onClose={() => setModalAbierto(false)}
          onGuardar={async (nuevo) => {
            const resultado = await agregarCliente({
              nombre: nuevo.nombre,
              email: nuevo.email,
              celular: nuevo.celular,
              direccion: nuevo.direccion,
              dni: nuevo.dni,
              ruc: nuevo.ruc,
            });
            if (resultado) {
              setModalAbierto(false);
            }
          }}
          clientesExistentes={clientes}
        />
      )}

      {/* Modal de registrar pago */}
      {modalPagoAbierto &&
        pedidoSeleccionado &&
        infoPagoPedido &&
        currentUser && (
          <RegistrarPagoModal
            pedidoCodigo={pedidoSeleccionado.codigo}
            montoTotal={infoPagoPedido.montoTotal}
            montoPagado={infoPagoPedido.montoPagado}
            fechaEntrega={pedidoSeleccionado.fechaEntrega}
            estado={pedidoSeleccionado.estado}
            onClose={() => {
              setModalPagoAbierto(false);
              setInfoPagoPedido(null);
            }}
            onSuccess={async () => {
              // Mostrar notificación de éxito
              toast.success("Pago registrado", {
                description:
                  "El pago ha sido registrado correctamente. Actualizando información...",
              });

              // Esperar un momento para que la base de datos procese el UPDATE y el trigger
              await new Promise((resolve) => setTimeout(resolve, 500));

              // Refrescar la lista de pedidos para actualizar el estado de pago
              await refetchPedidos();

              // Obtener el pedido actualizado directamente de la base de datos
              const { data: pedidoActualizado } = await supabase
                .from("pedidos")
                .select(
                  `
                *,
                clientes:cliente_id (
                  codigo,
                  nombre,
                  celular,
                  email
                )
              `,
                )
                .eq("codigo", pedidoSeleccionado.codigo)
                .single();

              // Actualizar el pedido seleccionado con la nueva información
              if (pedidoActualizado) {
                setPedidoSeleccionado({
                  id: pedidoActualizado.codigo,
                  codigo: pedidoActualizado.codigo,
                  clienteId: pedidoActualizado.cliente_id,
                  cliente:
                    pedidoActualizado.clientes?.nombre || "Cliente desconocido",
                  articulo: pedidoActualizado.articulo,
                  estado: pedidoActualizado.estado,
                  fecha: pedidoActualizado.fecha,
                  urgente: pedidoActualizado.urgente,
                  telefono: pedidoActualizado.clientes?.celular || "",
                  email: pedidoActualizado.clientes?.email || "",
                  notas: pedidoActualizado.notas || undefined,
                  motivoCancelacion:
                    pedidoActualizado.motivo_cancelacion || undefined,
                  estadoPago: pedidoActualizado.estado_pago || "Pendiente",
                  montoTotal: pedidoActualizado.monto_total
                    ? parseFloat(pedidoActualizado.monto_total)
                    : undefined,
                  montoPagado: pedidoActualizado.monto_pagado
                    ? parseFloat(pedidoActualizado.monto_pagado)
                    : 0,
                });
              }

              // Actualizar información de pago en el modal
              const info = await obtenerInfoPagoPedido(
                pedidoSeleccionado.codigo,
              );
              if (info) {
                setInfoPagoPedido(info);
              }
            }}
            usuarioCodigo={currentUser.codigo}
            usuarioNombre={currentUser.nombre}
          />
        )}

      {/* Modal de edición de cliente */}
      {clienteEditando && (
        <EditarClienteModal
          cliente={clienteEditando}
          clientesExistentes={clientes}
          onClose={() => setClienteEditando(null)}
          onGuardar={async (actualizado) => {
            const exito = await actualizarCliente(actualizado.codigo, {
              nombre: actualizado.nombre,
              email: actualizado.email,
              celular: actualizado.celular,
              direccion: actualizado.direccion,
            });
            if (exito) {
              setClienteEditando(null);
            }
          }}
        />
      )}

      {/* Modal de historial del cliente */}
      {clienteHistorial && (
        <HistorialClienteModal
          cliente={clienteHistorial}
          pedidos={pedidos}
          onClose={() => setClienteHistorial(null)}
          onVerPedido={(pedido) => {
            setPedidoSeleccionado(pedido);
            setSeccion("pedidos");
          }}
        />
      )}

      {/* Modal de detalle del pedido */}
      {pedidoDetalle &&
        (() => {
          const clienteDelPedido = clientes.find(
            (c) => c.id === pedidoDetalle.clienteId,
          );
          if (!clienteDelPedido) return null;
          return (
            <DetallePedidoModal
              pedido={pedidoDetalle}
              cliente={clienteDelPedido}
              onClose={() => setPedidoDetalle(null)}
              onExportar={() =>
                handleExportarPedidoIndividualPDF(pedidoDetalle)
              }
            />
          );
        })()}

      {/* Modal de edición de pedido */}
      {pedidoEditando && (
        <EditarPedidoModal
          pedido={pedidoEditando}
          onClose={() => setPedidoEditando(null)}
        />
      )}

      {/* Modal de nuevo producto */}
      {modalProductoAbierto &&
        currentUser.permisos?.includes("crear_productos") && (
          <NuevoProductoModal
            onClose={() => setModalProductoAbierto(false)}
            productosExistentes={productos}
            onGuardar={async (nuevos) => {
              for (const producto of nuevos) {
                await agregarProducto({
                  modelo: producto.modelo,
                  tela: producto.tela,
                  disenio: producto.disenio,
                  tallas: producto.tallas.map((t) => ({
                    talla: t.talla,
                    colores: t.colores.map((c) => ({
                      color: c.color,
                      stock: c.stock,
                    })),
                  })),
                });
              }
              setModalProductoAbierto(false);
            }}
          />
        )}

      {/* Modal de edición de producto */}
      {productoEditando &&
        currentUser.permisos?.includes("editar_productos") && (
          <EditarProductoModal
            producto={productoEditando}
            onClose={() => setProductoEditando(null)}
            modo="admin"
            onGuardar={async (actualizado) => {
              const exito = await actualizarProducto(actualizado.id, {
                modelo: actualizado.modelo,
                tela: actualizado.tela,
                disenio: actualizado.disenio,
              });
              if (exito) {
                setProductoEditando(null);
              }
            }}
          />
        )}
    </div>
  );
}
