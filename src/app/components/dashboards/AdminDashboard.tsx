import React, { useState } from "react";
import { useNavigate } from "react-router";
import { useSearchParams } from "react-router";
import { filtrarPedidosAdmin } from "../../utils/pedidosFiltros";
import { filtrarClientes } from "../../utils/clientesFiltros";
import {
  calcularMetricasReporte,
  puedeGenerarReportePedidos,
} from "../../utils/reportesPedidos";
import {
  calcularMetricasReporteClientes,
  puedeGenerarReporteClientes,
} from "../../utils/reportesClientes";
import {
  filtrarEmpleados,
  obtenerMensajeEmpleadosVacio,
} from "../../utils/empleadosFiltros";

import {
  filtrarCatalogo,
  obtenerMensajeCatalogoVacio,
} from "../../utils/catalogoFiltros";
import {
  Scissors,
  BarChart2,
  Users,
  Package,
  ClipboardList,
  Settings,
  LogOut,
  Bell,
  TrendingUp,
  Coins,
  AlertCircle,
  CheckCircle2,
  CheckCircle,
  Clock,
  Loader2,
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
  ShoppingBag,
  Layers,
  ChevronRight,
  Search,
  Plus,
  X,
  User,
  Mail,
  Phone,
  Briefcase,
  Edit2,
  Lock,
  Filter,
  ArrowDown,
  ArrowUp,
  Download,
  XCircle,
  AlertTriangle,
  FileText,
  Activity,
  CreditCard,
  Shield,
  Sparkles,
} from "lucide-react";
import { NuevoProductoModal } from "../productos/NuevoProductoModal";
import { EditarProductoModal } from "../productos/EditarProductoModal";
import { AreaChartCustom } from "../charts/AreaChartCustom";
import { BarChartCustom } from "../charts/BarChartCustom";
import { usePedidos, type Pedido } from "../../contexts/PedidosContext";
import { useEmpleados, type Empleado } from "../../contexts/EmpleadosContext";
import {
  useProductos,
  type ProductoCatalogo,
} from "../../contexts/ProductosContext";
import { NuevoEmpleadoModal } from "../empleados/NuevoEmpleadoModal";
import { EditarEmpleadoModal } from "../empleados/EditarEmpleadoModal";
import { EstablecerPasswordModal } from "../auth/EstablecerPasswordModal";
import { GestionarPermisosModal } from "../empleados/GestionarPermisosModal";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { useAuditoria } from "../../contexts/AuditoriaContext";
import { usePagos } from "../../contexts/PagosContext";
import { PanelNotificaciones } from "../shared/PanelNotificaciones";
import { formatearSoles } from "../../utils/formatoMoneda";
import {
  esPedidoVencido,
  diasHastaVencimiento,
  esNombreValido,
  esEmailConProveedorPermitido,
} from "../../utils/validaciones";
import { HistorialClienteModal } from "../clientes/HistorialClienteModal";
import { EditarPedidoModal } from "../pedidos/EditarPedidoModal";
import { DetallePedidoModal } from "../pedidos/DetallePedidoModal";
import { useClientes } from "../../contexts/ClientesContext";
import {
  obtenerFechaPeruHoy,
  formatearFechaHoraPeru,
  formatearFechaISO,
  formatearFechaCorta,
} from "../../utils/fechas";
import { tieneNotasParaMostrar } from "../../utils/notasPedido";
import { calcularSaldoPendiente } from "../../utils/estadoPagoPedido";
import {
  obtenerEstiloEstado,
  type EstadoPedido,
} from "../../utils/pedidosCicloVida";

const ESTADOS_PARA_COLOR: EstadoPedido[] = [
  "Recibido",
  "En confección",
  "Listo para entrega",
  "Entregado",
  "Cancelado",
  "Vencido",
];

const estadoColor: Record<string, string> = ESTADOS_PARA_COLOR.reduce(
  (acc, estado) => {
    const estilo = obtenerEstiloEstado(estado);
    acc[estado] = `${estilo.bgColor} ${estilo.color} ${estilo.borderColor}`;
    return acc;
  },
  {} as Record<string, string>,
);

type NavItem = { label: string; icon: React.ReactNode; section: string };

const navItems: NavItem[] = [
  {
    label: "Panel general",
    icon: <BarChart2 className="w-4 h-4" />,
    section: "panel",
  },
  {
    label: "Pedidos",
    icon: <ClipboardList className="w-4 h-4" />,
    section: "pedidos",
  },
  {
    label: "Clientes",
    icon: <User className="w-4 h-4" />,
    section: "clientes",
  },
  {
    label: "Pagos",
    icon: <Coins className="w-4 h-4" />,
    section: "pagos",
  },
  {
    label: "Empleados",
    icon: <Users className="w-4 h-4" />,
    section: "empleados",
  },
  {
    label: "Catálogo",
    icon: <Layers className="w-4 h-4" />,
    section: "catalogo",
  },
  {
    label: "Auditoría",
    icon: <Activity className="w-4 h-4" />,
    section: "auditoria",
  },
];

// (AreaChartCustom y BarChartCustom movidos a sus propios archivos)

