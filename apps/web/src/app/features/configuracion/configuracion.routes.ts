import { Routes } from "@angular/router";

export const settingsRoutes: Routes = [
  {
    path: "",
    loadComponent: () =>
      import("./configuracion-landing/configuracion-landing").then(
        (m) => m.ConfiguracionLanding
      ),
    data: { title: "Configuración", breadcrumb: "Configuración" },
  },
  {
    path: "sucursales",
    children: [
      {
        path: "",
        loadComponent: () =>
          import("./sucursales-list/sucursales-list").then(
            (m) => m.SucursalesList
          ),
        data: { title: "Sucursales", breadcrumb: "Sucursales" },
      },
      {
        path: ":id",
        loadComponent: () =>
          import("./sucursal-config/sucursal-config").then(
            (m) => m.SucursalConfig
          ),
        data: { title: "Config sucursal", breadcrumb: "Config" },
      },
    ],
  },
  {
    path: "razones-sociales",
    loadComponent: () =>
      import("./razones-sociales/razones-sociales").then((m) => m.RazonesSociales),
    data: { title: "Razones sociales", breadcrumb: "Razones sociales" },
  },
  {
    path: "general",
    loadComponent: () =>
      import("../../components/placeholder/placeholder").then(
        (m) => m.Placeholder
      ),
    data: { title: "Configuración general", breadcrumb: "General" },
  },
];
