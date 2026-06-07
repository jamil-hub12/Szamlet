import { RouterProvider } from "react-router";
import { router } from "./routes";
import { PedidosProvider } from "./contexts/PedidosContext";
import { EmpleadosProvider } from "./contexts/EmpleadosContext";
import { ClientesProvider } from "./contexts/ClientesContext";
import { ProductosProvider } from "./contexts/ProductosContext";
import { AuditoriaProvider } from "./contexts/AuditoriaContext";
import { NotificacionesProvider } from "./contexts/NotificacionesContext";
import { PagosProvider } from "./contexts/PagosContext";
import { Toaster } from "sonner";

export default function App() {
  return (
    <NotificacionesProvider>
      <AuditoriaProvider>
        <EmpleadosProvider>
          <ClientesProvider>
            <ProductosProvider>
              <PagosProvider>
                <PedidosProvider>
                  <RouterProvider router={router} />
                  <Toaster />
                </PedidosProvider>
              </PagosProvider>
            </ProductosProvider>
          </ClientesProvider>
        </EmpleadosProvider>
      </AuditoriaProvider>
    </NotificacionesProvider>
  );
}
