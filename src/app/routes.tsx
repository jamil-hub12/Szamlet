import { createBrowserRouter } from "react-router";
import { LoginPage } from "./components/auth/LoginPage";
import { EmpleadoDashboard } from "./components/dashboards/EmpleadoDashboard";
import { AdminDashboard } from "./components/dashboards/AdminDashboard";
import { ProduccionDashboard } from "./components/dashboards/ProduccionDashboard";
import { ForgotPasswordPage } from "./components/auth/ForgotPasswordPage";
import { ResetPasswordPage } from "./components/auth/ResetPasswordPage";
import { ProtectedRoute } from "./components/ProtectedRoute";

export const router = createBrowserRouter([
  { path: "/", Component: LoginPage },
  { path: "/forgot-password", Component: ForgotPasswordPage },
  { path: "/reset-password", Component: ResetPasswordPage },
  {
    path: "/empleado",
    element: (
      <ProtectedRoute rolesPermitidos={["Atención al cliente"]}>
        <EmpleadoDashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: "/admin",
    element: (
      <ProtectedRoute rolesPermitidos={["Administrador"]}>
        <AdminDashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: "/produccion",
    element: (
      <ProtectedRoute rolesPermitidos={["Producción"]}>
        <ProduccionDashboard />
      </ProtectedRoute>
    ),
  },
]);
