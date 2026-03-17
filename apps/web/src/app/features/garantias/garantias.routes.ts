import { Routes } from "@angular/router";

export const garantiasRoutes: Routes = [
  {
    path: "",
    loadComponent: () =>
      import("./garantias-list/garantias-list").then((m) => m.GarantiasList),
    data: { title: "Garantías", breadcrumb: "Garantías" },
  },
  {
    path: "nueva",
    loadComponent: () =>
      import("./garantia-form/garantia-form").then((m) => m.GarantiaForm),
    data: { title: "Nueva garantía", breadcrumb: "Nueva" },
  },
  {
    path: ":id",
    loadComponent: () =>
      import("./garantia-detail/garantia-detail").then((m) => m.GarantiaDetail),
    data: { title: "Detalle garantía", breadcrumb: "Detalle" },
  },
];
