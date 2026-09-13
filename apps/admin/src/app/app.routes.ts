import { Routes } from "@angular/router";
import { authGuard } from "./core/auth/auth.guard";

export const routes: Routes = [
  {
    path: "acceso",
    loadComponent: () => import("./routes/acceso/acceso").then((m) => m.Acceso),
    title: "Acceso — Administración NexDMS",
  },
  {
    path: "auth/forgot-password",
    loadComponent: () =>
      import("./routes/recuperar/recuperar").then((m) => m.Recuperar),
    title: "Recuperar contraseña — NexDMS Admin",
  },
  {
    path: "auth/reset-password",
    loadComponent: () =>
      import("./routes/restablecer/restablecer").then((m) => m.Restablecer),
    title: "Nueva contraseña — NexDMS Admin",
  },
  {
    path: "dashboard",
    canActivate: [authGuard],
    loadComponent: () =>
      import("./routes/dashboard/dashboard").then((m) => m.Dashboard),
    title: "Panel de control — Administración NexDMS",
  },
  {
    path: "tenants",
    canActivate: [authGuard],
    loadComponent: () =>
      import("./routes/tenants/tenants").then((m) => m.Tenants),
    title: "Empresas — Administración NexDMS",
  },
  {
    path: "tenants/:id",
    canActivate: [authGuard],
    loadComponent: () =>
      import("./routes/tenants/ficha-empresa/ficha-empresa").then(
        (m) => m.FichaEmpresa,
      ),
    title: "Ficha de empresa — Administración NexDMS",
  },
  {
    path: "precios",
    canActivate: [authGuard],
    loadComponent: () =>
      import("./routes/precios/precios").then((m) => m.Precios),
    title: "Planes y precios — Administración NexDMS",
  },
  {
    path: "catalogos-maestros",
    canActivate: [authGuard],
    loadComponent: () =>
      import("./routes/catalogos-maestros/catalogos-maestros").then(
        (m) => m.CatalogosMaestros,
      ),
    title: "Catálogos maestros — Administración NexDMS",
  },
  {
    path: "roles",
    canActivate: [authGuard],
    loadComponent: () => import("./routes/roles/roles").then((m) => m.Roles),
    title: "Catálogo de roles — Administración NexDMS",
  },
  {
    path: "usuarios",
    canActivate: [authGuard],
    loadComponent: () =>
      import("./routes/usuarios/usuarios").then((m) => m.Usuarios),
    title: "Usuarios del portal — Administración NexDMS",
  },
  { path: "", pathMatch: "full", redirectTo: "dashboard" },
  { path: "**", redirectTo: "dashboard" },
];
