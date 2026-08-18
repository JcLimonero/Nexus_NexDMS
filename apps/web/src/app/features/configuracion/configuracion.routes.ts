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
        path: "nueva",
        loadComponent: () =>
          import("./sucursal-form/sucursal-form").then((m) => m.SucursalForm),
        data: { title: "Nueva sucursal", breadcrumb: "Nueva" },
      },
      {
        path: ":id/editar",
        loadComponent: () =>
          import("./sucursal-form/sucursal-form").then((m) => m.SucursalForm),
        data: { title: "Editar sucursal", breadcrumb: "Editar" },
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
    path: "usuarios",
    loadComponent: () =>
      import("./usuarios/usuarios").then((m) => m.Usuarios),
    data: { title: "Usuarios y roles", breadcrumb: "Usuarios" },
  },
  {
    path: "razones-sociales",
    loadComponent: () =>
      import("./razones-sociales/razones-sociales").then((m) => m.RazonesSociales),
    data: { title: "Razones sociales", breadcrumb: "Razones sociales" },
  },
  {
    path: "documentos-venta",
    loadComponent: () =>
      import(
        "../ventas-unidades/documentos/config-documentos-venta"
      ).then((m) => m.ConfigDocumentosVenta),
    data: {
      title: "Documentos de venta",
      breadcrumb: "Documentos de venta",
    },
  },
  {
    path: "credito",
    loadComponent: () =>
      import("./credito/credito-config").then((m) => m.CreditoConfig),
    data: {
      title: "Crédito y adeudos",
      breadcrumb: "Crédito y adeudos",
    },
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
