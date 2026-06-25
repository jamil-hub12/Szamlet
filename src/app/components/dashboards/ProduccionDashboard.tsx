import { useState, useEffect, useCallback } from "react";
import {
  LogOut,
  Package,
  AlertTriangle,
  CheckCircle2,
  Search,
  ChevronRight,
  Plus,
  AlertCircle,
  ClipboardList,
  Clock,
  CheckCheck,
  ChevronDown,
  ChevronUp,
  Loader2,
  X,
} from "lucide-react";
import { useNavigate } from "react-router";
import {
  useProductos,
  type ProductoCatalogo,
} from "../../contexts/ProductosContext";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { AgregarStockModal } from "../productos/AgregarStockModal";
import { supabase } from "../../../lib/supabase";
import { obtenerFechaHoraPeruISO } from "../../utils/fechas";
import { diasHastaVencimiento } from "../../utils/validaciones";
import {
  tieneStockFaltante as tieneStockFaltanteUtil,
  contarColoresSinStock as contarColoresSinStockUtil,
  obtenerStockTotal as obtenerStockTotalUtil,
  filtrarProductosInventario as filtrarProductosInventarioUtil,
} from "../../utils/inventarioProduccion";

// ─── Tipos ──────────────────────────────────────────────────────────────────

type EstadoFabricacion = "pendiente" | "confirmado";

type ItemFabricacion = {
  id: string;
  pedidoCodigo: string;
  productoCodigo: string;
  modelo: string;
  tela: string;
  disenio: string;
  talla: string;
  color: string;
  cantidad: number;
  esEspecial: boolean;
  estadoFabricacion: EstadoFabricacion;
  fechaConfirmacion: string | null;
  confirmadoPor: string | null;
};

type SolicitudPedido = {
  codigo: string;
  cliente: string;
  articulo: string;
  fechaEntrega: string | null;
  urgente: boolean;
  estado: string;
  items: ItemFabricacion[];
};

// ─── Hook de solicitudes de fabricación ─────────────────────────────────────

