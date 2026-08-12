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