export function AdminDashboard() {
  const navigate = useNavigate();
  const currentUser = useCurrentUser();
  const { pedidos, loading: loadingPedidos, actualizarPedido } = usePedidos();
  const {
    empleados,
    agregarEmpleado,
    actualizarEmpleado,
    establecerPassword,
    loading: loadingEmpleados,
  } = useEmpleados();
  const {
    productos,
    agregarProducto,
    actualizarProducto,
    loading: loadingProductos,
  } = useProductos();
  const { registros: auditoriaRegistros, loading: loadingAuditoria } =
    useAuditoria();
  const {
    pagos,
    obtenerEstadisticasPagos,
    cargando: loadingPagos,
  } = usePagos();
  const { clientes, loading: loadingClientes } = useClientes();
  const [searchParams, setSearchParams] = useSearchParams();
  const seccion = searchParams.get("seccion") ?? "panel";

  const setSeccion = (s: string) => setSearchParams({ seccion: s });

  // Fecha actual formateada en zona horaria de Perú
  const fechaActual = formatearFechaHoraPeru(new Date()).split(",")[0];
  const [busquedaProducto, setBusquedaProducto] = useState("");
  const [modalProductoAbierto, setModalProductoAbierto] = useState(false);
  const [productoEditando, setProductoEditando] =
    useState<ProductoCatalogo | null>(null);
  const [expandedProductos, setExpandedProductos] = useState<Set<string>>(
    new Set(),
  );
  const [modalEmpleadoAbierto, setModalEmpleadoAbierto] = useState(false);
  const [empleadoEditando, setEmpleadoEditando] = useState<Empleado | null>(
    null,
  );
  const [empleadoPassword, setEmpleadoPassword] = useState<Empleado | null>(
    null,
  );
  const [empleadoPermisos, setEmpleadoPermisos] = useState<Empleado | null>(
    null,
  );
  const [filtroEstadoPedidos, setFiltroEstadoPedidos] = useState("Todos");
  const [filtroUltimosPedidos, setFiltroUltimosPedidos] = useState<
    "5" | "10" | "20" | "semana"
  >("5");
  const [filtroPrioridadPedidos, setFiltroPrioridadPedidos] = useState("Todas");
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState<Pedido | null>(
    null,
  );
  const [pedidoDetalle, setPedidoDetalle] = useState<Pedido | null>(null);
  const [modalEditarPedidoAbierto, setModalEditarPedidoAbierto] =
    useState(false);
  const [clienteHistorial, setClienteHistorial] = useState<any>(null);
  const [busquedaCliente, setBusquedaCliente] = useState("");
  const [filtroEstadoCliente, setFiltroEstadoCliente] = useState("Todos");
  const [fechaDesdePedidos, setFechaDesdePedidos] = useState("");
  const [fechaHastaPedidos, setFechaHastaPedidos] = useState("");
  const [busquedaEmpleado, setBusquedaEmpleado] = useState("");
  const [ordenFechaPedidos, setOrdenFechaPedidos] = useState<"desc" | "asc">(
    "desc",
  );
  const [mostrarFiltrosPedidos, setMostrarFiltrosPedidos] = useState(false);
  const [tabPedidos, setTabPedidos] = useState<"normales" | "especiales">(
    "normales",
  );

  // Estados para filtros de auditoría
  const [filtroFechaDesde, setFiltroFechaDesde] = useState("");
  const [filtroFechaHasta, setFiltroFechaHasta] = useState("");
  const [filtroUsuario, setFiltroUsuario] = useState("");
  const [filtroAccion, setFiltroAccion] = useState<string>("");
  const [filtroModulo, setFiltroModulo] = useState<string>("");
  const [mostrarFiltrosAuditoria, setMostrarFiltrosAuditoria] = useState(false);
  const [detalleAuditoria, setDetalleAuditoria] = useState<any>(null);

  // Estados para filtros de pagos
  const [fechaDesdePagos, setFechaDesdePagos] = useState("");
  const [fechaHastaPagos, setFechaHastaPagos] = useState("");
  const [filtroMetodoPago, setFiltroMetodoPago] = useState("Todos");
  const [filtroPresetPagos, setFiltroPresetPagos] = useState("Todos");
  const [filtroEstadoPagoPendientes, setFiltroEstadoPagoPendientes] =
    useState("Todos"); // "Todos" | "Pendiente" | "Parcial"
  const [reportTypeModalOpen, setReportTypeModalOpen] = useState(false);
  const [selectedReportType, setSelectedReportType] = useState<
    "historial" | "pendientes"
  >("historial");

  const toggleExpanded = (id: string) =>
    setExpandedProductos((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const handleExportarPedidosPDF = async () => {
    if (!puedeGenerarReportePedidos(pedidosFiltrados)) {
      alert("No hay pedidos registrados para generar el reporte.");
      return;
    }

    try {
      const { default: jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");

      const doc = new jsPDF();

      // Título principal
      doc.setFontSize(18);
      doc.setFont("", "bold");
      doc.text("Reporte de Pedidos", 14, 20);

      // Información de filtros aplicados
      doc.setFontSize(10);
      doc.setFont("", "normal");
      let filtrosTexto = "Filtros: ";
      if (filtroEstadoPedidos !== "Todos") {
        filtrosTexto += `Estado: ${filtroEstadoPedidos}`;
      }
      if (filtroPrioridadPedidos !== "Todas") {
        filtrosTexto += ` | Prioridad: ${filtroPrioridadPedidos}`;
      }
      if (
        filtroEstadoPedidos === "Todos" &&
        filtroPrioridadPedidos === "Todas"
      ) {
        filtrosTexto += "Todos los pedidos";
      }
      doc.text(filtrosTexto, 14, 28);

      // Fecha de generación
      const fechaGeneracion = formatearFechaHoraPeru(new Date());
      doc.text(`Generado: ${fechaGeneracion}`, 14, 34);

      // Estadísticas resumen
      const { totalPedidos, pedidosActivos, pedidosUrgentes } =
        calcularMetricasReporte(pedidosFiltrados);

      doc.setFontSize(11);
      doc.setFont("", "bold");
      doc.text("Resumen", 14, 44);

      doc.setFontSize(9);
      doc.setFont("", "normal");
      doc.text(`Total de pedidos: ${totalPedidos}`, 14, 50);
      doc.text(`Pedidos activos: ${pedidosActivos}`, 14, 56);
      doc.text(`Pedidos urgentes: ${pedidosUrgentes}`, 14, 62);

      // Tabla de pedidos
      const columnas = [
        { header: "Código", dataKey: "codigo" },
        { header: "Cliente", dataKey: "cliente" },
        { header: "Artículo", dataKey: "articulo" },
        { header: "Estado", dataKey: "estado" },
        { header: "Fecha", dataKey: "fecha" },
        { header: "Urgente", dataKey: "urgente" },
      ];

      const filas = pedidosFiltrados.map((p) => ({
        codigo: p.codigo,
        cliente: p.cliente,
        articulo:
          p.articulo.length > 30
            ? p.articulo.substring(0, 30) + "..."
            : p.articulo,
        estado: p.estado,
        fecha: formatearFechaCorta(p.fecha),
        urgente: p.urgente ? "Sí" : "No",
      }));

      autoTable(doc, {
        head: [columnas.map((c) => c.header)],
        body: filas.map((f) =>
          columnas.map((c) => f[c.dataKey as keyof typeof f]),
        ),
        startY: 70,
        theme: "striped",
        headStyles: {
          fillColor: [37, 99, 235], // blue-600
          textColor: 255,
          fontStyle: "bold",
          fontSize: 9,
        },
        bodyStyles: {
          fontSize: 8,
          textColor: 50,
        },
        alternateRowStyles: {
          fillColor: [249, 250, 251], // gray-50
        },
        margin: { top: 70, left: 14, right: 14 },
        styles: {
          cellPadding: 2,
          lineColor: [229, 231, 235], // gray-200
          lineWidth: 0.1,
        },
      });

      // Guardar PDF
      const nombreArchivo = `pedidos_${filtroEstadoPedidos !== "Todos" ? filtroEstadoPedidos.replace(/\s/g, "_") : "todos"}_${obtenerFechaPeruHoy()}.pdf`;
      doc.save(nombreArchivo);

      console.log("✅ PDF de pedidos generado correctamente:", nombreArchivo);
    } catch (error) {
      console.error("❌ Error al generar PDF de pedidos:", error);
      alert("Error al generar el PDF. Por favor, intenta de nuevo.");
    }
  };

  // Función para exportar el detalle de un pedido individual a PDF
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
      alert("Error al generar el PDF. Por favor, intenta de nuevo.");
    }
  };

  // Función para exportar clientes a PDF
  const handleExportarClientesPDF = async () => {
    if (!puedeGenerarReporteClientes(clientesFiltrados)) {
      alert("No se encontraron clientes para generar el reporte.");
      return;
    }

    try {
      const { default: jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");

      const doc = new jsPDF();

      // Título principal
      doc.setFontSize(18);
      doc.setFont("", "bold");
      doc.text("Reporte de Clientes", 14, 20);

      // Información de filtros aplicados
      doc.setFontSize(10);
      doc.setFont("", "normal");
      let filtrosTexto = "Filtros: ";
      if (busquedaCliente) {
        filtrosTexto += `Búsqueda: "${busquedaCliente}"`;
      }
      if (filtroEstadoCliente !== "Todos") {
        filtrosTexto += ` | Estado: ${filtroEstadoCliente}`;
      }
      if (!busquedaCliente && filtroEstadoCliente === "Todos") {
        filtrosTexto += "Todos los clientes";
      }
      doc.text(filtrosTexto, 14, 28);

      // Fecha de generación
      const fechaGeneracion = formatearFechaHoraPeru(new Date());
      doc.text(`Generado: ${fechaGeneracion}`, 14, 34);

      // Estadísticas resumen
      const { totalClientes, clientesConEmail, clientesConPedidos } =
        calcularMetricasReporteClientes(clientesFiltrados, pedidos);

      doc.setFontSize(11);
      doc.setFont("", "bold");
      doc.text("Resumen", 14, 44);

      doc.setFontSize(9);
      doc.setFont("", "normal");
      doc.text(`Total de clientes: ${totalClientes}`, 14, 50);
      doc.text(`Con email: ${clientesConEmail}`, 14, 56);
      doc.text(`Con pedidos: ${clientesConPedidos}`, 14, 62);

      // Tabla de clientes
      const columnas = [
        { header: "Código", dataKey: "codigo" },
        { header: "Nombre", dataKey: "nombre" },
        { header: "Email", dataKey: "email" },
        { header: "Celular", dataKey: "celular" },
        { header: "DNI", dataKey: "dni" },
        { header: "RUC", dataKey: "ruc" },
      ];

      const filas = clientesFiltrados.map((c) => ({
        codigo: c.codigo,
        nombre:
          c.nombre.length > 25 ? c.nombre.substring(0, 25) + "..." : c.nombre,
        email: c.email || "—",
        celular: c.celular,
        dni: c.dni,
        ruc: c.ruc || "—",
      }));

      autoTable(doc, {
        head: [columnas.map((c) => c.header)],
        body: filas.map((f) =>
          columnas.map((c) => f[c.dataKey as keyof typeof f]),
        ),
        startY: 70,
        theme: "striped",
        headStyles: {
          fillColor: [37, 99, 235], // blue-600
          textColor: 255,
          fontStyle: "bold",
          fontSize: 8,
        },
        bodyStyles: {
          fontSize: 7,
          textColor: 50,
        },
        alternateRowStyles: {
          fillColor: [249, 250, 251], // gray-50
        },
        margin: { top: 70, left: 14, right: 14 },
        styles: {
          cellPadding: 2,
          lineColor: [229, 231, 235], // gray-200
          lineWidth: 0.1,
        },
        columnStyles: {
          0: { cellWidth: 20 }, // Código
          1: { cellWidth: 35 }, // Nombre
          2: { cellWidth: 40 }, // Email
          3: { cellWidth: 25 }, // Celular
          4: { cellWidth: 20 }, // DNI
          5: { cellWidth: 25 }, // RUC
        },
      });

      // Guardar PDF
      const nombreArchivo = `clientes_${filtroEstadoCliente !== "Todos" ? filtroEstadoCliente : "todos"}_${obtenerFechaPeruHoy()}.pdf`;
      doc.save(nombreArchivo);

      console.log("✅ PDF de clientes generado correctamente:", nombreArchivo);
    } catch (error) {
      console.error("❌ Error al generar PDF de clientes:", error);
      alert("Error al generar el PDF. Por favor, intenta de nuevo.");
    }
  };

  // Función para aplicar presets de fecha en pagos
  const aplicarPresetPagos = (preset: string) => {
    // Usar la función de zona horaria de Perú directamente
    const hoyStr = obtenerFechaPeruHoy();
    const hoy = new Date(hoyStr + "T00:00:00");
    let desde = "";
    let hasta = "";

    switch (preset) {
      case "Hoy":
        desde = hasta = hoyStr;
        break;
      case "Esta semana":
        const inicioSemana = new Date(hoy);
        inicioSemana.setDate(hoy.getDate() - hoy.getDay());
        desde = formatearFechaISO(inicioSemana);
        hasta = hoyStr;
        break;
      case "Este mes":
        const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
        desde = formatearFechaISO(inicioMes);
        hasta = hoyStr;
        break;
      case "Mes anterior":
        const mesAnterior = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
        const finMesAnterior = new Date(hoy.getFullYear(), hoy.getMonth(), 0);
        desde = formatearFechaISO(mesAnterior);
        hasta = formatearFechaISO(finMesAnterior);
        break;
      case "Este año":
        const inicioAnio = new Date(hoy.getFullYear(), 0, 1);
        desde = formatearFechaISO(inicioAnio);
        hasta = hoyStr;
        break;
      case "Todos":
      default:
        desde = "";
        hasta = "";
        break;
    }

    setFechaDesdePagos(desde);
    setFechaHastaPagos(hasta);
    setFiltroPresetPagos(preset);
  };

  // Función para exportar pagos a PDF
  const handleExportarPagosPDF = async (
    reportType: "historial" | "pendientes",
  ) => {
    try {
      const { default: jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");

      const doc = new jsPDF();

      if (reportType === "historial") {
        // Título principal
        doc.setFontSize(18);
        doc.setFont("", "bold");
        doc.text("Reporte de Pagos Realizados", 14, 20);

        // Información del período
        doc.setFontSize(10);
        doc.setFont("", "normal");
        let periodoTexto = "Período: ";
        if (filtroPresetPagos !== "Todos") {
          periodoTexto += filtroPresetPagos;
        } else if (fechaDesdePagos || fechaHastaPagos) {
          periodoTexto += `${fechaDesdePagos || "Inicio"} - ${fechaHastaPagos || "Hoy"}`;
        } else {
          periodoTexto += "Todos los registros";
        }
        doc.text(periodoTexto, 14, 28);

        // Fecha de generación en zona horaria de Perú
        const fechaGeneracion = formatearFechaHoraPeru(new Date());
        doc.text(`Generado: ${fechaGeneracion}`, 14, 34);

        // Estadísticas resumen
        const totalIngresos = pagosFiltrados.reduce(
          (sum, p) => sum + p.monto,
          0,
        );
        const efectivo = pagosFiltrados
          .filter((p) => p.metodoPago === "Efectivo")
          .reduce((sum, p) => sum + p.monto, 0);
        const transferencia = pagosFiltrados
          .filter((p) => p.metodoPago === "QR/Transferencia")
          .reduce((sum, p) => sum + p.monto, 0);

        doc.setFontSize(11);
        doc.setFont("", "bold");
        doc.text("Resumen", 14, 44);

        doc.setFontSize(9);
        doc.setFont("", "normal");
        doc.text(`Total de pagos: ${pagosFiltrados.length}`, 14, 50);
        doc.text(`Ingresos totales: ${formatearSoles(totalIngresos)}`, 14, 56);
        doc.text(`Efectivo: ${formatearSoles(efectivo)}`, 14, 62);
        doc.text(`QR/Transferencia: ${formatearSoles(transferencia)}`, 14, 68);

        // Tabla de pagos
        const columnas = [
          { header: "Fecha", dataKey: "fecha" },
          { header: "Pedido", dataKey: "pedido" },
          { header: "Cliente", dataKey: "cliente" },
          { header: "Método", dataKey: "metodo" },
          { header: "Monto", dataKey: "monto" },
          { header: "Empleado", dataKey: "empleado" },
        ];

        const filas = pagosFiltrados.map((p) => ({
          fecha: new Date(p.fechaPago).toLocaleDateString("es-PE"),
          pedido: p.pedidoCodigo,
          cliente: p.clienteNombre,
          metodo: p.metodoPago,
          monto: formatearSoles(p.monto),
          empleado: p.usuarioNombre,
        }));

        autoTable(doc, {
          head: [columnas.map((c) => c.header)],
          body: filas.map((f) =>
            columnas.map((c) => (f[c.dataKey as keyof typeof f] ?? "") as any),
          ),
          startY: 76,
          theme: "striped",
          headStyles: {
            fillColor: [37, 99, 235], // blue-600
            textColor: 255,
            fontStyle: "bold",
            fontSize: 9,
          },
          bodyStyles: {
            fontSize: 8,
            textColor: 50,
          },
          alternateRowStyles: {
            fillColor: [249, 250, 251], // gray-50
          },
          margin: { top: 76, left: 14, right: 14 },
          styles: {
            cellPadding: 3,
            lineColor: [229, 231, 235], // gray-200
            lineWidth: 0.1,
          },
        });

        // Pie de página con total
        const finalY = (doc as any).lastAutoTable?.finalY || 76;
        doc.setFontSize(11);
        doc.setFont("", "bold");
        const totalIngresos2 = pagosFiltrados.reduce(
          (sum, p) => sum + p.monto,
          0,
        );
        doc.text(`TOTAL: ${formatearSoles(totalIngresos2)}`, 14, finalY + 10);

        // Guardar PDF
        const nombreArchivo = `pagos_realizados_${filtroPresetPagos !== "Todos" ? filtroPresetPagos.replace(/\s/g, "_") : "todos"}_${obtenerFechaPeruHoy()}.pdf`;
        doc.save(nombreArchivo);
      } else if (reportType === "pendientes") {
        // Reporte de pagos pendientes
        doc.setFontSize(18);
        doc.setFont("", "bold");
        doc.text("Reporte de Pagos Pendientes", 14, 20);

        // Información del período
        doc.setFontSize(10);
        doc.setFont("", "normal");
        let periodoTexto = "Período: ";
        if (filtroPresetPagos !== "Todos") {
          periodoTexto += filtroPresetPagos;
        } else if (fechaDesdePagos || fechaHastaPagos) {
          periodoTexto += `${fechaDesdePagos || "Inicio"} - ${fechaHastaPagos || "Hoy"}`;
        } else {
          periodoTexto += "Todos los registros";
        }
        doc.text(periodoTexto, 14, 28);

        // Fecha de generación
        const fechaGeneracion = formatearFechaHoraPeru(new Date());
        doc.text(`Generado: ${fechaGeneracion}`, 14, 34);

        // Filtrar pedidos con pagos pendientes
        const pedidosPendientes = pedidos.filter((p) => {
          if (p.estado === "Cancelado") return false;
          const montoTotal = p.montoTotal || 0;
          const montoPagado = p.montoPagado || 0;
          const pendiente = calcularSaldoPendiente(montoTotal, montoPagado);
          return pendiente > 0 && montoTotal > 0;
        });

        // Estadísticas resumen
        const totalPendiente = pedidosPendientes.reduce(
          (sum, p) => sum + calcularSaldoPendiente(p.montoTotal, p.montoPagado),
          0,
        );
        const pedidosVencidos = pedidosPendientes.filter((p) =>
          esPedidoVencido(p.fechaEntrega, p.estado),
        ).length;

        doc.setFontSize(11);
        doc.setFont("", "bold");
        doc.text("Resumen", 14, 44);

        doc.setFontSize(9);
        doc.setFont("", "normal");
        doc.text(
          `Total de pedidos pendientes: ${pedidosPendientes.length}`,
          14,
          50,
        );
        doc.text(
          `Monto total pendiente: ${formatearSoles(totalPendiente)}`,
          14,
          56,
        );
        doc.text(`Pedidos vencidos: ${pedidosVencidos}`, 14, 62);

        // Tabla de pagos pendientes
        const columnas = [
          { header: "Pedido", dataKey: "codigo" },
          { header: "Cliente", dataKey: "cliente" },
          { header: "Total", dataKey: "total" },
          { header: "Pagado", dataKey: "pagado" },
          { header: "Pendiente", dataKey: "pendiente" },
          { header: "Fecha Venc.", dataKey: "fecha" },
          { header: "Estado", dataKey: "estado" },
        ];

        const filas = pedidosPendientes.map((p) => {
          const montoTotal = p.montoTotal || 0;
          const montoPagado = p.montoPagado || 0;
          const pendiente = calcularSaldoPendiente(montoTotal, montoPagado);
          const vencido = esPedidoVencido(p.fechaEntrega, p.estado);
          const diasRestantes = diasHastaVencimiento(p.fechaEntrega, p.estado);

          return {
            codigo: p.codigo,
            cliente: p.cliente,
            total: formatearSoles(montoTotal),
            pagado: formatearSoles(montoPagado),
            pendiente: formatearSoles(pendiente),
            fecha: p.fechaEntrega ? formatearFechaCorta(p.fechaEntrega) : "—",
            estado: vencido
              ? "Vencido"
              : diasRestantes !== null
                ? `${diasRestantes} días`
                : "—",
          };
        });

        autoTable(doc, {
          head: [columnas.map((c) => c.header)],
          body: filas.map((f) =>
            columnas.map((c) => (f[c.dataKey as keyof typeof f] ?? "") as any),
          ),
          startY: 76,
          theme: "striped",
          headStyles: {
            fillColor: [234, 88, 12], // orange-600
            textColor: 255,
            fontStyle: "bold",
            fontSize: 9,
          },
          bodyStyles: {
            fontSize: 8,
            textColor: 50,
          },
          alternateRowStyles: {
            fillColor: [249, 250, 251], // gray-50
          },
          margin: { top: 76, left: 14, right: 14 },
          styles: {
            cellPadding: 3,
            lineColor: [229, 231, 235], // gray-200
            lineWidth: 0.1,
          },
        });

        // Pie de página con total
        const finalY = (doc as any).lastAutoTable?.finalY || 76;
        doc.setFontSize(11);
        doc.setFont("", "bold");
        const totalPendiente2 = pedidosPendientes.reduce(
          (sum, p) => sum + ((p.montoTotal || 0) - (p.montoPagado || 0)),
          0,
        );
        doc.text(
          `TOTAL PENDIENTE: ${formatearSoles(totalPendiente2)}`,
          14,
          finalY + 10,
        );

        // Guardar PDF
        const nombreArchivo = `pagos_pendientes_${filtroPresetPagos !== "Todos" ? filtroPresetPagos.replace(/\s/g, "_") : "todos"}_${obtenerFechaPeruHoy()}.pdf`;
        doc.save(nombreArchivo);
      }

      console.log("✅ PDF generado correctamente");
      setReportTypeModalOpen(false);
    } catch (error) {
      console.error("❌ Error al generar PDF:", error);
      alert("Error al generar el PDF. Por favor, intenta de nuevo.");
    }
  };

  // Filtrado de pagos
  const pagosFiltrados = pagos.filter((p) => {
    // Convertir de UTC a zona horaria de Perú antes de extraer la fecha
    const fechaPagoSolo = formatearFechaISO(new Date(p.fechaPago));

    // Filtrar por fechas
    if (fechaDesdePagos && fechaPagoSolo < fechaDesdePagos) return false;
    if (fechaHastaPagos && fechaPagoSolo > fechaHastaPagos) return false;

    // Filtrar por método de pago
    if (filtroMetodoPago !== "Todos" && p.metodoPago !== filtroMetodoPago)
      return false;

    return true;
  });

  // Filtrado de pedidos
  const pedidosFiltrados = filtrarPedidosAdmin(pedidos, {
    filtroEstado: filtroEstadoPedidos,
    filtroPrioridad: filtroPrioridadPedidos as "Todas" | "Urgente" | "Normal",
    fechaDesde: fechaDesdePedidos,
    fechaHasta: fechaHastaPedidos,
    ordenFecha: ordenFechaPedidos,
  });

  // Pedidos con productos especiales (fuera de catálogo) — filtrado por columna BD
  const [busquedaEspeciales, setBusquedaEspeciales] = useState("");
  const pedidosEspeciales = pedidos
    .filter((p) => {
      if (!p.tieneEspeciales) return false;
      if (!busquedaEspeciales.trim()) return true;
      const q = busquedaEspeciales.toLowerCase();
      return (
        p.codigo.toLowerCase().includes(q) ||
        p.cliente.toLowerCase().includes(q) ||
        p.articulo.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

  // Filtrado de clientes
  const clientesFiltrados = filtrarClientes(clientes, {
    busqueda: busquedaCliente,
    filtroEstado: filtroEstadoCliente as "Todos" | "ConPedidos" | "SinPedidos" | "ConEmail" | "SinEmail",
    pedidos,
  });

  // Filtrado de auditoría
  const auditoriaFiltrada = auditoriaRegistros.filter((registro) => {
    // Filtro por rango de fechas (usar zona horaria de Perú)
    if (filtroFechaDesde) {
      const fechaRegistro = formatearFechaISO(new Date(registro.fechaHora));
      if (fechaRegistro < filtroFechaDesde) return false;
    }
    if (filtroFechaHasta) {
      const fechaRegistro = formatearFechaISO(new Date(registro.fechaHora));
      if (fechaRegistro > filtroFechaHasta) return false;
    }
    // Filtro por usuario
    if (filtroUsuario) {
      const match =
        registro.usuarioNombre
          .toLowerCase()
          .includes(filtroUsuario.toLowerCase()) ||
        registro.usuarioCodigo
          .toLowerCase()
          .includes(filtroUsuario.toLowerCase());
      if (!match) return false;
    }
    // Filtro por acción
    if (filtroAccion && registro.accion !== filtroAccion) return false;
    // Filtro por módulo
    if (filtroModulo && registro.modulo !== filtroModulo) return false;

    return true;
  });

  // Datos dinámicos del panel general
  const pedidosOrdenadosPorFecha = [...pedidos].sort(
    (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime(),
  );
  const pedidosRecientes =
    filtroUltimosPedidos === "semana"
      ? pedidosOrdenadosPorFecha.filter((p) => {
          const fechaPedido = new Date(p.fecha);
          const hoy = new Date(obtenerFechaPeruHoy());
          const diffDias =
            (hoy.getTime() - fechaPedido.getTime()) / (1000 * 60 * 60 * 24);
          return diffDias >= 0 && diffDias <= 7;
        })
      : pedidosOrdenadosPorFecha.slice(0, parseInt(filtroUltimosPedidos, 10));
  const pedidosActivos = pedidos.filter(
    (p) => p.estado !== "Entregado" && p.estado !== "Cancelado",
  );

  // Pedidos del mes actual en zona horaria de Perú
  const hoyPeru = obtenerFechaPeruHoy();
  const [anioActual, mesActual] = hoyPeru.split("-");
  const pedidosEsteMes = pedidos.filter((p) => {
    const fechaPedido = formatearFechaISO(new Date(p.fecha));
    return fechaPedido.startsWith(`${anioActual}-${mesActual}`);
  });

  // Clientes únicos del mes actual
  const clientesIdEsteMes = new Set(pedidosEsteMes.map((p) => p.clienteId));
  const clientesUnicos = clientesIdEsteMes.size;

  // Clientes nuevos este mes (clientes que hicieron su primer pedido este mes)
  const clientesNuevosEsteMes = clientes.filter((c) => {
    const fechaRegistro = formatearFechaISO(new Date(c.fechaRegistro));
    return fechaRegistro.startsWith(`${anioActual}-${mesActual}`);
  }).length;

  // Estadísticas de pedidos por estado
  const pedidosPorEstado = [
    {
      id: "s1",
      estado: "Recibidos",
      cantidad: pedidos.filter((p) => p.estado === "Recibido").length,
      color: "#6366f1",
    },
    {
      id: "s2",
      estado: "Confección",
      cantidad: pedidos.filter((p) => p.estado === "En confección").length,
      color: "#3b82f6",
    },
    {
      id: "s3",
      estado: "Por entregar",
      cantidad: pedidos.filter((p) => p.estado === "Listo para entrega").length,
      color: "#10b981",
    },
    {
      id: "s4",
      estado: "Entregados",
      cantidad: pedidos.filter((p) => p.estado === "Entregado").length,
      color: "#94a3b8",
    },
  ];

  // Ingresos mensuales reales de los últimos 6 meses
  const ingresosMensuales = (() => {
    const meses = [
      "Ene",
      "Feb",
      "Mar",
      "Abr",
      "May",
      "Jun",
      "Jul",
      "Ago",
      "Sep",
      "Oct",
      "Nov",
      "Dic",
    ];
    const resultado = [];
    const hoy = new Date(hoyPeru);

    for (let i = 5; i >= 0; i--) {
      const fecha = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
      const anio = fecha.getFullYear();
      const mes = String(fecha.getMonth() + 1).padStart(2, "0");
      const mesKey = `${anio}-${mes}`;

      const ingresosMes = pagos
        .filter((p) => {
          const fechaPago = formatearFechaISO(new Date(p.fechaPago));
          return fechaPago.startsWith(mesKey);
        })
        .reduce((sum, p) => sum + p.monto, 0);

      resultado.push({
        mes: meses[fecha.getMonth()],
        ingresos: ingresosMes,
      });
    }

    return resultado;
  })();

  const ingresosDelMes =
    ingresosMensuales[ingresosMensuales.length - 1].ingresos;
  const ingresosMesAnterior =
    ingresosMensuales[ingresosMensuales.length - 2]?.ingresos || 0;
  const porcentajeCrecimiento =
    ingresosMesAnterior > 0
      ? Math.round(
          ((ingresosDelMes - ingresosMesAnterior) / ingresosMesAnterior) * 100,
        )
      : 0;

  const statsCards = [
    {
      label: "Ingresos del mes",
      value: formatearSoles(ingresosDelMes),
      delta:
        ingresosMesAnterior > 0 && porcentajeCrecimiento !== 0
          ? `${porcentajeCrecimiento > 0 ? "+" : ""}${porcentajeCrecimiento}% vs. mes anterior`
          : ingresosMesAnterior === 0
            ? "Primer mes con ingresos"
            : "Sin cambio",
      up:
        porcentajeCrecimiento > 0
          ? true
          : porcentajeCrecimiento < 0
            ? false
            : null,
      icon: <Coins className="w-5 h-5" />,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      label: "Total pedidos",
      value: pedidos.length.toString(),
      delta: `${pedidosActivos.length} activos, ${pedidosEsteMes.length} este mes`,
      up: pedidosEsteMes.length > 0 ? true : null,
      icon: <ShoppingBag className="w-5 h-5" />,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Empleados activos",
      value: empleados.filter((e) => e.estado === "Activo").length.toString(),
      delta:
        empleados.filter((e) => e.estado === "Licencia").length > 0
          ? `${empleados.filter((e) => e.estado === "Licencia").length} en licencia`
          : "Todos activos",
      up: null,
      icon: <Users className="w-5 h-5" />,
      color: "text-violet-600",
      bg: "bg-violet-50",
    },
    {
      label: "Clientes del mes",
      value: clientesUnicos.toString(),
      delta:
        clientesNuevosEsteMes > 0
          ? `+${clientesNuevosEsteMes} nuevos`
          : "Sin nuevos",
      up: clientesNuevosEsteMes > 0 ? true : null,
      icon: <TrendingUp className="w-5 h-5" />,
      color: "text-orange-600",
      bg: "bg-orange-50",
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

        {navItems.map(({ label, icon, section }) => (
          <button
            key={section}
            onClick={() => setSeccion(section)}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition w-full text-left ${
              seccion === section
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

      {/* Contenido */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Topbar */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
          <div>
            <h3 className="text-foreground">
              {navItems.find((n) => n.section === seccion)?.label ??
                "Panel general"}
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
                .toUpperCase() || "AD"}
            </div>
          </div>
        </header>

        <div className="flex-1 p-6 space-y-6 overflow-auto">
          {/* Panel general */}
          {seccion === "panel" && (
            <>
              {/* KPIs */}
              <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                {statsCards.map((s) => (
                  <div
                    key={s.label}
                    className="bg-card border border-border rounded-xl p-4"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div
                        className={`w-10 h-10 rounded-lg ${s.bg} ${s.color} flex items-center justify-center`}
                      >
                        {s.icon}
                      </div>
                      {s.up !== null &&
                        (s.up ? (
                          <span className="flex items-center gap-0.5 text-xs text-emerald-600">
                            <ChevronUp className="w-3 h-3" />
                          </span>
                        ) : (
                          <span className="flex items-center gap-0.5 text-xs text-red-500">
                            <ChevronDown className="w-3 h-3" />
                          </span>
                        ))}
                    </div>
                    <p className="text-2xl text-foreground">{s.value}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {s.label}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {s.delta}
                    </p>
                  </div>
                ))}
              </div>

              {/* Gráficos */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Ingresos mensuales – área custom */}
                <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5">
                  <h4 className="text-foreground mb-4">Ingresos mensuales</h4>
                  <AreaChartCustom data={ingresosMensuales} />
                </div>

                {/* Pedidos por estado – barras custom */}
                <div className="bg-card border border-border rounded-xl p-5">
                  <h4 className="text-foreground mb-4">Pedidos por estado</h4>
                  <BarChartCustom data={pedidosPorEstado} />
                </div>
              </div>

              {/* Últimos pedidos */}
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                  <h4 className="text-foreground">Últimos pedidos</h4>
                  <div className="flex items-center gap-3">
                    <select
                      value={filtroUltimosPedidos}
                      onChange={(e) =>
                        setFiltroUltimosPedidos(
                          e.target.value as "5" | "10" | "20" | "semana",
                        )
                      }
                      className="text-sm bg-input-background border border-border rounded-lg px-2.5 py-1.5 text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20"
                    >
                      <option value="5">Últimos 5</option>
                      <option value="10">Últimos 10</option>
                      <option value="20">Últimos 20</option>
                      <option value="semana">Última semana</option>
                    </select>
                    <button
                      onClick={() => setSeccion("pedidos")}
                      className="text-sm text-muted-foreground hover:text-foreground transition"
                    >
                      Ver todos
                    </button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        {[
                          "N° Pedido",
                          "Cliente",
                          "Artículo",
                          "Fecha de Entrega",
                          "Estado",
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
                      {pedidosRecientes.length > 0 ? (
                        pedidosRecientes.map((p, i) => (
                          <tr
                            key={p.id}
                            className={`border-b border-border last:border-0 hover:bg-accent/40 transition ${i % 2 === 0 ? "" : "bg-muted/20"}`}
                          >
                            <td className="px-4 py-3 font-mono text-foreground">
                              <span className="flex items-center gap-1.5">
                                {p.urgente && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
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
                            <td className="px-4 py-3 text-muted-foreground">
                              {p.fechaEntrega
                                ? formatearFechaCorta(p.fechaEntrega)
                                : "-"}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs border ${estadoColor[p.estado]}`}
                              >
                                {p.estado === "Recibido" && (
                                  <Clock className="w-3 h-3" />
                                )}
                                {p.estado === "En confección" && (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                )}
                                {p.estado === "Listo para entrega" && (
                                  <Package className="w-3 h-3" />
                                )}
                                {p.estado === "Entregado" && (
                                  <CheckCircle2 className="w-3 h-3" />
                                )}
                                {p.estado === "Cancelado" && (
                                  <AlertCircle className="w-3 h-3" />
                                )}
                                {p.estado}
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan={5}
                            className="px-4 py-10 text-center text-muted-foreground text-sm"
                          >
                            No hay pedidos registrados aún. Los pedidos
                            aparecerán aquí cuando se registren.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* Empleados */}
          {seccion === "empleados" && (
            <div className="space-y-5">
              {/* Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-2xl text-foreground">
                      {empleados.length}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Total empleados
                    </p>
                  </div>
                </div>
                <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-2xl text-foreground">
                      {empleados.filter((e) => e.estado === "Activo").length}
                    </p>
                    <p className="text-xs text-muted-foreground">Activos</p>
                  </div>
                </div>
                <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-2xl text-foreground">
                      {empleados.filter((e) => e.estado === "Licencia").length}
                    </p>
                    <p className="text-xs text-muted-foreground">En licencia</p>
                  </div>
                </div>
                <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gray-50 text-gray-600 flex items-center justify-center shrink-0">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-2xl text-foreground">
                      {empleados.filter((e) => e.estado === "Inactivo").length}
                    </p>
                    <p className="text-xs text-muted-foreground">Inactivos</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Buscar empleado..."
                    value={busquedaEmpleado}
                    onChange={(e) => setBusquedaEmpleado(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-input-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20 transition text-sm"
                  />
                </div>
                <button
                  onClick={() => setModalEmpleadoAbierto(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Agregar empleado
                </button>
              </div>

              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      {[
                        "Código",
                        "Nombre",
                        "Rol",
                        "Correo",
                        "Teléfono",
                        "Fecha ingreso",
                        "Estado",
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
                    {filtrarEmpleados(empleados, busquedaEmpleado).map(
                      (e, i) => (
                        <tr
                          key={e.id}
                          className={`border-b border-border last:border-0 hover:bg-accent/40 transition ${i % 2 === 0 ? "" : "bg-muted/20"}`}
                        >
                          <td className="px-4 py-3 font-mono text-muted-foreground text-xs">
                            {e.id}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-foreground text-background flex items-center justify-center text-xs shrink-0">
                                {e.nombre
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")
                                  .slice(0, 2)}
                              </div>
                              <span className="text-foreground">
                                {e.nombre}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {e.rol}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {e.email}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {e.telefono}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {new Date(e.fechaIngreso).toLocaleDateString(
                              "es-ES",
                              {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              },
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <select
                              value={e.estado}
                              onChange={(evt) => {
                                actualizarEmpleado(e.id, {
                                  estado: evt.target.value as
                                    | "Activo"
                                    | "Licencia"
                                    | "Inactivo",
                                });
                              }}
                              className={`px-2 py-1 rounded-full text-xs border text-center focus:outline-none focus:ring-2 focus:ring-foreground/20 transition ${
                                e.estado === "Activo"
                                  ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                                  : e.estado === "Licencia"
                                    ? "bg-amber-100 text-amber-700 border-amber-200"
                                    : "bg-gray-100 text-gray-700 border-gray-200"
                              }`}
                            >
                              <option value="Activo">Activo</option>
                              <option value="Licencia">Licencia</option>
                              <option value="Inactivo">Inactivo</option>
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => setEmpleadoEditando(e)}
                                className="p-1.5 rounded hover:bg-accent transition text-muted-foreground"
                                title="Editar empleado"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setEmpleadoPassword(e)}
                                className="p-1.5 rounded hover:bg-accent transition text-muted-foreground"
                                title="Establecer contraseña"
                              >
                                <Lock className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setEmpleadoPermisos(e)}
                                className="p-1.5 rounded hover:bg-accent transition text-blue-600"
                                title="Gestionar permisos"
                              >
                                <Shield className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ),
                    )}
                    {loadingEmpleados && (
                      <tr>
                        <td
                          colSpan={8}
                          className="px-4 py-10 text-center text-muted-foreground text-sm"
                        >
                          <Loader2 className="w-5 h-5 animate-spin inline-block" />
                          <span className="ml-2">Cargando empleados...</span>
                        </td>
                      </tr>
                    )}
                    {!loadingEmpleados &&
                      filtrarEmpleados(empleados, busquedaEmpleado).length ===
                        0 && (
                        <tr>
                          <td
                            colSpan={8}
                            className="px-4 py-10 text-center text-muted-foreground text-sm"
                          >
                            {obtenerMensajeEmpleadosVacio(empleados.length)}
                          </td>
                        </tr>
                      )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Pedidos (sección completa) */}
          {seccion === "pedidos" && (
            <div className="space-y-4">
              {/* Stats de pedidos */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
                <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <ShoppingBag className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-2xl text-foreground">{pedidos.length}</p>
                    <p className="text-xs text-muted-foreground">
                      Total pedidos
                    </p>
                  </div>
                </div>
                <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-2xl text-foreground">
                      {pedidos.filter((p) => p.estado === "Recibido").length}
                    </p>
                    <p className="text-xs text-muted-foreground">Recibidos</p>
                  </div>
                </div>
                <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
                    <Loader2 className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-2xl text-foreground">
                      {
                        pedidos.filter((p) => p.estado === "En confección")
                          .length
                      }
                    </p>
                    <p className="text-xs text-muted-foreground">
                      En confección
                    </p>
                  </div>
                </div>
                <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <Package className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-2xl text-foreground">
                      {
                        pedidos.filter((p) => p.estado === "Listo para entrega")
                          .length
                      }
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Listos p/ entrega
                    </p>
                  </div>
                </div>
                <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gray-50 text-gray-600 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-2xl text-foreground">
                      {pedidos.filter((p) => p.estado === "Entregado").length}
                    </p>
                    <p className="text-xs text-muted-foreground">Entregados</p>
                  </div>
                </div>
                <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                    <XCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-2xl text-foreground">
                      {pedidos.filter((p) => p.estado === "Cancelado").length}
                    </p>
                    <p className="text-xs text-muted-foreground">Cancelados</p>
                  </div>
                </div>
                <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-2xl text-foreground">
                      {pedidos.filter((p) => p.urgente).length}
                    </p>
                    <p className="text-xs text-muted-foreground">Urgentes</p>
                  </div>
                </div>
              </div>

              {/* Tabs: Pedidos normales / Pedidos especiales */}
              <div className="flex gap-1 p-1 bg-muted rounded-xl w-fit">
                <button
                  onClick={() => setTabPedidos("normales")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition ${
                    tabPedidos === "normales"
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <ClipboardList className="w-4 h-4" />
                  Pedidos del catálogo
                  <span className="text-xs bg-muted-foreground/20 px-1.5 py-0.5 rounded-full">
                    {pedidosFiltrados.length}
                  </span>
                </button>
                <button
                  onClick={() => setTabPedidos("especiales")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition ${
                    tabPedidos === "especiales"
                      ? "bg-amber-100 text-amber-800 shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                  Pedidos especiales
                  {pedidosEspeciales.length > 0 && (
                    <span className="text-xs bg-amber-500 text-white px-1.5 py-0.5 rounded-full">
                      {pedidosEspeciales.length}
                    </span>
                  )}
                </button>
              </div>

              {/* Filtros y acciones */}
              <div
                className={`flex flex-col sm:flex-row gap-3 ${tabPedidos === "especiales" ? "hidden" : ""}`}
              >
                <button
                  onClick={() =>
                    setMostrarFiltrosPedidos(!mostrarFiltrosPedidos)
                  }
                  className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border border-border bg-input-background text-foreground text-sm hover:bg-accent transition shrink-0"
                >
                  <Filter className="w-4 h-4" />
                  <span>Filtros</span>
                  {(filtroEstadoPedidos !== "Todos" ||
                    filtroPrioridadPedidos !== "Todas" ||
                    fechaDesdePedidos ||
                    fechaHastaPedidos) && (
                    <span className="w-2 h-2 rounded-full bg-primary" />
                  )}
                </button>
                <button
                  onClick={handleExportarPedidosPDF}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-border bg-input-background text-foreground text-sm hover:bg-accent transition shrink-0"
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">Exportar PDF</span>
                </button>
              </div>

              {/* Panel de filtros */}
              {tabPedidos === "normales" && mostrarFiltrosPedidos && (
                <div className="bg-card border border-border rounded-xl p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1.5 block">
                        Estado
                      </label>
                      <select
                        value={filtroEstadoPedidos}
                        onChange={(e) => setFiltroEstadoPedidos(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20"
                      >
                        <option value="Todos">Todos</option>
                        <option value="Recibido">Recibido</option>
                        <option value="En confección">En confección</option>
                        <option value="Listo para entrega">
                          Listo para entrega
                        </option>
                        <option value="Entregado">Entregado</option>
                        <option value="Cancelado">Cancelado</option>
                        <option value="Vencido">Vencido</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1.5 block">
                        Prioridad
                      </label>
                      <select
                        value={filtroPrioridadPedidos}
                        onChange={(e) =>
                          setFiltroPrioridadPedidos(e.target.value)
                        }
                        className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20"
                      >
                        <option value="Todas">Todas</option>
                        <option value="Normal">Normal</option>
                        <option value="Urgente">Urgente</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1.5 block">
                        Desde
                      </label>
                      <input
                        type="date"
                        value={fechaDesdePedidos}
                        onChange={(e) => setFechaDesdePedidos(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1.5 block">
                        Hasta
                      </label>
                      <input
                        type="date"
                        value={fechaHastaPedidos}
                        onChange={(e) => setFechaHastaPedidos(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20"
                      />
                    </div>
                    <div className="sm:col-span-2 lg:col-span-4 flex gap-2">
                      <button
                        onClick={() =>
                          setOrdenFechaPedidos((o) =>
                            o === "desc" ? "asc" : "desc",
                          )
                        }
                        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-input-background text-foreground text-sm hover:bg-accent transition"
                      >
                        {ordenFechaPedidos === "desc" ? (
                          <ArrowDown className="w-4 h-4" />
                        ) : (
                          <ArrowUp className="w-4 h-4" />
                        )}
                        Ordenar:{" "}
                        {ordenFechaPedidos === "desc"
                          ? "Más recientes"
                          : "Más antiguos"}
                      </button>
                      <button
                        onClick={() => {
                          setFiltroEstadoPedidos("Todos");
                          setFiltroPrioridadPedidos("Todas");
                          setFechaDesdePedidos("");
                          setFechaHastaPedidos("");
                        }}
                        className="px-3 py-2 rounded-lg border border-border bg-input-background text-muted-foreground text-sm hover:bg-accent transition"
                      >
                        Limpiar filtros
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {tabPedidos === "normales" && (
                <div className="bg-card border border-border rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                    <h4 className="text-foreground">Todos los pedidos</h4>
                    <div className="text-sm text-muted-foreground">
                      {pedidosFiltrados.length}{" "}
                      {pedidosFiltrados.length === 1 ? "pedido" : "pedidos"}
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/30">
                          {[
                            "N° Pedido",
                            "Cliente",
                            "Artículo",
                            "Fecha de Entrega",
                            "Estado",
                            "Pago",
                            "Acciones",
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
                        {pedidosFiltrados.length > 0 ? (
                          pedidosFiltrados.map((p, i) => {
                            const cliente = clientes.find(
                              (c) => c.id === p.clienteId,
                            );
                            return (
                              <tr
                                key={p.id}
                                className={`border-b border-border last:border-0 hover:bg-accent/40 transition ${esPedidoVencido(p.fechaEntrega, p.estado) ? "bg-red-50/50" : i % 2 === 0 ? "" : "bg-muted/20"}`}
                              >
                                <td className="px-4 py-3 font-mono text-foreground">
                                  <span className="flex items-center gap-1.5">
                                    {p.urgente && (
                                      <span
                                        className="w-1.5 h-1.5 rounded-full bg-red-500"
                                        title="Urgente"
                                      />
                                    )}
                                    {esPedidoVencido(
                                      p.fechaEntrega,
                                      p.estado,
                                    ) && (
                                      <span
                                        className="w-1.5 h-1.5 rounded-full bg-orange-500"
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
                                <td className="px-4 py-3 text-muted-foreground">
                                  {p.fechaEntrega
                                    ? formatearFechaCorta(p.fechaEntrega)
                                    : "-"}
                                </td>
                                <td className="px-4 py-3">
                                  <span
                                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs border ${estadoColor[p.estado]}`}
                                  >
                                    {p.estado === "Recibido" && (
                                      <Clock className="w-3 h-3" />
                                    )}
                                    {p.estado === "En confección" && (
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                    )}
                                    {p.estado === "Listo para entrega" && (
                                      <Package className="w-3 h-3" />
                                    )}
                                    {p.estado === "Entregado" && (
                                      <CheckCircle2 className="w-3 h-3" />
                                    )}
                                    {p.estado === "Cancelado" && (
                                      <AlertCircle className="w-3 h-3" />
                                    )}
                                    {p.estado}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  {(() => {
                                    // Si el pedido está cancelado, no mostrar estado de pago
                                    if (p.estado === "Cancelado") {
                                      return (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600 border border-gray-200">
                                          —
                                        </span>
                                      );
                                    }

                                    const montoTotal = p.montoTotal || 0;
                                    const montoPagado = p.montoPagado || 0;
                                    const pendiente = calcularSaldoPendiente(
                                      montoTotal,
                                      montoPagado,
                                    );

                                    if (pendiente <= 0 && montoTotal > 0) {
                                      return (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-green-50 text-green-700 border border-green-200">
                                          <CheckCircle className="w-3 h-3" />
                                          Pagado
                                        </span>
                                      );
                                    }
                                    if (montoPagado > 0 && pendiente > 0) {
                                      return (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-yellow-50 text-yellow-700 border border-yellow-200">
                                          <Clock className="w-3 h-3" />
                                          Parcial
                                        </span>
                                      );
                                    }
                                    return (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-red-50 text-red-700 border border-red-200">
                                        <XCircle className="w-3 h-3" />
                                        Pendiente
                                      </span>
                                    );
                                  })()}
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() => setPedidoSeleccionado(p)}
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 transition text-blue-700 text-xs font-medium border border-blue-200"
                                      title="Ver detalles del pedido"
                                    >
                                      <FileText className="w-3.5 h-3.5" />
                                      Ver detalles
                                    </button>
                                    {cliente && (
                                      <button
                                        onClick={() =>
                                          setClienteHistorial(cliente)
                                        }
                                        className="p-1.5 rounded hover:bg-accent transition text-purple-600"
                                        title="Ver historial del cliente"
                                      >
                                        <User className="w-4 h-4" />
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td
                              colSpan={7}
                              className="px-4 py-10 text-center text-muted-foreground text-sm"
                            >
                              No hay pedidos registrados aún. Los pedidos que se
                              registren en el sistema aparecerán aquí.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Vista pedidos especiales */}
              {tabPedidos === "especiales" && (
                <div className="space-y-4">
                  {/* Banner informativo */}
                  <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-800">
                    <Sparkles className="w-5 h-5 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">
                        Pedidos con productos especiales
                      </p>
                      <p className="text-xs text-amber-700 mt-0.5">
                        Estos pedidos contienen productos fuera del catálogo
                        (tallas, colores o modelos personalizados).{" "}
                        <strong>No afectan el inventario.</strong> Requieren
                        coordinación manual con producción.
                      </p>
                    </div>
                  </div>

                  {/* Barra de búsqueda */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Buscar por código, cliente o artículo..."
                      value={busquedaEspeciales}
                      onChange={(e) => setBusquedaEspeciales(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20"
                    />
                    {busquedaEspeciales && (
                      <button
                        onClick={() => setBusquedaEspeciales("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {pedidosEspeciales.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-400 flex items-center justify-center mb-4">
                        <Sparkles className="w-7 h-7" />
                      </div>
                      <p className="text-foreground font-medium mb-1">
                        Sin pedidos especiales
                      </p>
                      <p className="text-sm text-muted-foreground max-w-xs">
                        Cuando se registre un pedido con productos fuera del
                        catálogo, aparecerá aquí.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {pedidosEspeciales.map((pedido) => {
                        const cliente = clientes.find(
                          (c) => c.id === pedido.clienteId,
                        );
                        const itemsEspeciales =
                          pedido.items?.filter(
                            (i) =>
                              i.esEspecial || i.productoCodigo === "ESPECIAL",
                          ) ?? [];
                        // Agrupar items por modelo-tela-disenio
                        const productos_uniq = [
                          ...new Map(
                            itemsEspeciales.map((i) => [
                              `${i.modelo}|${i.tela}|${i.disenio}`,
                              {
                                modelo: i.modelo,
                                tela: i.tela,
                                disenio: i.disenio,
                              },
                            ]),
                          ).values(),
                        ];
                        const totalUnidades = itemsEspeciales.reduce(
                          (s, i) => s + i.cantidad,
                          0,
                        );

                        return (
                          <div
                            key={pedido.id}
                            className="bg-card border border-amber-200 rounded-xl overflow-hidden"
                          >
                            {/* Header de la tarjeta */}
                            <div className="flex items-center justify-between px-4 py-3 bg-amber-50 border-b border-amber-200">
                              <div className="flex items-center gap-3">
                                <span className="text-xs font-mono text-amber-700 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full">
                                  {pedido.codigo}
                                </span>
                                <span className="font-medium text-sm text-foreground">
                                  {pedido.cliente}
                                </span>
                                {pedido.urgente && (
                                  <span className="text-xs bg-red-100 text-red-700 border border-red-200 px-2 py-0.5 rounded-full">
                                    ⚡ Urgente
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <span
                                  className={`text-xs px-2.5 py-1 rounded-full border ${
                                    pedido.estado === "Recibido"
                                      ? "bg-blue-50 text-blue-700 border-blue-200"
                                      : pedido.estado === "En confección"
                                        ? "bg-violet-50 text-violet-700 border-violet-200"
                                        : pedido.estado === "Listo para entrega"
                                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                          : pedido.estado === "Entregado"
                                            ? "bg-gray-50 text-gray-600 border-gray-200"
                                            : "bg-red-50 text-red-700 border-red-200"
                                  }`}
                                >
                                  {pedido.estado}
                                </span>
                                <button
                                  onClick={() => setPedidoSeleccionado(pedido)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 transition text-amber-700 text-xs font-medium border border-amber-200"
                                  title="Ver detalles"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                  Ver detalles
                                </button>
                              </div>
                            </div>

                            {/* Cuerpo */}
                            <div className="px-4 py-3 space-y-3">
                              {/* Fechas y cliente */}
                              <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
                                <span>
                                  <span className="font-medium text-foreground/70">
                                    Registrado:
                                  </span>{" "}
                                  {formatearFechaCorta(pedido.fecha)}
                                </span>
                                {pedido.fechaEntrega && (
                                  <span>
                                    <span className="font-medium text-foreground/70">
                                      Entrega:
                                    </span>{" "}
                                    {formatearFechaCorta(pedido.fechaEntrega)}
                                  </span>
                                )}
                                {cliente && (
                                  <span>
                                    <span className="font-medium text-foreground/70">
                                      Tel:
                                    </span>{" "}
                                    {cliente.celular}
                                  </span>
                                )}
                              </div>

                              {/* Productos especiales */}
                              <div>
                                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
                                  Productos especiales ({totalUnidades}{" "}
                                  unidades)
                                </p>
                                <div className="space-y-1.5">
                                  {productos_uniq.map((prod, pi) => {
                                    const itemsDeProd = itemsEspeciales.filter(
                                      (i) =>
                                        i.modelo === prod.modelo &&
                                        i.tela === prod.tela &&
                                        i.disenio === prod.disenio,
                                    );
                                    const unidadesProd = itemsDeProd.reduce(
                                      (s, i) => s + i.cantidad,
                                      0,
                                    );
                                    return (
                                      <div
                                        key={pi}
                                        className="flex items-start justify-between px-3 py-2.5 rounded-lg bg-amber-50/60 border border-amber-100"
                                      >
                                        <div>
                                          <p className="text-sm font-medium text-foreground">
                                            {prod.modelo} · {prod.tela} ·{" "}
                                            {prod.disenio}
                                          </p>
                                          <div className="flex flex-wrap gap-1.5 mt-1">
                                            {itemsDeProd.map((item, ii) => (
                                              <span
                                                key={ii}
                                                className="text-xs bg-background border border-amber-200 text-amber-800 px-2 py-0.5 rounded-full"
                                              >
                                                {item.talla} · {item.color} ×
                                                {item.cantidad}
                                              </span>
                                            ))}
                                          </div>
                                        </div>
                                        <span className="text-xs text-muted-foreground shrink-0 mt-1">
                                          {unidadesProd} ud.
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* Estado de pago y tipo de pedido */}
                              <div className="flex flex-wrap items-center gap-2 border-t border-amber-100 pt-2">
                                {/* Estado de pago */}
                                <span
                                  className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${
                                    pedido.estadoPago === "Pagado"
                                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                      : pedido.estadoPago === "Parcial"
                                        ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                                        : "bg-red-50 text-red-600 border-red-200"
                                  }`}
                                >
                                  {pedido.estadoPago === "Pagado"
                                    ? "✓ Pagado"
                                    : pedido.estadoPago === "Parcial"
                                      ? "½ Parcial"
                                      : "✕ Pendiente"}
                                  {pedido.montoTotal &&
                                    pedido.montoTotal > 0 && (
                                      <span className="ml-1 opacity-80">
                                        S/ {pedido.montoTotal.toFixed(2)}
                                      </span>
                                    )}
                                </span>
                                {/* Tipo de pedido */}
                                <span
                                  className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full border ${
                                    pedido.tipoPedido === "venta_directa"
                                      ? "bg-blue-50 text-blue-700 border-blue-200"
                                      : "bg-violet-50 text-violet-700 border-violet-200"
                                  }`}
                                >
                                  {pedido.tipoPedido === "venta_directa"
                                    ? "🛍 Venta directa"
                                    : "🧵 Fabricar"}
                                </span>
                              </div>

                              {/* Notas del cliente */}
                              {tieneNotasParaMostrar(pedido.notas) && (
                                <p className="text-xs text-muted-foreground italic border-t border-border pt-2">
                                  {pedido.notas}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Catálogo de productos */}
          {seccion === "catalogo" && (
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
                              ts + t.colores.reduce((cs, c) => cs + c.stock, 0),
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
                <button
                  onClick={() => setModalProductoAbierto(true)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition text-sm shrink-0"
                >
                  <Plus className="w-4 h-4" /> Agregar producto
                </button>
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
                        const filtrados = filtrarCatalogo(
                          productos,
                          busquedaProducto,
                        );
                        if (filtrados.length === 0)
                          return (
                            <tr>
                              <td
                                colSpan={7}
                                className="px-4 py-10 text-center text-muted-foreground text-sm"
                              >
                                {obtenerMensajeCatalogoVacio(productos.length)}
                              </td>
                            </tr>
                          );
                        return filtrados.map((p, i) => {
                          const stockTotal = p.tallas.reduce(
                            (s, t) =>
                              s + t.colores.reduce((cs, c) => cs + c.stock, 0),
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
                                  <div className="flex items-center justify-end gap-2">
                                    <button
                                      type="button"
                                      onClick={() => setProductoEditando(p)}
                                      className="px-3 py-1.5 rounded-lg text-xs border border-border text-foreground hover:bg-accent transition"
                                    >
                                      Agregar tallas y colores
                                    </button>
                                  </div>
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
                                        Detalle de stock — {p.modelo} · {p.tela}{" "}
                                        · {p.disenio}
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
          )}

          {/* Clientes */}
          {seccion === "clientes" && (
            <div className="space-y-6">
              {/* Header con filtros y exportar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-foreground">Gestión de Clientes</h3>
                  <p className="text-muted-foreground text-sm">
                    Base de datos de todos los clientes registrados
                  </p>
                </div>
                <button
                  onClick={handleExportarClientesPDF}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition"
                >
                  <Download className="w-4 h-4" />
                  Exportar PDF
                </button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-card border border-border rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-2xl text-foreground">
                        {clientes.length}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Total clientes
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-card border border-border rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-green-50 text-green-600 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-2xl text-foreground">
                        {
                          clientes.filter((c) =>
                            pedidos.some((p) => p.clienteId === c.id),
                          ).length
                        }
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Con pedidos
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-card border border-border rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-2xl text-foreground">
                        {
                          clientes.filter((c) => {
                            const hoy = new Date();
                            const hace30Dias = new Date(
                              hoy.getTime() - 30 * 24 * 60 * 60 * 1000,
                            );
                            return new Date(c.fechaRegistro) >= hace30Dias;
                          }).length
                        }
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Últimos 30 días
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-card border border-border rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                      <Mail className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-2xl text-foreground">
                        {clientes.filter((c) => c.email).length}
                      </p>
                      <p className="text-xs text-muted-foreground">Con email</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Filtros */}
              <div className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-semibold text-foreground">
                    Filtros de búsqueda
                  </h4>
                  {(busquedaCliente || filtroEstadoCliente !== "Todos") && (
                    <button
                      onClick={() => {
                        setBusquedaCliente("");
                        setFiltroEstadoCliente("Todos");
                      }}
                      className="text-xs text-primary hover:underline"
                    >
                      Limpiar filtros
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {/* Búsqueda */}
                  <div className="lg:col-span-2">
                    <label className="text-xs text-muted-foreground mb-1.5 block">
                      Buscar cliente
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Nombre, email, teléfono o RUC..."
                        value={busquedaCliente}
                        onChange={(e) => setBusquedaCliente(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-input-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20 transition text-sm"
                      />
                      {busquedaCliente && (
                        <button
                          onClick={() => setBusquedaCliente("")}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Filtro por estado */}
                  <div>
                    <label className="text-xs text-muted-foreground mb-1.5 block">
                      Filtrar por
                    </label>
                    <div className="relative">
                      <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <select
                        value={filtroEstadoCliente}
                        onChange={(e) => setFiltroEstadoCliente(e.target.value)}
                        className="w-full pl-10 pr-3 py-2.5 bg-background border border-input rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary transition appearance-none cursor-pointer"
                      >
                        <option value="Todos">Todos los clientes</option>
                        <option value="ConPedidos">✓ Con pedidos</option>
                        <option value="SinPedidos">○ Sin pedidos</option>
                        <option value="ConEmail">✉ Con email</option>
                        <option value="SinEmail">✕ Sin email</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* Resumen de filtros activos */}
                {(busquedaCliente || filtroEstadoCliente !== "Todos") && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>Mostrando:</span>
                      <span className="font-medium text-foreground">
                        {clientesFiltrados.length}{" "}
                        {clientesFiltrados.length === 1
                          ? "cliente"
                          : "clientes"}
                      </span>
                      {busquedaCliente && (
                        <span className="px-2 py-0.5 bg-primary/10 text-primary rounded">
                          Búsqueda: "{busquedaCliente}"
                        </span>
                      )}
                      {filtroEstadoCliente !== "Todos" && (
                        <span className="px-2 py-0.5 bg-primary/10 text-primary rounded">
                          {filtroEstadoCliente === "ConPedidos" &&
                            "Con pedidos"}
                          {filtroEstadoCliente === "SinPedidos" &&
                            "Sin pedidos"}
                          {filtroEstadoCliente === "ConEmail" && "Con email"}
                          {filtroEstadoCliente === "SinEmail" && "Sin email"}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Tabla de Clientes */}
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 z-10 bg-card shadow-sm">
                      <tr className="border-b-2 border-border">
                        <th className="text-left px-4 py-3 text-muted-foreground font-normal">
                          Nombre
                        </th>
                        <th className="text-left px-4 py-3 text-muted-foreground font-normal">
                          Email
                        </th>
                        <th className="text-left px-4 py-3 text-muted-foreground font-normal">
                          Teléfono
                        </th>
                        <th className="text-left px-4 py-3 text-muted-foreground font-normal">
                          RUC
                        </th>
                        <th className="text-left px-4 py-3 text-muted-foreground font-normal">
                          Pedidos
                        </th>
                        <th className="text-left px-4 py-3 text-muted-foreground font-normal">
                          Registro
                        </th>
                        <th className="text-left px-4 py-3 text-muted-foreground font-normal">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {loadingClientes ? (
                        <tr>
                          <td colSpan={7} className="px-4 py-10 text-center">
                            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground mx-auto" />
                          </td>
                        </tr>
                      ) : clientesFiltrados.length === 0 ? (
                        <tr>
                          <td
                            colSpan={7}
                            className="px-4 py-10 text-center text-muted-foreground text-sm"
                          >
                            No se encontraron clientes
                          </td>
                        </tr>
                      ) : (
                        clientesFiltrados.map((cliente) => {
                          const pedidosCliente = pedidos.filter(
                            (p) => p.clienteId === cliente.id,
                          );
                          return (
                            <tr
                              key={cliente.id}
                              className="border-b border-border hover:bg-accent/50 transition"
                            >
                              <td className="px-4 py-3">
                                <span className="font-medium text-foreground">
                                  {cliente.nombre}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <span className="text-muted-foreground text-xs">
                                  {cliente.email || "—"}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <span className="text-muted-foreground text-xs">
                                  {cliente.celular}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <span className="text-muted-foreground text-xs">
                                  {cliente.ruc || "—"}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <span className="text-foreground font-medium">
                                  {pedidosCliente.length}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <span className="text-muted-foreground text-xs">
                                  {new Date(
                                    cliente.fechaRegistro,
                                  ).toLocaleDateString("es-PE")}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <button
                                  onClick={() => setClienteHistorial(cliente)}
                                  className="p-1.5 rounded hover:bg-accent transition text-blue-600"
                                  title="Ver historial de pedidos"
                                >
                                  <FileText className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Pagos */}
          {seccion === "pagos" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-foreground">Gestión de Pagos</h3>
                  <p className="text-muted-foreground text-sm">
                    Seguimiento de ingresos y pagos de pedidos
                  </p>
                </div>
                <button
                  onClick={() => setReportTypeModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition text-sm"
                >
                  <Download className="w-4 h-4" />
                  Exportar PDF
                </button>
              </div>

              {/* Filtros de fecha y método */}
              <div className="bg-card border border-border rounded-xl p-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* Presets de fecha */}
                  <div>
                    <label className="text-xs text-muted-foreground mb-2 block">
                      Período
                    </label>
                    <select
                      value={filtroPresetPagos}
                      onChange={(e) => aplicarPresetPagos(e.target.value)}
                      className="w-full px-3 py-2 bg-background border border-input rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option>Todos</option>
                      <option>Hoy</option>
                      <option>Esta semana</option>
                      <option>Este mes</option>
                      <option>Mes anterior</option>
                      <option>Este año</option>
                    </select>
                  </div>

                  {/* Fecha desde */}
                  <div>
                    <label className="text-xs text-muted-foreground mb-2 block">
                      Desde
                    </label>
                    <input
                      type="date"
                      value={fechaDesdePagos}
                      onChange={(e) => {
                        setFechaDesdePagos(e.target.value);
                        setFiltroPresetPagos("Todos");
                      }}
                      className="w-full px-3 py-2 bg-background border border-input rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  {/* Fecha hasta */}
                  <div>
                    <label className="text-xs text-muted-foreground mb-2 block">
                      Hasta
                    </label>
                    <input
                      type="date"
                      value={fechaHastaPagos}
                      onChange={(e) => {
                        setFechaHastaPagos(e.target.value);
                        setFiltroPresetPagos("Todos");
                      }}
                      className="w-full px-3 py-2 bg-background border border-input rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  {/* Método de pago */}
                  <div>
                    <label className="text-xs text-muted-foreground mb-2 block">
                      Método
                    </label>
                    <select
                      value={filtroMetodoPago}
                      onChange={(e) => setFiltroMetodoPago(e.target.value)}
                      className="w-full px-3 py-2 bg-background border border-input rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option>Todos</option>
                      <option>Efectivo</option>
                      <option>QR/Transferencia</option>
                    </select>
                  </div>
                </div>

                {/* Indicador de filtros activos */}
                {(fechaDesdePagos ||
                  fechaHastaPagos ||
                  filtroMetodoPago !== "Todos" ||
                  filtroPresetPagos !== "Todos") && (
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Filter className="w-3 h-3" />
                      <span>
                        Mostrando {pagosFiltrados.length} de {pagos.length}{" "}
                        pagos
                        {filtroPresetPagos !== "Todos" &&
                          ` - ${filtroPresetPagos}`}
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        setFechaDesdePagos("");
                        setFechaHastaPagos("");
                        setFiltroMetodoPago("Todos");
                        setFiltroPresetPagos("Todos");
                        setFiltroEstadoPagoPendientes("Todos");
                      }}
                      className="text-xs text-primary hover:underline"
                    >
                      Limpiar filtros
                    </button>
                  </div>
                )}
              </div>

              {/* Estadísticas */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                      <Coins className="w-5 h-5 text-green-600" />
                    </div>
                    <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-1 rounded-full">
                      Total
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-green-900">
                    {formatearSoles(
                      pagosFiltrados.reduce((sum, p) => sum + p.monto, 0),
                    )}
                  </p>
                  <p className="text-xs text-green-700 mt-1">
                    Ingresos{" "}
                    {filtroPresetPagos !== "Todos"
                      ? filtroPresetPagos.toLowerCase()
                      : "totales"}
                  </p>
                </div>

                <div className="bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200 rounded-xl p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                      <Clock className="w-5 h-5 text-orange-600" />
                    </div>
                    <span className="text-xs font-medium text-orange-700 bg-orange-100 px-2 py-1 rounded-full">
                      Pendiente
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-orange-900">
                    {
                      pedidos.filter(
                        (p) =>
                          p.estado !== "Cancelado" && p.estadoPago !== "Pagado",
                      ).length
                    }
                  </p>
                  <p className="text-xs text-orange-700 mt-1">
                    Pagos pendientes
                  </p>
                </div>

                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-blue-600" />
                    </div>
                    <span className="text-xs font-medium text-blue-700 bg-blue-100 px-2 py-1 rounded-full">
                      Parcial
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-blue-900">
                    {pedidos.filter((p) => p.estadoPago === "Parcial").length}
                  </p>
                  <p className="text-xs text-blue-700 mt-1">Pagos parciales</p>
                </div>

                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    </div>
                    <span className="text-xs font-medium text-emerald-700 bg-emerald-100 px-2 py-1 rounded-full">
                      Completo
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-emerald-900">
                    {pedidos.filter((p) => p.estadoPago === "Pagado").length}
                  </p>
                  <p className="text-xs text-emerald-700 mt-1">
                    Pagos completos
                  </p>
                </div>
              </div>

              {/* Resumen de Formas de Pago */}
              <div className="bg-card border border-border rounded-xl p-5">
                <h4 className="text-foreground font-medium mb-4">
                  Resumen por Forma de Pago
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  {(() => {
                    const efectivo = pagosFiltrados
                      .filter((p) => p.metodoPago === "Efectivo")
                      .reduce((sum, p) => sum + p.monto, 0);
                    const qr = pagosFiltrados
                      .filter((p) => p.metodoPago === "QR/Transferencia")
                      .reduce((sum, p) => sum + p.monto, 0);

                    return (
                      <>
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Coins className="w-5 h-5 text-green-600" />
                            <p className="text-sm font-medium text-green-900">
                              Efectivo
                            </p>
                          </div>
                          <p className="text-xl font-bold text-green-700">
                            {formatearSoles(efectivo)}
                          </p>
                          <p className="text-xs text-green-600 mt-1">
                            {
                              pagosFiltrados.filter(
                                (p) => p.metodoPago === "Efectivo",
                              ).length
                            }{" "}
                            pagos
                          </p>
                        </div>
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <CreditCard className="w-5 h-5 text-blue-600" />
                            <p className="text-sm font-medium text-blue-900">
                              QR/Transferencia
                            </p>
                          </div>
                          <p className="text-xl font-bold text-blue-700">
                            {formatearSoles(qr)}
                          </p>
                          <p className="text-xs text-blue-600 mt-1">
                            {
                              pagosFiltrados.filter(
                                (p) => p.metodoPago === "QR/Transferencia",
                              ).length
                            }{" "}
                            pagos
                          </p>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Historial de Pagos Recientes */}
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-border">
                  <h4 className="text-foreground font-medium">
                    Historial de Pagos Recientes
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    {pagosFiltrados.length} pagos registrados
                  </p>
                </div>
                <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 z-10 bg-card shadow-sm">
                      <tr className="border-b-2 border-border">
                        <th className="text-left px-4 py-3 text-muted-foreground font-normal">
                          Fecha
                        </th>
                        <th className="text-left px-4 py-3 text-muted-foreground font-normal">
                          Pedido
                        </th>
                        <th className="text-left px-4 py-3 text-muted-foreground font-normal">
                          Monto
                        </th>
                        <th className="text-left px-4 py-3 text-muted-foreground font-normal">
                          Método
                        </th>
                        <th className="text-left px-4 py-3 text-muted-foreground font-normal">
                          N° operación / Referencia
                        </th>
                        <th className="text-left px-4 py-3 text-muted-foreground font-normal">
                          Registrado por
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {loadingPagos ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-10 text-center">
                            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground mx-auto" />
                          </td>
                        </tr>
                      ) : pagosFiltrados.length === 0 ? (
                        <tr>
                          <td
                            colSpan={6}
                            className="px-4 py-10 text-center text-muted-foreground text-sm"
                          >
                            {pagos.length === 0
                              ? "No hay pagos registrados aún"
                              : "No hay pagos que coincidan con los filtros seleccionados"}
                          </td>
                        </tr>
                      ) : (
                        pagosFiltrados.map((pago, i) => (
                          <tr
                            key={pago.id}
                            className={`border-b border-border last:border-0 hover:bg-accent/50 transition ${i % 2 === 0 ? "" : "bg-muted/20"}`}
                          >
                            <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                              {new Date(pago.fechaPago).toLocaleDateString(
                                "es-PE",
                                {
                                  day: "2-digit",
                                  month: "2-digit",
                                  year: "numeric",
                                },
                              )}{" "}
                              {new Date(pago.fechaPago).toLocaleTimeString(
                                "es-PE",
                                {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                },
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <span className="font-mono text-xs text-foreground">
                                {pago.pedidoCodigo}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="font-semibold text-green-600">
                                {formatearSoles(pago.monto)}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-muted text-foreground">
                                {pago.metodoPago}
                              </span>
                            </td>
                            <td
                              className="px-4 py-3 text-muted-foreground text-xs"
                              title="Para pagos QR o transferencia: número de operación bancaria o código de confirmación"
                            >
                              {pago.referencia || (
                                <span className="text-muted-foreground/40">
                                  —
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground text-xs">
                              {pago.usuarioNombre}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Tabla de Pagos Pendientes */}
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-border bg-muted/20 flex items-center justify-between gap-4">
                  <div>
                    <h4 className="text-foreground font-semibold">
                      Pagos Pendientes
                    </h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      Pedidos con saldos pendientes de pago
                    </p>
                  </div>
                  {/* Filtro de estado de pago */}
                  <select
                    value={filtroEstadoPagoPendientes}
                    onChange={(e) =>
                      setFiltroEstadoPagoPendientes(e.target.value)
                    }
                    className="px-3 py-1.5 rounded-lg bg-background border border-input text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary shrink-0"
                  >
                    <option value="Todos">Todos</option>
                    <option value="Pendiente">Solo Pendiente</option>
                    <option value="Parcial">Solo Parcial</option>
                  </select>
                </div>
                <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 z-10 bg-card shadow-sm">
                      <tr className="border-b-2 border-border">
                        <th className="text-left px-4 py-3 text-muted-foreground font-normal">
                          Pedido
                        </th>
                        <th className="text-left px-4 py-3 text-muted-foreground font-normal">
                          Cliente
                        </th>
                        <th className="text-left px-4 py-3 text-muted-foreground font-normal">
                          Monto Total
                        </th>
                        <th className="text-left px-4 py-3 text-muted-foreground font-normal">
                          Pagado
                        </th>
                        <th className="text-left px-4 py-3 text-muted-foreground font-normal">
                          Pendiente
                        </th>
                        <th className="text-left px-4 py-3 text-muted-foreground font-normal">
                          Estado
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const pedidosPendientes = pedidos.filter((p) => {
                          if (
                            p.estado === "Cancelado" ||
                            p.estado === "Vencido"
                          )
                            return false;
                          const montoTotal = p.montoTotal || 0;
                          const montoPagado = p.montoPagado || 0;
                          const pendiente = calcularSaldoPendiente(
                            montoTotal,
                            montoPagado,
                          );
                          if (!(pendiente > 0 && montoTotal > 0)) return false;
                          // Aplicar filtro de estado de pago
                          if (
                            filtroEstadoPagoPendientes !== "Todos" &&
                            p.estadoPago !== filtroEstadoPagoPendientes
                          )
                            return false;
                          return true;
                        });

                        if (pedidosPendientes.length === 0) {
                          return (
                            <tr>
                              <td
                                colSpan={6}
                                className="px-4 py-10 text-center text-muted-foreground text-sm"
                              >
                                Todos los pagos están al día ✓
                              </td>
                            </tr>
                          );
                        }

                        return pedidosPendientes.map((p) => {
                          const montoTotal = p.montoTotal || 0;
                          const montoPagado = p.montoPagado || 0;
                          const pendiente = calcularSaldoPendiente(
                            montoTotal,
                            montoPagado,
                          );
                          const vencido = esPedidoVencido(
                            p.fechaEntrega,
                            p.estado,
                          );
                          const diasRestantes = diasHastaVencimiento(
                            p.fechaEntrega,
                            p.estado,
                          );

                          return (
                            <tr
                              key={p.codigo}
                              className={`border-b border-border hover:bg-accent/40 transition ${
                                vencido ? "bg-red-50/30" : ""
                              }`}
                            >
                              <td className="px-4 py-3">
                                <span className="font-mono font-semibold text-foreground">
                                  {p.codigo}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-foreground">
                                {p.cliente}
                              </td>
                              <td className="px-4 py-3">
                                <span className="font-semibold text-foreground">
                                  {formatearSoles(montoTotal)}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <span className="text-green-600 font-medium">
                                  {formatearSoles(montoPagado)}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <span
                                  className={`font-semibold ${
                                    vencido ? "text-red-600" : "text-orange-600"
                                  }`}
                                >
                                  {formatearSoles(pendiente)}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <span
                                  className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
                                    vencido
                                      ? "bg-red-50 text-red-700 border-red-200"
                                      : "bg-orange-50 text-orange-700 border-orange-200"
                                  }`}
                                >
                                  {vencido ? "🔴 Vencido" : "⏳ Pendiente"}
                                </span>
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Modal de selección de tipo de reporte */}
          {reportTypeModalOpen && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-md">
                <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-foreground">
                    Seleccionar Tipo de Reporte
                  </h3>
                  <button
                    onClick={() => setReportTypeModalOpen(false)}
                    className="p-2 hover:bg-accent rounded-lg transition"
                  >
                    <X className="w-5 h-5 text-muted-foreground" />
                  </button>
                </div>

                <div className="p-6 space-y-4">
                  <div
                    onClick={() => {
                      setSelectedReportType("historial");
                      handleExportarPagosPDF("historial");
                    }}
                    className="p-4 border border-border rounded-lg cursor-pointer hover:bg-accent/50 transition"
                  >
                    <div className="flex items-start gap-3">
                      <FileText className="w-5 h-5 text-blue-500 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-foreground">
                          Historial de Pagos
                        </h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          Reporte detallado de todos los pagos realizados
                          durante el período seleccionado
                        </p>
                      </div>
                    </div>
                  </div>

                  <div
                    onClick={() => {
                      setSelectedReportType("pendientes");
                      handleExportarPagosPDF("pendientes");
                    }}
                    className="p-4 border border-border rounded-lg cursor-pointer hover:bg-accent/50 transition"
                  >
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-orange-500 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-foreground">
                          Pagos Pendientes
                        </h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          Lista de pedidos con saldos pendientes de pago,
                          incluyendo estado de vencimiento
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="px-6 py-4 border-t border-border flex gap-3 justify-end">
                  <button
                    onClick={() => setReportTypeModalOpen(false)}
                    className="px-4 py-2 rounded-lg border border-border text-foreground hover:bg-accent transition text-sm"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Auditoría */}
          {seccion === "auditoria" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-foreground">Auditoría del sistema</h3>
                  <p className="text-muted-foreground text-sm">
                    Registro de todas las acciones realizadas en el sistema
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">
                    {auditoriaFiltrada.length} de {auditoriaRegistros.length}{" "}
                    registros
                  </span>
                  <button
                    onClick={() =>
                      setMostrarFiltrosAuditoria(!mostrarFiltrosAuditoria)
                    }
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition ${
                      mostrarFiltrosAuditoria
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-foreground border-border hover:bg-accent"
                    }`}
                  >
                    <Filter className="w-4 h-4" />
                    Filtros
                    {mostrarFiltrosAuditoria ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Panel de filtros */}
              {mostrarFiltrosAuditoria && (
                <div className="bg-card border border-border rounded-xl p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-sm text-foreground">
                        Fecha desde
                      </label>
                      <input
                        type="date"
                        value={filtroFechaDesde}
                        onChange={(e) => setFiltroFechaDesde(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm text-foreground">
                        Fecha hasta
                      </label>
                      <input
                        type="date"
                        value={filtroFechaHasta}
                        onChange={(e) => setFiltroFechaHasta(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm text-foreground">Usuario</label>
                      <input
                        type="text"
                        placeholder="Buscar por nombre o código"
                        value={filtroUsuario}
                        onChange={(e) => setFiltroUsuario(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm text-foreground">Acción</label>
                      <select
                        value={filtroAccion}
                        onChange={(e) => setFiltroAccion(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20"
                      >
                        <option value="">Todas las acciones</option>
                        <option value="crear">Crear</option>
                        <option value="editar">Editar</option>
                        <option value="eliminar">Eliminar</option>
                        <option value="cambiar_estado">Cambiar estado</option>
                        <option value="cancelar">Cancelar</option>
                        <option value="login">Login</option>
                        <option value="logout">Logout</option>
                        <option value="establecer_password">
                          Establecer password
                        </option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm text-foreground">Módulo</label>
                      <select
                        value={filtroModulo}
                        onChange={(e) => setFiltroModulo(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20"
                      >
                        <option value="">Todos los módulos</option>
                        <option value="empleados">Empleados</option>
                        <option value="clientes">Clientes</option>
                        <option value="productos">Productos</option>
                        <option value="pedidos">Pedidos</option>
                        <option value="autenticacion">Autenticación</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border">
                    <button
                      onClick={() => {
                        setFiltroFechaDesde("");
                        setFiltroFechaHasta("");
                        setFiltroUsuario("");
                        setFiltroAccion("");
                        setFiltroModulo("");
                      }}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-background border border-border text-foreground text-sm hover:bg-accent transition"
                    >
                      <XCircle className="w-4 h-4" />
                      Limpiar filtros
                    </button>
                  </div>
                </div>
              )}

              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 z-10 bg-card shadow-sm">
                      <tr className="border-b-2 border-border">
                        {[
                          "Fecha y Hora",
                          "Usuario",
                          "Acción",
                          "Módulo",
                          "Entidad",
                          "Detalles",
                        ].map((h) => (
                          <th
                            key={h}
                            className="text-left px-4 py-3 text-muted-foreground font-normal whitespace-nowrap bg-card"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {loadingAuditoria ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-10 text-center">
                            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground mx-auto mb-2" />
                            <p className="text-muted-foreground text-sm">
                              Cargando registros de auditoría...
                            </p>
                          </td>
                        </tr>
                      ) : auditoriaFiltrada.length === 0 ? (
                        <tr>
                          <td
                            colSpan={6}
                            className="px-4 py-10 text-center text-muted-foreground text-sm"
                          >
                            {auditoriaRegistros.length === 0
                              ? "No hay registros de auditoría disponibles."
                              : "No se encontraron registros con los filtros aplicados."}
                          </td>
                        </tr>
                      ) : (
                        auditoriaFiltrada.map((registro, i) => {
                          const accionColor: Record<string, string> = {
                            crear:
                              "bg-emerald-50 text-emerald-700 border-emerald-200",
                            editar: "bg-blue-50 text-blue-700 border-blue-200",
                            eliminar: "bg-red-50 text-red-700 border-red-200",
                            cambiar_estado:
                              "bg-violet-50 text-violet-700 border-violet-200",
                            cancelar:
                              "bg-orange-50 text-orange-700 border-orange-200",
                            login: "bg-gray-50 text-gray-700 border-gray-200",
                            logout: "bg-gray-50 text-gray-700 border-gray-200",
                            establecer_password:
                              "bg-amber-50 text-amber-700 border-amber-200",
                          };

                          const moduloColor: Record<string, string> = {
                            empleados: "bg-indigo-50 text-indigo-700",
                            clientes: "bg-cyan-50 text-cyan-700",
                            productos: "bg-purple-50 text-purple-700",
                            pedidos: "bg-blue-50 text-blue-700",
                            autenticacion: "bg-gray-50 text-gray-700",
                          };

                          const fechaHora = new Date(registro.fechaHora);
                          const fechaFormateada = fechaHora.toLocaleDateString(
                            "es-PE",
                            {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            },
                          );
                          const horaFormateada = fechaHora.toLocaleTimeString(
                            "es-PE",
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                            },
                          );

                          return (
                            <tr
                              key={registro.id}
                              className={`border-b border-border last:border-0 hover:bg-accent/50 transition ${i % 2 === 0 ? "" : "bg-muted/20"}`}
                            >
                              <td className="px-4 py-3">
                                <div className="text-foreground">
                                  {fechaFormateada}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {horaFormateada}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="text-foreground">
                                  {registro.usuarioNombre}
                                </div>
                                <div className="text-xs text-muted-foreground font-mono">
                                  {registro.usuarioCodigo}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <span
                                  className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs border ${accionColor[registro.accion] || "bg-muted text-foreground border-border"}`}
                                >
                                  {registro.accion.replace("_", " ")}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs ${moduloColor[registro.modulo] || "bg-muted text-foreground"}`}
                                >
                                  {registro.modulo}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                {registro.entidadId ? (
                                  <div>
                                    <div className="text-foreground font-mono text-xs">
                                      {registro.entidadId}
                                    </div>
                                    {registro.entidadNombre && (
                                      <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                                        {registro.entidadNombre}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">
                                    —
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                {registro.detalles ? (
                                  <button
                                    className="text-xs text-primary hover:underline"
                                    onClick={() =>
                                      setDetalleAuditoria(registro.detalles)
                                    }
                                  >
                                    Ver detalles
                                  </button>
                                ) : (
                                  <span className="text-muted-foreground">
                                    —
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Modal de nuevo producto */}
      {modalProductoAbierto && (
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
                  precio: producto.preciosPorTalla[t.talla],
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
      {productoEditando && (
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

      {/* Modal de nuevo empleado */}
      {modalEmpleadoAbierto && (
        <NuevoEmpleadoModal
          onClose={() => setModalEmpleadoAbierto(false)}
          empleadosExistentes={empleados}
          onGuardar={async (nuevo, password) => {
            const resultado = await agregarEmpleado(
              {
                nombre: nuevo.nombre,
                email: nuevo.email,
                telefono: nuevo.telefono,
                rol: nuevo.rol,
                estado: nuevo.estado,
              },
              password,
            );
            if (resultado) {
              setModalEmpleadoAbierto(false);
            }
          }}
        />
      )}

      {/* Modal de edición de empleado */}
      {empleadoEditando && (
        <EditarEmpleadoModal
          empleado={empleadoEditando}
          onClose={() => setEmpleadoEditando(null)}
          onGuardar={async (actualizado) => {
            const exito = await actualizarEmpleado(actualizado.id, {
              nombre: actualizado.nombre,
              email: actualizado.email,
              telefono: actualizado.telefono,
              rol: actualizado.rol,
            });
            if (exito) {
              setEmpleadoEditando(null);
            }
          }}
        />
      )}

      {/* Modal de establecer contraseña */}
      {empleadoPassword && (
        <EstablecerPasswordModal
          empleado={empleadoPassword}
          onClose={() => setEmpleadoPassword(null)}
          onGuardar={async (password) => {
            const exito = await establecerPassword(
              empleadoPassword.email,
              password,
            );
            return exito;
          }}
        />
      )}

      {/* Modal de gestionar permisos */}
      {empleadoPermisos && (
        <GestionarPermisosModal
          empleado={empleadoPermisos}
          onClose={() => setEmpleadoPermisos(null)}
          onGuardar={async (permisos) => {
            const exito = await actualizarEmpleado(empleadoPermisos.id, {
              permisos,
            });
            if (exito) {
              setEmpleadoPermisos(null);
            }
            return exito;
          }}
        />
      )}

      {/* Modal de historial del cliente */}
      {clienteHistorial && (
        <HistorialClienteModal
          cliente={clienteHistorial}
          pedidos={pedidos}
          onClose={() => setClienteHistorial(null)}
        />
      )}

      {/* Panel lateral de detalles del pedido */}
      {pedidoSeleccionado && (
        <div
          className="fixed inset-0 bg-black/30 z-40 flex justify-end"
          onClick={() => setPedidoSeleccionado(null)}
        >
          <div
            className="bg-card w-full max-w-2xl h-full overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-card border-b border-border p-4 flex items-center justify-between z-10">
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  Detalles del Pedido
                </h3>
                <p className="text-sm text-muted-foreground">
                  {pedidoSeleccionado.id}
                </p>
              </div>
              <button
                onClick={() => setPedidoSeleccionado(null)}
                className="p-2 hover:bg-accent rounded-lg transition"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Información del Cliente */}
              <div className="bg-muted/30 border border-border rounded-lg p-4">
                <h4 className="text-sm font-semibold text-foreground mb-3">
                  Cliente
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Nombre:</span>
                    <span className="text-foreground font-medium">
                      {pedidoSeleccionado.cliente}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Email:</span>
                    <span className="text-foreground">
                      {pedidoSeleccionado.email || "—"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Información del Pedido */}
              <div className="bg-muted/30 border border-border rounded-lg p-4">
                <h4 className="text-sm font-semibold text-foreground mb-3">
                  Detalles
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Artículo:</span>
                    <span className="text-foreground font-medium">
                      {pedidoSeleccionado.articulo}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fecha:</span>
                    <span className="text-foreground">
                      {pedidoSeleccionado.fecha}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Fecha de Entrega:
                    </span>
                    <span className="text-foreground">
                      {pedidoSeleccionado.fechaEntrega
                        ? formatearFechaCorta(pedidoSeleccionado.fechaEntrega)
                        : "Sin asignar"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Estado:</span>
                    <span
                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs border ${estadoColor[pedidoSeleccionado.estado]}`}
                    >
                      {pedidoSeleccionado.estado}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Prioridad:</span>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${pedidoSeleccionado.urgente ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"}`}
                    >
                      {pedidoSeleccionado.urgente ? "Urgente" : "Normal"}
                    </span>
                  </div>
                  {pedidoSeleccionado.notas && (
                    <div>
                      <span className="text-muted-foreground block mb-1">
                        Notas:
                      </span>
                      <p className="text-foreground bg-background rounded p-2 text-xs">
                        {pedidoSeleccionado.notas}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Estado de Pago */}
              <div className="bg-muted/30 border border-border rounded-lg p-4">
                <h4 className="text-sm font-semibold text-foreground mb-3">
                  Estado de Pago
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Estado:</span>
                    {pedidoSeleccionado.estado === "Cancelado" ? (
                      <span className="text-xs text-muted-foreground">-</span>
                    ) : (
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${
                          pedidoSeleccionado.estadoPago === "Pagado"
                            ? "bg-green-100 text-green-700"
                            : pedidoSeleccionado.estadoPago === "Parcial"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-orange-100 text-orange-700"
                        }`}
                      >
                        {pedidoSeleccionado.estadoPago}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Botón para ver el detalle completo del pedido (PDF) */}
              <button
                onClick={() => setPedidoDetalle(pedidoSeleccionado)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-border text-foreground rounded-lg hover:bg-accent transition"
              >
                <FileText className="w-4 h-4" />
                Ver detalle del pedido
              </button>

              {/* Botón para editar el pedido */}
              <button
                onClick={() => setModalEditarPedidoAbierto(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
              >
                Editar Pedido
              </button>

              {/* Botón para ver historial del cliente */}
              {(() => {
                const cliente = clientes.find(
                  (c) => c.id === pedidoSeleccionado.clienteId,
                );
                return cliente ? (
                  <button
                    onClick={() => {
                      setPedidoSeleccionado(null);
                      setClienteHistorial(cliente);
                    }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition"
                  >
                    <User className="w-4 h-4" />
                    Ver Historial del Cliente
                  </button>
                ) : null;
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Modal para editar pedido */}
      {modalEditarPedidoAbierto && pedidoSeleccionado && (
        <EditarPedidoModal
          pedido={pedidoSeleccionado}
          onClose={() => setModalEditarPedidoAbierto(false)}
          esAdmin={true}
        />
      )}

      {/* Modal de detalle completo del pedido */}
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
      {detalleAuditoria && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setDetalleAuditoria(null)}
          />
          <div className="relative z-10 bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div>
                <h3 className="text-foreground">Detalles del registro</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Información completa de la acción registrada
                </p>
              </div>
              <button
                onClick={() => setDetalleAuditoria(null)}
                className="p-1.5 rounded-lg hover:bg-accent transition"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            <div className="px-6 py-4 space-y-3 max-h-[60vh] overflow-y-auto">
              {(() => {
                const etiquetas: Record<string, string> = {
                  estadoAnterior: "Estado anterior",
                  estadoNuevo: "Estado nuevo",
                  motivo: "Motivo",
                  mensaje: "Mensaje generado",
                  urgente: "Urgente",
                  notas: "Notas",
                  articulo: "Artículo",
                  modelo: "Modelo",
                  tela: "Tela",
                  disenio: "Diseño",
                  talla: "Talla",
                  color: "Color",
                  stock: "Stock",
                  precio: "Precio",
                  fecha_entrega: "Fecha de entrega",
                  itemsCount: "Productos en el pedido",
                  stockActualizado: "Stock actualizado",
                  cambios: "Cambios realizados",
                  articuloAnterior: "Artículo anterior",
                  urgenteAnterior: "Urgente (anterior)",
                  notasAnteriores: "Notas anteriores",
                  fechaEntregaAnterior: "Fecha de entrega anterior",
                  itemsEliminados: "Ítems eliminados",
                  itemsInsertados: "Ítems insertados",
                  stockRestaurado: "Stock restaurado",
                  email: "Correo electrónico",
                  nombre: "Nombre",
                  rol: "Rol",
                  estado: "Estado",
                  tallasCount: "Cantidad de tallas",
                  coloresCount: "Cantidad de colores",
                  TALLASCOUNT: "Cantidad de tallas",
                  COLORESCOUNT: "Cantidad de colores",
                };

                // Grupos semánticos para mejor organización visual
                const gruposEstado = [
                  "estadoAnterior",
                  "estadoNuevo",
                  "mensaje",
                  "motivo",
                ];
                const gruposConteo = [
                  "itemsCount",
                  "itemsEliminados",
                  "itemsInsertados",
                  "stockActualizado",
                  "stockRestaurado",
                ];

                const formatearValorSimple = (val: unknown): string => {
                  if (typeof val === "boolean") return val ? "Sí" : "No";
                  if (val === null || val === undefined) return "—";
                  return String(val);
                };

                // Renderiza un objeto plano como lista de pares clave:valor
                const renderObjeto = (
                  obj: Record<string, unknown>,
                  nivel = 0,
                ) => (
                  <div
                    className={`space-y-1.5 ${nivel > 0 ? "pl-3 border-l-2 border-border" : ""}`}
                  >
                    {Object.entries(obj).map(([k, v]) => {
                      const label = etiquetas[k] ?? k.replace(/_/g, " ");
                      const esObjeto =
                        v !== null &&
                        typeof v === "object" &&
                        !Array.isArray(v);
                      const esArray = Array.isArray(v);
                      return (
                        <div key={k} className="flex flex-col gap-0.5">
                          <span className="text-xs text-muted-foreground capitalize">
                            {label}
                          </span>
                          {esObjeto ? (
                            renderObjeto(
                              v as Record<string, unknown>,
                              nivel + 1,
                            )
                          ) : esArray ? (
                            <span className="text-sm text-foreground bg-muted rounded px-2 py-1">
                              {(v as unknown[]).length} elemento
                              {(v as unknown[]).length !== 1 ? "s" : ""}
                            </span>
                          ) : (
                            <span className="text-sm text-foreground bg-muted rounded px-2 py-1 break-all">
                              {formatearValorSimple(v)}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );

                // Separar entradas en grupo "estado/transición" y el resto
                const entradas = Object.entries(detalleAuditoria);
                const entradasEstado = entradas.filter(([k]) =>
                  gruposEstado.includes(k),
                );
                const entradasConteo = entradas.filter(([k]) =>
                  gruposConteo.includes(k),
                );
                const entradasResto = entradas.filter(
                  ([k]) =>
                    !gruposEstado.includes(k) && !gruposConteo.includes(k),
                );

                const renderEntrada = ([key, value]: [string, unknown]) => {
                  const label = etiquetas[key] ?? key.replace(/_/g, " ");
                  const esObjeto =
                    value !== null &&
                    typeof value === "object" &&
                    !Array.isArray(value);
                  const esEstado =
                    key === "estadoAnterior" || key === "estadoNuevo";

                  return (
                    <div key={key} className="flex flex-col gap-1">
                      <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                        {label}
                      </span>
                      {esObjeto ? (
                        <div className="bg-muted rounded-lg px-3 py-2">
                          {renderObjeto(value as Record<string, unknown>)}
                        </div>
                      ) : esEstado ? (
                        <span
                          className={`inline-flex items-center self-start text-xs px-2.5 py-1 rounded-full border font-medium ${
                            key === "estadoNuevo"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-muted text-muted-foreground border-border"
                          }`}
                        >
                          {String(value ?? "—")}
                        </span>
                      ) : (
                        <span className="text-sm text-foreground bg-muted rounded px-2 py-1 break-all">
                          {typeof value === "boolean"
                            ? value
                              ? "Sí"
                              : "No"
                            : String(value ?? "—")}
                        </span>
                      )}
                    </div>
                  );
                };

                return (
                  <div className="space-y-4">
                    {/* Bloque de transición de estado */}
                    {entradasEstado.length > 0 && (
                      <div className="bg-muted/40 rounded-xl p-4 space-y-3">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          Cambio de estado
                        </p>
                        <div className="flex items-center gap-3 flex-wrap">
                          {entradasEstado.find(
                            ([k]) => k === "estadoAnterior",
                          ) && (
                            <span className="text-xs px-2.5 py-1 rounded-full bg-muted border border-border text-foreground">
                              {String(
                                entradasEstado.find(
                                  ([k]) => k === "estadoAnterior",
                                )?.[1] ?? "—",
                              )}
                            </span>
                          )}
                          {entradasEstado.find(
                            ([k]) => k === "estadoAnterior",
                          ) &&
                            entradasEstado.find(
                              ([k]) => k === "estadoNuevo",
                            ) && (
                              <span className="text-muted-foreground text-xs">
                                →
                              </span>
                            )}
                          {entradasEstado.find(
                            ([k]) => k === "estadoNuevo",
                          ) && (
                            <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-medium">
                              {String(
                                entradasEstado.find(
                                  ([k]) => k === "estadoNuevo",
                                )?.[1] ?? "—",
                              )}
                            </span>
                          )}
                        </div>
                        {entradasEstado
                          .filter(
                            ([k]) =>
                              k !== "estadoAnterior" && k !== "estadoNuevo",
                          )
                          .map(renderEntrada)}
                      </div>
                    )}

                    {/* Contadores */}
                    {entradasConteo.length > 0 && (
                      <div className="grid grid-cols-2 gap-2">
                        {entradasConteo.map(([k, v]) => (
                          <div
                            key={k}
                            className="bg-muted/40 rounded-lg px-3 py-2"
                          >
                            <p className="text-xs text-muted-foreground">
                              {etiquetas[k] ?? k.replace(/_/g, " ")}
                            </p>
                            <p className="text-sm font-semibold text-foreground mt-0.5">
                              {typeof v === "boolean"
                                ? v
                                  ? "Sí"
                                  : "No"
                                : String(v ?? "—")}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Resto de campos */}
                    {entradasResto.map(renderEntrada)}
                  </div>
                );
              })()}
            </div>
            <div className="px-6 py-4 border-t border-border">
              <button
                onClick={() => setDetalleAuditoria(null)}
                className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Modal de edición de empleado
// (EditarEmpleadoModal movido a su propio archivo)
