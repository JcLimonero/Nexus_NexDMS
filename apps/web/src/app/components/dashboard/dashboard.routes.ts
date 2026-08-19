import { Routes } from "@angular/router";

/**
 * Se retiraron las rutas de dashboards demo del template (e-commerce,
 * university, bitcoin, server, project): no forman parte del producto,
 * estaban en inglés y eran alcanzables escribiendo la URL.
 * Los dashboards del producto viven en /dashboard/default y /m/:key.
 */
export const dashboard: Routes = [
  {
    path: "",
    children: [
      {
        path: "default",
        loadComponent: () =>
          import("../../features/inicio/dashboard-inicio").then(
            (m) => m.DashboardInicio,
          ),
        data: {
          title: "Inicio",
          breadcrumb: "Inicio",
        },
      },
      { path: "**", redirectTo: "default" },
    ],
  },
];
