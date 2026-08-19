import { Routes } from "@angular/router";

export const cfdiRoutes: Routes = [
  {
    path: "",
    loadComponent: () =>
      import("./list/cfdi-list").then((m) => m.CfdiList),
    data: { title: "CFDI", breadcrumb: "CFDI" },
  },
  {
    path: ":id",
    loadComponent: () =>
      import("./detail/cfdi-detail").then((m) => m.CfdiDetail),
    data: { title: "Detalle CFDI", breadcrumb: "Detalle" },
  },
];
