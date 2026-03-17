import { Routes } from "@angular/router";

export const quotesRoutes: Routes = [
  {
    path: "",
    loadComponent: () =>
      import("./list/cotizaciones-list").then((m) => m.CotizacionesList),
    data: { title: "Cotizaciones", breadcrumb: "Cotizaciones" },
  },
  {
    path: "nueva",
    loadComponent: () =>
      import("./form/cotizacion-form").then((m) => m.CotizacionForm),
    data: { title: "Nueva cotización", breadcrumb: "Nueva" },
  },
  {
    path: ":id/editar",
    loadComponent: () =>
      import("./form/cotizacion-form").then((m) => m.CotizacionForm),
    data: { title: "Editar cotización", breadcrumb: "Editar" },
  },
  {
    path: ":id",
    loadComponent: () =>
      import("./detail/cotizacion-detail").then((m) => m.CotizacionDetail),
    data: { title: "Detalle cotización", breadcrumb: "Detalle" },
  },
];
