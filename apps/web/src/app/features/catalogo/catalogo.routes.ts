import { Routes } from "@angular/router";

export const catalogRoutes: Routes = [
  {
    path: "",
    loadComponent: () =>
      import("./modelos-globales/list/modelos-globales-list").then(
        (m) => m.ModelosGlobalesList
      ),
    data: { title: "Modelos globales", breadcrumb: "Modelos globales" },
  },
  {
    path: "vehicle-types",
    loadComponent: () =>
      import("./tipos-vehiculo/tipos-vehiculo-list").then(
        (m) => m.TiposVehiculoList
      ),
    data: { title: "Tipos de vehículo", breadcrumb: "Tipos vehículo" },
  },
  {
    path: "vehicle-types/nuevo",
    loadComponent: () =>
      import("./tipos-vehiculo/tipo-vehiculo-form").then(
        (m) => m.TipoVehiculoForm
      ),
    data: { title: "Nuevo tipo de vehículo", breadcrumb: "Nuevo" },
  },
  {
    path: "vehicle-types/:id/editar",
    loadComponent: () =>
      import("./tipos-vehiculo/tipo-vehiculo-form").then(
        (m) => m.TipoVehiculoForm
      ),
    data: { title: "Editar tipo de vehículo", breadcrumb: "Editar" },
  },
  {
    path: "combustion-types",
    loadComponent: () =>
      import("./tipos-combustion/tipos-combustion-list").then(
        (m) => m.TiposCombustionList
      ),
    data: { title: "Tipos de combustión", breadcrumb: "Tipos combustión" },
  },
  {
    path: "tipos-combustion/nuevo",
    loadComponent: () =>
      import("./tipos-combustion/tipo-combustion-form").then(
        (m) => m.TipoCombustionForm
      ),
    data: { title: "Nuevo tipo de combustión", breadcrumb: "Nuevo" },
  },
  {
    path: "combustion-types/:id/editar",
    loadComponent: () =>
      import("./tipos-combustion/tipo-combustion-form").then(
        (m) => m.TipoCombustionForm
      ),
    data: { title: "Editar tipo de combustión", breadcrumb: "Editar" },
  },
  {
    path: "marcas",
    loadComponent: () =>
      import("./marcas-globales/list/marcas-globales-list").then(
        (m) => m.MarcasGlobalesList
      ),
    data: { title: "Marcas globales", breadcrumb: "Marcas" },
  },
  {
    path: "marcas/nuevo",
    loadComponent: () =>
      import("./marcas-globales/form/marca-global-form").then(
        (m) => m.MarcaGlobalForm
      ),
    data: { title: "Nueva marca", breadcrumb: "Nueva" },
  },
  {
    path: "marcas/:id/editar",
    loadComponent: () =>
      import("./marcas-globales/form/marca-global-form").then(
        (m) => m.MarcaGlobalForm
      ),
    data: { title: "Editar marca", breadcrumb: "Editar" },
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
