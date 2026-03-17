import { Routes } from "@angular/router";

export const unitsInventoryRoutes: Routes = [
  {
    path: "",
    loadComponent: () =>
      import("./unidades/list/unidades-list").then((m) => m.UnidadesList),
    data: { title: "Unidades", breadcrumb: "Unidades" },
  },
  {
    path: "nuevo",
    loadComponent: () =>
      import("./unidades/form/unidad-form").then((m) => m.UnidadForm),
    data: { title: "Nueva unidad", breadcrumb: "Nuevo" },
  },
  {
    path: "locations",
    children: [
      {
        path: "",
        loadComponent: () =>
          import("./ubicaciones/list/ubicaciones-list").then((m) => m.UbicacionesList),
        data: { title: "Ubicaciones", breadcrumb: "Ubicaciones" },
      },
      {
        path: "nueva",
        loadComponent: () =>
          import("./ubicaciones/form/ubicacion-form").then((m) => m.UbicacionForm),
        data: { title: "Nueva ubicación", breadcrumb: "Nueva" },
      },
      {
        path: ":id/editar",
        loadComponent: () =>
          import("./ubicaciones/form/ubicacion-form").then((m) => m.UbicacionForm),
        data: { title: "Editar ubicación", breadcrumb: "Editar" },
      },
    ],
  },
  {
    path: ":id/expediente",
    loadComponent: () =>
      import("./unidades/expediente-redirect/expediente-redirect").then(
        (m) => m.ExpedienteRedirect
      ),
    data: { title: "Expediente", breadcrumb: "Documentos" },
  },
  {
    path: ":id/recompra/:returnId/expediente",
    loadComponent: () =>
      import("./unidades/expediente").then((m) => m.ExpedienteRecompra),
    data: { title: "Expediente recompra", breadcrumb: "Expediente" },
  },
  {
    path: ":id/recompra",
    loadComponent: () =>
      import("./unidades/recompra/unidad-recompra").then((m) => m.UnidadRecompra),
    data: { title: "Registrar recompra", breadcrumb: "Recompra" },
  },
  {
    path: ":id/editar",
    loadComponent: () =>
      import("./unidades/form/unidad-form").then((m) => m.UnidadForm),
    data: { title: "Editar unidad", breadcrumb: "Editar" },
  },
  {
    path: ":id",
    loadComponent: () =>
      import("./unidades/detail/unidad-detail").then((m) => m.UnidadDetail),
    data: { title: "Detalle unidad", breadcrumb: "Detalle" },
  },
];
