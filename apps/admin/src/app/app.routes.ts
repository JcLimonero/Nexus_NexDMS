import { Routes } from "@angular/router";
import { authGuard } from "./core/auth/auth.guard";

export const routes: Routes = [
  {
    path: "acceso",
    loadComponent: () => import("./routes/acceso/acceso").then((m) => m.Acceso),
    title: "Acceso — Administración NexDMS",
  },
  {
    path: "tenants",
    canActivate: [authGuard],
    loadComponent: () =>
      import("./routes/tenants/tenants").then((m) => m.Tenants),
    title: "Clientes — Administración NexDMS",
  },
  {
    path: "precios",
    canActivate: [authGuard],
    loadComponent: () =>
      import("./routes/precios/precios").then((m) => m.Precios),
    title: "Planes y precios — Administración NexDMS",
  },
  {
    path: "roles",
    canActivate: [authGuard],
    loadComponent: () => import("./routes/roles/roles").then((m) => m.Roles),
    title: "Catálogo de roles — Administración NexDMS",
  },
  {
    path: "perfiles",
    canActivate: [authGuard],
    loadComponent: () =>
      import("./routes/perfiles/perfiles").then((m) => m.Perfiles),
    title: "Roles a medida — Administración NexDMS",
  },
  {
    path: "usuarios",
    canActivate: [authGuard],
    loadComponent: () =>
      import("./routes/usuarios/usuarios").then((m) => m.Usuarios),
    title: "Usuarios del portal — Administración NexDMS",
  },
  { path: "", pathMatch: "full", redirectTo: "tenants" },
  { path: "**", redirectTo: "tenants" },
];
