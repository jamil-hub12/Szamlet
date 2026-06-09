import { createBrowserRouter } from "react-router";
import { LoginPage } from "./components/LoginPage";
import { EmpleadoDashboard } from "./components/EmpleadoDashboard";
import { AdminDashboard } from "./components/AdminDashboard";
import { ConfeccionadorDashboard } from "./components/ConfeccionadorDashboard";

export const router = createBrowserRouter([
  { path: "/", Component: LoginPage },
  { path: "/empleado", Component: EmpleadoDashboard },
  { path: "/admin", Component: AdminDashboard },
  { path: "/confeccionador", Component: ConfeccionadorDashboard },
]);
