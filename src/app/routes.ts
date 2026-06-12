import { createBrowserRouter } from "react-router";
import { LoginPage } from "./components/LoginPage";
import { EmpleadoDashboard } from "./components/EmpleadoDashboard";
import { AdminDashboard } from "./components/AdminDashboard";
import { ProduccionDashboard } from "./components/ProduccionDashboard";
import { ForgotPasswordPage } from "./path/to/ForgotPasswordPage";
import { ResetPasswordPage } from "./path/to/ResetPasswordPage";

export const router = createBrowserRouter([
  { path: "/", Component: LoginPage },
  { path: "/forgot-password", Component: ForgotPasswordPage },
  { path: "/reset-password", Component: ResetPasswordPage },
  { path: "/empleado", Component: EmpleadoDashboard },
  { path: "/admin", Component: AdminDashboard },
  { path: "/produccion", Component: ProduccionDashboard },
]);
