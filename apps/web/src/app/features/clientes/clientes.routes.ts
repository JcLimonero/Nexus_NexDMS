import { Routes } from "@angular/router";

export const clientesRoutes: Routes = [
  {
    path: "",
    loadComponent: () =>
      import("./list/clientes-list").then((m) => m.ClientesList),
    data: { title: "Clientes", breadcrumb: "Clientes" },
  },
  {
    path: "nuevo",
    loadComponent: () =>
      import("./form/cliente-form").then((m) => m.ClienteForm),
    data: { title: "Nuevo cliente", breadcrumb: "Nuevo" },
  },
  {
    path: ":id",
    loadComponent: () =>
      import("./detail/cliente-detail").then((m) => m.ClienteDetail),
    data: { title: "Detalle cliente", breadcrumb: "Detalle" },
  },
  {
    path: ":id/editar",
    loadComponent: () =>
      import("./form/cliente-form").then((m) => m.ClienteForm),
    data: { title: "Editar cliente", breadcrumb: "Editar" },
  },
];

