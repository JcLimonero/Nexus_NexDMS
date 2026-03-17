import { Routes } from "@angular/router";

export const catalogoRoutes: Routes = [
  {
    path: "",
    loadComponent: () =>
      import("./modelos-globales/list/modelos-globales-list").then(
        (m) => m.ModelosGlobalesList
      ),
    data: { title: "Modelos globales", breadcrumb: "Modelos globales" },
  },
  {
    path: "nuevo",
    loadComponent: () =>
      import("./modelos-globales/form/modelo-global-form").then(
        (m) => m.ModeloGlobalForm
      ),
    data: { title: "Nuevo modelo", breadcrumb: "Nuevo" },
  },
  {
    path: ":id",
    loadComponent: () =>
      import("./modelos-globales/detail/modelo-global-detail").then(
        (m) => m.ModeloGlobalDetail
      ),
    data: { title: "Detalle modelo", breadcrumb: "Detalle" },
  },
  {
    path: ":id/editar",
    loadComponent: () =>
      import("./modelos-globales/form/modelo-global-form").then(
        (m) => m.ModeloGlobalForm
      ),
    data: { title: "Editar modelo", breadcrumb: "Editar" },
  },
];
