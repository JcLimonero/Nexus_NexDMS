import { Routes } from "@angular/router";

export const quotesRoutes: Routes = [
  {
    path: "",
    loadComponent: () =>
      import("./list/cotizaciones-list").then((m) => m.CotizacionesList),
    data: { title: "Presupuestos", breadcrumb: "Presupuestos" },
  },
  {
    path: "nueva",
    loadComponent: () =>
      import("./form/cotizacion-form").then((m) => m.CotizacionForm),
    data: { title: "Nuevo presupuesto", breadcrumb: "Nueva" },
  },
  {
    // Presupuesto de servicio (taller): trabajos → refacciones, como el prototipo.
    path: "servicio/nuevo",
    loadComponent: () =>
      import("./servicio/presupuesto-servicio-form").then(
        (m) => m.PresupuestoServicioForm,
      ),
    data: { title: "Presupuesto de servicio", breadcrumb: "Servicio" },
  },
  {
    path: ":id/editar",
    loadComponent: () =>
      import("./form/cotizacion-form").then((m) => m.CotizacionForm),
    data: { title: "Editar presupuesto", breadcrumb: "Editar" },
  },
  {
    path: ":id",
    loadComponent: () =>
      import("./detail/cotizacion-detail").then((m) => m.CotizacionDetail),
    data: { title: "Detalle presupuesto", breadcrumb: "Detalle" },
  },
];
