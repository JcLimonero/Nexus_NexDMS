import { Routes } from "@angular/router";

export const partsInventoryRoutes: Routes = [
  {
    path: "",
    loadComponent: () =>
      import("./partes/list/partes-list").then((m) => m.PartesList),
    data: { title: "Partes", breadcrumb: "Partes" },
  },
  {
    // Antes que cualquier `:id`, o se la comería como si fuera un parámetro.
    path: "accesorios",
    loadComponent: () =>
      import("./accesorios/accesorios").then((m) => m.Accesorios),
    data: { title: "Accesorios", breadcrumb: "Accesorios" },
  },
  {
    path: "nuevo",
    loadComponent: () =>
      import("./partes/form/parte-form").then((m) => m.ParteForm),
    data: { title: "Nueva parte", breadcrumb: "Nuevo" },
  },
  {
    path: "categories",
    children: [
      {
        path: "",
        loadComponent: () =>
          import("./categorias/list/categorias-list").then((m) => m.CategoriasList),
        data: { title: "Categorías", breadcrumb: "Categorías" },
      },
      {
        path: "nuevo",
        loadComponent: () =>
          import("./categorias/form/categoria-form").then((m) => m.CategoriaForm),
        data: { title: "Nueva categoría", breadcrumb: "Nuevo" },
      },
      {
        path: ":id/editar",
        loadComponent: () =>
          import("./categorias/form/categoria-form").then((m) => m.CategoriaForm),
        data: { title: "Editar categoría", breadcrumb: "Editar" },
      },
    ],
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
    path: ":id",
    loadComponent: () =>
      import("./partes/detail/parte-detail").then((m) => m.ParteDetail),
    data: { title: "Detalle parte", breadcrumb: "Detalle" },
  },
  {
    path: ":id/editar",
    loadComponent: () =>
      import("./partes/form/parte-form").then((m) => m.ParteForm),
    data: { title: "Editar parte", breadcrumb: "Editar" },
  },
];
