import { Routes } from "@angular/router";

import { AdminGuard } from "./shared/guard/admin.guard";
import { content } from "./shared/routes/content-routes";
import { fullRoutes } from "./shared/routes/full.routes";

export const routes: Routes = [
  {
    path: "",
    redirectTo: "/dashboard/default",
    pathMatch: "full",
  },
  // Pantallas para colgar en el taller. Fuera del layout del DMS: no llevan
  // menú ni nada que pulsar, y `?branch=` deja fija la sucursal para que el
  // monitor arranque solo al encenderlo. Piden sesión como el resto —lo que
  // muestran son datos de clientes.
  {
    path: "monitor/taller",
    loadComponent: () =>
      import("./pages/monitor/monitor-taller").then((m) => m.MonitorTaller),
    canActivate: [AdminGuard],
    data: { title: "Monitor del taller" },
  },
  {
    path: "monitor/citas",
    loadComponent: () =>
      import("./pages/monitor/monitor-citas").then((m) => m.MonitorCitas),
    canActivate: [AdminGuard],
    data: { title: "Monitor de citas" },
  },
  {
    path: "auth/login",
    loadComponent: () => import("./auth/login/login").then((m) => m.Login),
  },
  // ── Páginas públicas por token (sin login) ──
  {
    path: "t/:token",
    loadComponent: () =>
      import("./pages/public/tracking-publico").then((m) => m.TrackingPublico),
    data: { title: "Seguimiento de orden" },
  },
  {
    path: "c/:token",
    loadComponent: () =>
      import("./pages/public/cotizacion-publica").then((m) => m.CotizacionPublica),
    data: { title: "Autorizar cotización" },
  },
  // El portal del cliente: sesión propia por código, sin login del taller.
  {
    path: "portal",
    loadComponent: () =>
      import("./pages/portal/portal-cliente").then((m) => m.PortalCliente),
    data: { title: "Portal del cliente" },
  },
  {
    path: "f/:token",
    loadComponent: () =>
      import("./pages/public/firma-publica").then((m) => m.FirmaPublica),
    data: { title: "Firmar documento" },
  },
  {
    path: "s/:token",
    loadComponent: () =>
      import("./pages/public/encuesta-publica").then((m) => m.EncuestaPublica),
    data: { title: "Encuesta de servicio" },
  },
  {
    path: "auth/forgot-password",
    loadComponent: () =>
      import("./pages/authentication/forget-pwd/forget-pwd").then(
        (m) => m.ForgetPwd,
      ),
  },
  // Portal de recepción: fuera del layout del DMS a propósito, para que en el
  // iPad no aparezca el menú de módulos. Pide sesión igual que el resto.
  {
    path: "recepcion",
    loadComponent: () =>
      import("./pages/portal-recepcion/portal-recepcion").then(
        (m) => m.PortalRecepcion,
      ),
    canActivate: [AdminGuard],
    data: { title: "Portal de recepción" },
  },
  {
    path: "",
    loadComponent: () =>
      import("./shared/components/layout/content-layout/content-layout").then(
        (m) => m.ContentLayout,
      ),
    canActivate: [AdminGuard],
    children: content,
  },
  {
    path: "",
    loadComponent: () =>
      import("./shared/components/layout/full-layout/full-layout").then(
        (m) => m.FullLayout,
      ),
    canActivate: [AdminGuard],
    children: fullRoutes,
  },
];
