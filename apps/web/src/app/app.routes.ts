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
