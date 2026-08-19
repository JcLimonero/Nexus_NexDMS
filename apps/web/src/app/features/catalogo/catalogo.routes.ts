import { Routes } from "@angular/router";

export const catalogRoutes: Routes = [
  {
    path: "",
    loadComponent: () =>
      import("./variantes/list/variantes-list").then(
        (m) => m.VariantesList
      ),
    data: { title: "Variantes de vehículo", breadcrumb: "Variantes" },
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
      import("./variantes/form/variante-form").then(
        (m) => m.VarianteForm
      ),
    data: { title: "Nueva variante", breadcrumb: "Nuevo" },
  },
  {
    path: ":id",
    loadComponent: () =>
      import("./variantes/detail/variante-detail").then(
        (m) => m.VarianteDetail
      ),
    data: { title: "Detalle variante", breadcrumb: "Detalle" },
  },
  {
    path: ":id/editar",
    loadComponent: () =>
      import("./variantes/form/variante-form").then(
        (m) => m.VarianteForm
      ),
    data: { title: "Editar variante", breadcrumb: "Editar" },
  },
];
