import { useState } from "react";
import {
  LogOut,
  Package,
  AlertTriangle,
  CheckCircle2,
  Search,
  ChevronRight,
  Plus,
  AlertCircle,
} from "lucide-react";
import { useNavigate } from "react-router";
import {
  useProductos,
  type ProductoCatalogo,
} from "../contexts/ProductosContext";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { AgregarStockModal } from "./AgregarStockModal";

export function ProduccionDashboard() {
  const navigate = useNavigate();
  const user = useCurrentUser();
  const { productos, agregarStockPorColor } = useProductos();
  const [busqueda, setBusqueda] = useState("");
  const [productoPendienteStock, setProductoPendienteStock] =
    useState<ProductoCatalogo | null>(null);
  const [filtro, setFiltro] = useState<"todos" | "incompletos" | "completos">(
    "incompletos",
  );

  // Función para verificar si un producto tiene stock faltante
  const tieneStockFaltante = (producto: ProductoCatalogo): boolean => {
    return producto.tallas.some((talla) =>
      talla.colores.some((color) => color.stock === 0),
    );
  };

  // Función para contar colores sin stock
  const contarColoresSinStock = (producto: ProductoCatalogo): number => {
    return producto.tallas.reduce(
      (total, talla) =>
        total + talla.colores.filter((color) => color.stock === 0).length,
      0,
    );
  };

  // Función para obtener stock total
  const obtenerStockTotal = (producto: ProductoCatalogo): number => {
    return producto.tallas.reduce(
      (total, talla) =>
        total + talla.colores.reduce((sum, color) => sum + color.stock, 0),
      0,
    );
  };

  // Filtrar productos
  const productosFiltrados = productos.filter((p) => {
    const cumpleBusqueda =
      !busqueda ||
      p.modelo.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.tela.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.disenio.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.id.toLowerCase().includes(busqueda.toLowerCase());

    const tieneFaltante = tieneStockFaltante(p);

    if (filtro === "incompletos") return cumpleBusqueda && tieneFaltante;
    if (filtro === "completos") return cumpleBusqueda && !tieneFaltante;
    return cumpleBusqueda;
  });

  const productosIncompletos = productos.filter(tieneStockFaltante);
  const productosCompletos = productos.filter((p) => !tieneStockFaltante(p));

  const handleLogout = async () => {
    navigate("/");
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
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-foreground hover:bg-accent transition text-sm"
          >
            <LogOut className="w-4 h-4" />
            Salir
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total productos</p>
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
                <p className="text-xs text-muted-foreground">Falta completar</p>
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
        <div className="bg-card border border-border rounded-xl p-4 mb-6">
          <div className="space-y-4">
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
                        {faltante && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700 border border-red-300">
                            <AlertTriangle className="w-3 h-3" />
                            Falta stock
                          </span>
                        )}
                        {!faltante && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-emerald-100 text-emerald-700 border border-emerald-300">
                            <CheckCircle2 className="w-3 h-3" />
                            Completo
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {producto.tela} · {producto.disenio}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Código: <span className="font-mono">{producto.id}</span>
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
                      {faltante && (
                        <button
                          onClick={() => setProductoPendienteStock(producto)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition text-sm shrink-0"
                        >
                          <Plus className="w-4 h-4" />
                          Stock
                        </button>
                      )}
                      {!faltante && (
                        <button
                          onClick={() => setProductoPendienteStock(producto)}
                          className="flex items-center gap-1 px-3 py-1.5 border border-emerald-300 text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition text-sm shrink-0"
                        >
                          <ChevronRight className="w-4 h-4" />
                          Ver
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Detalle rápido de tallas faltantes */}
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

      {/* Modal de agregar stock */}
      {productoPendienteStock && (
        <AgregarStockModal
          producto={productoPendienteStock}
          onClose={() => setProductoPendienteStock(null)}
          onGuardar={async (cambios) => {
            const exito = await agregarStockPorColor(cambios);
            if (exito) {
              setProductoPendienteStock(null);
            }
          }}
        />
      )}
    </div>
  );
}