function useSolicitudesFabricacion() {
  const [solicitudes, setSolicitudes] = useState<SolicitudPedido[]>([]);
  const [cargando, setCargando] = useState(true);

  const fetchSolicitudes = useCallback(async () => {
    try {
      setCargando(true);

      // Traer pedidos activos (no entregados, no cancelados)
      const { data: pedidosData, error: pedidosError } = await supabase
        .from("pedidos")
        .select(
          `
          codigo, articulo, urgente, fecha_entrega, estado,
          clientes:cliente_id ( nombre )
        `,
        )
        .not("estado", "in", '("Entregado","Cancelado")')
        .order("urgente", { ascending: false })
        .order("fecha_entrega", { ascending: true, nullsFirst: false });

      if (pedidosError) throw pedidosError;

      if (!pedidosData || pedidosData.length === 0) {
        setSolicitudes([]);
        return;
      }

      const codigos = pedidosData.map((p: any) => p.codigo);

      const { data: itemsData, error: itemsError } = await supabase
        .from("pedido_items")
        .select("*")
        .in("pedido_codigo", codigos);

      if (itemsError) throw itemsError;

      const resultado: SolicitudPedido[] = pedidosData.map((p: any) => {
        const items = (itemsData || [])
          .filter((i: any) => i.pedido_codigo === p.codigo)
          .map((i: any) => ({
            id: i.id,
            pedidoCodigo: i.pedido_codigo,
            productoCodigo: i.producto_codigo,
            modelo: i.modelo,
            tela: i.tela,
            disenio: i.disenio,
            talla: i.talla,
            color: i.color,
            cantidad: i.cantidad,
            esEspecial: i.es_especial ?? false,
            estadoFabricacion: (i.estado_fabricacion ??
              "pendiente") as EstadoFabricacion,
            fechaConfirmacion: i.fecha_confirmacion ?? null,
            confirmadoPor: i.confirmado_por ?? null,
          }));

        return {
          codigo: p.codigo,
          cliente: (p as any).clientes?.nombre ?? "Cliente desconocido",
          articulo: p.articulo,
          fechaEntrega: p.fecha_entrega ?? null,
          urgente: p.urgente,
          estado: p.estado,
          items,
        };
      });

      // Solo mostrar pedidos que tienen al menos un ítem
      setSolicitudes(resultado.filter((s) => s.items.length > 0));
    } catch (err) {
      console.error("Error al cargar solicitudes de fabricación:", err);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    fetchSolicitudes();

    const subscription = supabase
      .channel("fabricacion-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pedido_items" },
        () => {
          fetchSolicitudes();
        },
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchSolicitudes]);

  const confirmarItem = async (
    itemId: string,
    pedidoCodigo: string,
    usuarioCodigo: string,
    usuarioNombre: string,
    productoCodigo: string,
    talla: string,
    color: string,
    cantidad: number,
    esEspecial: boolean,
  ): Promise<boolean> => {
    try {
      const ahora = obtenerFechaHoraPeruISO();

      // 1. Marcar ítem como confirmado
      const { error: updateError } = await supabase
        .from("pedido_items")
        .update({
          estado_fabricacion: "confirmado",
          fecha_confirmacion: ahora,
          confirmado_por: usuarioNombre,
        })
        .eq("id", itemId);

      if (updateError) throw updateError;

      // 2. Si es ítem normal (no especial), sumar stock en el catálogo
      if (!esEspecial && productoCodigo !== "LIBRE") {
        await supabase.rpc("actualizar_stock_pedido", {
          p_producto_codigo: productoCodigo,
          p_talla: talla,
          p_color: color,
          p_cantidad: cantidad,
          p_tipo: "sumar",
          p_pedido_codigo: pedidoCodigo,
          p_usuario_codigo: usuarioCodigo,
          p_usuario_nombre: usuarioNombre,
        });
      }

      // 3. Verificar si todos los ítems del pedido están confirmados
      const { data: itemsPedido } = await supabase
        .from("pedido_items")
        .select("estado_fabricacion")
        .eq("pedido_codigo", pedidoCodigo);

      const todosConfirmados = itemsPedido?.every(
        (i: any) => i.estado_fabricacion === "confirmado",
      );

      // 4. Si todos confirmados → avanzar pedido a "Listo para entrega"
      if (todosConfirmados) {
        const { data: pedidoActual } = await supabase
          .from("pedidos")
          .select("estado")
          .eq("codigo", pedidoCodigo)
          .single();

        if (
          pedidoActual &&
          pedidoActual.estado !== "Listo para entrega" &&
          pedidoActual.estado !== "Entregado" &&
          pedidoActual.estado !== "Cancelado"
        ) {
          await supabase
            .from("pedidos")
            .update({ estado: "Listo para entrega" })
            .eq("codigo", pedidoCodigo);
        }
      }

      await fetchSolicitudes();
      return true;
    } catch (err) {
      console.error("Error al confirmar ítem:", err);
      return false;
    }
  };

  return { solicitudes, cargando, refetch: fetchSolicitudes, confirmarItem };
}

// ─── Componente principal ────────────────────────────────────────────────────

export function ProduccionDashboard() {
  const navigate = useNavigate();
  const user = useCurrentUser();
  const { productos, agregarStockPorColor } = useProductos();
  const [seccion, setSeccion] = useState<"solicitudes" | "catalogo">(
    "solicitudes",
  );

  // --- Catálogo ---
  const [busqueda, setBusqueda] = useState("");
  const [productoPendienteStock, setProductoPendienteStock] =
    useState<ProductoCatalogo | null>(null);
  const [filtro, setFiltro] = useState<"todos" | "incompletos" | "completos">(
    "incompletos",
  );

  // --- Solicitudes ---
  const { solicitudes, cargando, confirmarItem } = useSolicitudesFabricacion();
  const [busquedaSolicitud, setBusquedaSolicitud] = useState("");
  const [filtroSolicitud, setFiltroSolicitud] = useState<
    "pendientes" | "todos"
  >("pendientes");
  const [pedidosExpandidos, setPedidosExpandidos] = useState<Set<string>>(
    new Set(),
  );
  const [confirmando, setConfirmando] = useState<string | null>(null); // itemId en proceso

  // --- Catálogo helpers ---
  const tieneStockFaltante = (p: ProductoCatalogo) => tieneStockFaltanteUtil(p);

  const contarColoresSinStock = (p: ProductoCatalogo) =>
    contarColoresSinStockUtil(p);

  const obtenerStockTotal = (p: ProductoCatalogo) => obtenerStockTotalUtil(p);

  const productosFiltrados = filtrarProductosInventarioUtil(
    productos,
    filtro,
    busqueda,
  );

  const productosIncompletos = productos.filter(tieneStockFaltante);
  const productosCompletos = productos.filter((p) => !tieneStockFaltante(p));

  // --- Solicitudes helpers ---
  const solicitudesFiltradas = solicitudes.filter((s) => {
    const match =
      !busquedaSolicitud ||
      s.codigo.toLowerCase().includes(busquedaSolicitud.toLowerCase()) ||
      s.cliente.toLowerCase().includes(busquedaSolicitud.toLowerCase()) ||
      s.articulo.toLowerCase().includes(busquedaSolicitud.toLowerCase());
    if (filtroSolicitud === "pendientes")
      return match && s.items.some((i) => i.estadoFabricacion === "pendiente");
    return match;
  });

  const totalItemsPendientes = solicitudes.reduce(
    (acc, s) =>
      acc + s.items.filter((i) => i.estadoFabricacion === "pendiente").length,
    0,
  );
  const totalPedidosActivos = solicitudes.length;

  const togglePedido = (codigo: string) => {
    setPedidosExpandidos((prev) => {
      const next = new Set(prev);
      next.has(codigo) ? next.delete(codigo) : next.add(codigo);
      return next;
    });
  };

  const handleConfirmarItem = async (item: ItemFabricacion) => {
    if (!user) return;
    setConfirmando(item.id);
    await confirmarItem(
      item.id,
      item.pedidoCodigo,
      user.codigo,
      user.nombre,
      item.productoCodigo,
      item.talla,
      item.color,
      item.cantidad,
      item.esEspecial,
    );
    setConfirmando(null);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-violet-100 text-violet-700 flex items-center justify-center">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">
                Producción
              </h1>
              <p className="text-xs text-muted-foreground">
                {user?.nombre || "Usuario"}
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-foreground hover:bg-accent transition text-sm"
          >
            <LogOut className="w-4 h-4" />
            Salir
          </button>
        </div>

        {/* Pestañas */}
        <div className="max-w-7xl mx-auto px-4 flex gap-1 border-t border-border">
          <button
            onClick={() => setSeccion("solicitudes")}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition ${
              seccion === "solicitudes"
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            Solicitudes de fabricación
            {totalItemsPendientes > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-xs bg-amber-100 text-amber-700 font-semibold">
                {totalItemsPendientes}
              </span>
            )}
          </button>
          <button
            onClick={() => setSeccion("catalogo")}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition ${
              seccion === "catalogo"
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Package className="w-4 h-4" />
            Catálogo / Stock
          </button>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">
        {/* ── SECCIÓN SOLICITUDES ── */}
        {seccion === "solicitudes" && (
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="bg-card border border-border rounded-xl p-4">
                <p className="text-xs text-muted-foreground">Pedidos activos</p>
                <p className="text-2xl font-semibold text-foreground mt-1">
                  {totalPedidosActivos}
                </p>
              </div>
              <div className="bg-card border border-border rounded-xl p-4">
                <p className="text-xs text-muted-foreground">
                  Ítems pendientes
                </p>
                <p className="text-2xl font-semibold text-amber-600 mt-1">
                  {totalItemsPendientes}
                </p>
              </div>
              <div className="bg-card border border-border rounded-xl p-4">
                <p className="text-xs text-muted-foreground">
                  Ítems confirmados
                </p>
                <p className="text-2xl font-semibold text-emerald-600 mt-1">
                  {solicitudes.reduce(
                    (acc, s) =>
                      acc +
                      s.items.filter(
                        (i) => i.estadoFabricacion === "confirmado",
                      ).length,
                    0,
                  )}
                </p>
              </div>
            </div>

            {/* Filtros */}
            <div className="bg-card border border-border rounded-xl p-4 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Buscar por código, cliente o artículo..."
                  value={busquedaSolicitud}
                  onChange={(e) => setBusquedaSolicitud(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-input-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20 text-sm"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setFiltroSolicitud("pendientes")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    filtroSolicitud === "pendientes"
                      ? "bg-amber-100 text-amber-900 border border-amber-300"
                      : "border border-border text-foreground hover:bg-accent"
                  }`}
                >
                  Con pendientes
                </button>
                <button
                  onClick={() => setFiltroSolicitud("todos")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    filtroSolicitud === "todos"
                      ? "bg-primary text-primary-foreground"
                      : "border border-border text-foreground hover:bg-accent"
                  }`}
                >
                  Todos
                </button>
              </div>
            </div>

            {/* Lista de pedidos */}
            {cargando ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : solicitudesFiltradas.length === 0 ? (
              <div className="bg-card border border-border rounded-xl p-12 text-center">
                <CheckCheck className="w-12 h-12 text-emerald-500 mx-auto mb-4 opacity-60" />
                <p className="text-foreground font-medium mb-1">
                  {solicitudes.length === 0
                    ? "No hay pedidos activos"
                    : "¡Todo al día! Sin ítems pendientes"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {solicitudes.length === 0
                    ? "Los pedidos aparecerán aquí cuando se registren"
                    : "Todos los ítems han sido confirmados"}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {solicitudesFiltradas.map((solicitud) => {
                  const expandido = pedidosExpandidos.has(solicitud.codigo);
                  const itemsPendientes = solicitud.items.filter(
                    (i) => i.estadoFabricacion === "pendiente",
                  );
                  const itemsConfirmados = solicitud.items.filter(
                    (i) => i.estadoFabricacion === "confirmado",
                  );
                  const todoConfirmado = itemsPendientes.length === 0;
                  const dias = diasHastaVencimiento(
                    solicitud.fechaEntrega ?? undefined,
                    solicitud.estado,
                  );

                  return (
                    <div
                      key={solicitud.codigo}
                      className={`border rounded-xl overflow-hidden transition ${
                        todoConfirmado
                          ? "border-emerald-200 bg-emerald-50/40"
                          : solicitud.urgente
                            ? "border-red-200 bg-red-50/30"
                            : "border-border bg-card"
                      }`}
                    >
                      {/* Cabecera del pedido */}
                      <button
                        onClick={() => togglePedido(solicitud.codigo)}
                        className="w-full flex items-center justify-between px-4 py-3 hover:bg-black/5 transition text-left"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <span className="font-mono text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded border border-border shrink-0">
                            {solicitud.codigo}
                          </span>
                          {solicitud.urgente && (
                            <span className="text-xs bg-red-100 text-red-700 border border-red-300 px-1.5 py-0.5 rounded shrink-0">
                              Urgente
                            </span>
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                              {solicitud.cliente}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {solicitud.articulo}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0 ml-2">
                          {/* Fecha de entrega */}
                          {solicitud.fechaEntrega && (
                            <div
                              className={`text-right text-xs ${
                                dias !== null && dias < 0
                                  ? "text-red-600"
                                  : dias !== null && dias <= 3
                                    ? "text-amber-600"
                                    : "text-muted-foreground"
                              }`}
                            >
                              <p>
                                {new Date(
                                  solicitud.fechaEntrega + "T00:00:00",
                                ).toLocaleDateString("es-PE", {
                                  day: "2-digit",
                                  month: "short",
                                })}
                              </p>
                              {dias !== null && (
                                <p className="font-medium">
                                  {dias < 0
                                    ? `${Math.abs(dias)}d vencido`
                                    : dias === 0
                                      ? "Hoy"
                                      : `${dias}d`}
                                </p>
                              )}
                            </div>
                          )}

                          {/* Progreso */}
                          <div className="text-right text-xs">
                            {todoConfirmado ? (
                              <span className="flex items-center gap-1 text-emerald-700 font-medium">
                                <CheckCheck className="w-3.5 h-3.5" />
                                Listo
                              </span>
                            ) : (
                              <span className="text-amber-700 font-medium">
                                {itemsConfirmados.length}/
                                {solicitud.items.length} ítems
                              </span>
                            )}
                          </div>

                          {expandido ? (
                            <ChevronUp className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                      </button>

                      {/* Ítems del pedido (expandible) */}
                      {expandido && (
                        <div className="border-t border-border">
                          {solicitud.items.map((item) => {
                            const esPendiente =
                              item.estadoFabricacion === "pendiente";
                            const enProceso = confirmando === item.id;

                            return (
                              <div
                                key={item.id}
                                className={`flex items-center justify-between px-4 py-3 border-b border-border last:border-0 ${
                                  esPendiente ? "bg-white" : "bg-emerald-50/60"
                                }`}
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <p className="text-sm font-medium text-foreground">
                                      {item.modelo}
                                    </p>
                                    {item.esEspecial && (
                                      <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                                        Especial
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex gap-1 mt-1 flex-wrap">
                                    <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                                      {item.tela}
                                    </span>
                                    <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                                      Talla {item.talla}
                                    </span>
                                    <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                                      {item.color}
                                    </span>
                                    <span className="text-xs font-medium text-foreground bg-muted px-1.5 py-0.5 rounded">
                                      ×{item.cantidad}
                                    </span>
                                  </div>
                                  {!esPendiente && item.confirmadoPor && (
                                    <p className="text-xs text-emerald-600 mt-1">
                                      ✓ Confirmado por {item.confirmadoPor}
                                    </p>
                                  )}
                                </div>

                                <div className="ml-3 shrink-0">
                                  {esPendiente ? (
                                    <button
                                      onClick={() => handleConfirmarItem(item)}
                                      disabled={enProceso}
                                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition disabled:opacity-60"
                                    >
                                      {enProceso ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                      ) : (
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                      )}
                                      Confirmar
                                    </button>
                                  ) : (
                                    <span className="flex items-center gap-1 text-xs text-emerald-700 font-medium px-2 py-1">
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                      Fabricado
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── SECCIÓN CATÁLOGO / STOCK ── */}
        {seccion === "catalogo" && (
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Total productos
                    </p>
                    <p className="text-2xl font-semibold text-foreground mt-1">
                      {productos.length}
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Package className="w-5 h-5" />
                  </div>
                </div>
              </div>
              <div className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Falta completar
                    </p>
                    <p className="text-2xl font-semibold text-amber-600 mt-1">
                      {productosIncompletos.length}
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                </div>
              </div>
              <div className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Completados</p>
                    <p className="text-2xl font-semibold text-emerald-600 mt-1">
                      {productosCompletos.length}
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                </div>
              </div>
            </div>

            {/* Filtros y búsqueda */}
            <div className="bg-card border border-border rounded-xl p-4 space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Buscar por modelo, tela, diseño o código…"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-input-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20 text-sm"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setFiltro("incompletos")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    filtro === "incompletos"
                      ? "bg-amber-100 text-amber-900 border border-amber-300"
                      : "border border-border text-foreground hover:bg-accent"
                  }`}
                >
                  Falta completar
                </button>
                <button
                  onClick={() => setFiltro("completos")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    filtro === "completos"
                      ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                      : "border border-border text-foreground hover:bg-accent"
                  }`}
                >
                  Completados
                </button>
                <button
                  onClick={() => setFiltro("todos")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    filtro === "todos"
                      ? "bg-primary text-primary-foreground"
                      : "border border-border text-foreground hover:bg-accent"
                  }`}
                >
                  Todos
                </button>
              </div>
            </div>

            {/* Lista de productos */}
            {productosFiltrados.length === 0 ? (
              <div className="bg-card border border-border rounded-xl p-12 text-center">
                <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-foreground font-medium mb-2">
                  {productos.length === 0
                    ? "No hay productos en el catálogo"
                    : filtro === "incompletos"
                      ? "¡Excelente! Todos los productos están completos"
                      : "No se encontraron productos"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {productos.length === 0
                    ? "Espera a que el administrador cree los primeros productos"
                    : filtro === "incompletos"
                      ? "No hay productos esperando stock en este momento"
                      : "Intenta con otra búsqueda"}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {productosFiltrados.map((producto) => {
                  const faltante = tieneStockFaltante(producto);
                  const coloresSinStock = contarColoresSinStock(producto);
                  const stockTotal = obtenerStockTotal(producto);

                  return (
                    <div
                      key={producto.id}
                      className={`border rounded-xl p-4 transition ${
                        faltante
                          ? "bg-amber-50 border-amber-200"
                          : "bg-emerald-50 border-emerald-200"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-sm font-semibold text-foreground">
                              {producto.modelo}
                            </h3>
                            {faltante ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700 border border-red-300">
                                <AlertTriangle className="w-3 h-3" /> Falta
                                stock
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-emerald-100 text-emerald-700 border border-emerald-300">
                                <CheckCircle2 className="w-3 h-3" /> Completo
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {producto.tela} · {producto.disenio}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Código:{" "}
                            <span className="font-mono">{producto.id}</span>
                          </p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right">
                            <p className="text-sm font-semibold text-foreground">
                              {stockTotal} ud.
                            </p>
                            {faltante && (
                              <p className="text-xs text-red-600 mt-0.5">
                                {coloresSinStock} sin stock
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => setProductoPendienteStock(producto)}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition text-sm shrink-0 ${
                              faltante
                                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                                : "border border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
                            }`}
                          >
                            {faltante ? (
                              <Plus className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                            {faltante ? "Stock" : "Ver"}
                          </button>
                        </div>
                      </div>

                      {faltante && (
                        <div className="mt-3 pt-3 border-t border-amber-200 space-y-2">
                          <p className="text-xs font-medium text-amber-900">
                            Colores sin stock:
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {producto.tallas.map((talla) => {
                              const coloresSin = talla.colores.filter(
                                (c) => c.stock === 0,
                              );
                              if (coloresSin.length === 0) return null;
                              return (
                                <span
                                  key={talla.id}
                                  className="inline-flex items-center gap-1 text-xs bg-white border border-amber-200 rounded px-2 py-1 text-amber-800"
                                >
                                  <span className="font-medium">
                                    Talla {talla.talla}:
                                  </span>
                                  {coloresSin.map((c) => c.color).join(", ")}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal de agregar stock */}
      {productoPendienteStock && (
        <AgregarStockModal
          producto={productoPendienteStock}
          onClose={() => setProductoPendienteStock(null)}
          onGuardar={async (cambios) => {
            const exito = await agregarStockPorColor(cambios);
            if (exito) setProductoPendienteStock(null);
          }}
        />
      )}
    </div>
  );
}
