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
  { path: "", pathMatch: "full", redirectTo: "tenants" },
  { path: "**", redirectTo: "tenants" },
];
