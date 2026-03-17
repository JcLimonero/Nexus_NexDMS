import { Routes } from "@angular/router";

export const purchasesRoutes: Routes = [
  {
    path: "",
    redirectTo: "proveedores",
    pathMatch: "full",
  },
  {
    path: "proveedores",
    children: [
      {
        path: "",
        loadComponent: () =>
          import("./proveedores/list/proveedores-list").then(
            (m) => m.ProveedoresList
          ),
        data: { title: "Proveedores", breadcrumb: "Proveedores" },
      },
      {
        path: "nuevo",
        loadComponent: () =>
          import("./proveedores/form/proveedor-form").then(
            (m) => m.ProveedorForm
          ),
        data: { title: "Nuevo proveedor", breadcrumb: "Nuevo" },
      },
      {
        path: ":id/editar",
        loadComponent: () =>
          import("./proveedores/form/proveedor-form").then(
            (m) => m.ProveedorForm
          ),
        data: { title: "Editar proveedor", breadcrumb: "Editar" },
      },
    ],
  },
  {
    path: "purchase-orders",
    children: [
      {
        path: "",
        loadComponent: () =>
          import("./ordenes-compra/list/ordenes-compra-list").then(
            (m) => m.OrdenesCompraList
          ),
        data: { title: "Órdenes de compra", breadcrumb: "Órdenes" },
      },
      {
        path: "nueva",
        loadComponent: () =>
          import("./ordenes-compra/form/orden-compra-form").then(
            (m) => m.OrdenCompraForm
          ),
        data: { title: "Nueva orden", breadcrumb: "Nueva" },
      },
      {
        path: ":id",
        loadComponent: () =>
          import("./ordenes-compra/detail/orden-compra-detail").then(
            (m) => m.OrdenCompraDetail
          ),
        data: { title: "Detalle orden", breadcrumb: "Detalle" },
      },
    ],
  },
];
