import { Routes } from "@angular/router";

export const fullRoutes: Routes = [
  {
    path: "error",
    loadChildren: () =>
      import("../../pages/error-pages/error-pages.routes").then(
        (r) => r.errorPages,
      ),
  },
  {
    path: "authentication",
    loadChildren: () =>
      import("../../pages/authentication/authentication.routes").then(
        (r) => r.authentication,
      ),
  },
  {
    path: "comingsoon",
    loadChildren: () =>
      import("../../pages/coming-soon/coming-soon.routes").then(
        (r) => r.comingsoonPages,
      ),
  },
  {
    path: "maintenance",
    loadChildren: () =>
      import("../../pages/maintenance/maintenance.routes").then(
        (r) => r.maintenance,
      ),
  },
];
