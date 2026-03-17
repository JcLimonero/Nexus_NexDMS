import { Routes } from "@angular/router";

export const cashRegisterRoutes: Routes = [
  {
    path: "",
    redirectTo: "sesiones",
    pathMatch: "full",
  },
  {
    path: "sesiones",
    children: [
      {
        path: "",
        loadComponent: () =>
          import("./caja/sesiones/sesiones-list").then((m) => m.SesionesList),
        data: { title: "Sesiones de caja", breadcrumb: "Sesiones" },
      },
      {
        path: ":id",
        loadComponent: () =>
          import("./caja/sesiones/sesion-detail").then(
            (m) => m.SesionDetail
          ),
        data: { title: "Detalle sesión", breadcrumb: "Detalle" },
      },
    ],
  },
  {
    path: "ventas",
    children: [
      {
        path: "",
        loadComponent: () =>
          import("./ventas/list/ventas-list").then((m) => m.VentasList),
        data: { title: "Ventas (POS)", breadcrumb: "Ventas" },
      },
      {
        path: "nueva",
        loadComponent: () =>
          import("./ventas/form/venta-form").then((m) => m.VentaForm),
        data: { title: "Nueva venta", breadcrumb: "Nueva" },
      },
      {
        path: ":id",
        loadComponent: () =>
          import("./ventas/detail/venta-detail").then((m) => m.VentaDetail),
        data: { title: "Detalle venta", breadcrumb: "Detalle" },
      },
    ],
  },
  {
    path: "listas-precio",
    children: [
      {
        path: "",
        loadComponent: () =>
          import("./listas-precio/list/listas-precio-list").then(
            (m) => m.ListasPrecioList
          ),
        data: { title: "Listas de precio", breadcrumb: "Listas" },
      },
      {
        path: "nueva",
        loadComponent: () =>
          import("./listas-precio/form/lista-precio-form").then(
            (m) => m.ListaPrecioForm
          ),
        data: { title: "Nueva lista", breadcrumb: "Nueva" },
      },
      {
        path: ":id/editar",
        loadComponent: () =>
          import("./listas-precio/form/lista-precio-form").then(
            (m) => m.ListaPrecioForm
          ),
        data: { title: "Editar lista", breadcrumb: "Editar" },
      },
    ],
  },
];
