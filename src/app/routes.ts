import { createBrowserRouter } from "react-router";
import { LoginPage } from "./components/auth/LoginPage";
import { EmpleadoDashboard } from "./components/dashboards/EmpleadoDashboard";
import { AdminDashboard } from "./components/dashboards/AdminDashboard";
import { ProduccionDashboard } from "./components/dashboards/ProduccionDashboard";
import { ForgotPasswordPage } from "./components/auth/ForgotPasswordPage";
import { ResetPasswordPage } from "./components/auth/ResetPasswordPage";

export const router = createBrowserRouter([
  { path: "/", Component: LoginPage },
  { path: "/forgot-password", Component: ForgotPasswordPage },
  { path: "/reset-password", Component: ResetPasswordPage },
  { path: "/empleado", Component: EmpleadoDashboard },
  { path: "/admin", Component: AdminDashboard },
  { path: "/produccion", Component: ProduccionDashboard },
]);
