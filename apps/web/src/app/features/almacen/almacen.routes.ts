import { Routes } from "@angular/router";

export const almacenRoutes: Routes = [
  {
    path: "",
    redirectTo: "transferencias",
    pathMatch: "full",
  },
  {
    path: "transferencias",
    children: [
      {
        path: "",
        loadComponent: () =>
          import("./transferencias/list/transferencias-list").then(
            (m) => m.TransferenciasList
          ),
        data: { title: "Transferencias", breadcrumb: "Transferencias" },
      },
      {
        path: "nueva",
        loadComponent: () =>
          import("./transferencias/form/transferencia-form").then(
            (m) => m.TransferenciaForm
          ),
        data: { title: "Nueva transferencia", breadcrumb: "Nueva" },
      },
      {
        path: ":id",
        loadComponent: () =>
          import("./transferencias/detail/transferencia-detail").then(
            (m) => m.TransferenciaDetail
          ),
        data: { title: "Detalle transferencia", breadcrumb: "Detalle" },
      },
    ],
  },
  {
    path: "apartados",
    children: [
      {
        path: "",
        loadComponent: () =>
          import("./apartados/list/apartados-list").then(
            (m) => m.ApartadosList
          ),
        data: { title: "Apartados", breadcrumb: "Apartados" },
      },
      {
        path: "nuevo",
        loadComponent: () =>
          import("./apartados/form/apartado-form").then(
            (m) => m.ApartadoForm
          ),
        data: { title: "Nuevo apartado", breadcrumb: "Nuevo" },
      },
      {
        path: ":id",
        loadComponent: () =>
          import("./apartados/detail/apartado-detail").then(
            (m) => m.ApartadoDetail
          ),
        data: { title: "Detalle apartado", breadcrumb: "Detalle" },
      },
    ],
  },
];
