import { Routes } from "@angular/router";

export const quotesRoutes: Routes = [
  // ── Presupuestos de venta (unidades/refacciones) ──
  {
    path: "",
    loadComponent: () =>
      import("./list/cotizaciones-list").then((m) => m.CotizacionesList),
    data: { title: "Presupuestos de venta", breadcrumb: "Venta", modo: "venta" },
  },
  {
    path: "nueva",
    loadComponent: () =>
      import("./form/cotizacion-form").then((m) => m.CotizacionForm),
    data: { title: "Nuevo presupuesto de venta", breadcrumb: "Nuevo" },
  },

  // ── Presupuestos de servicio (taller): trabajos → refacciones ──
  {
    path: "servicio",
    loadComponent: () =>
      import("./list/cotizaciones-list").then((m) => m.CotizacionesList),
    data: {
      title: "Presupuestos de servicio",
      breadcrumb: "Servicio",
      modo: "servicio",
    },
  },
  {
    path: "servicio/nuevo",
    loadComponent: () =>
      import("./servicio/presupuesto-servicio-form").then(
        (m) => m.PresupuestoServicioForm,
      ),
    data: { title: "Nuevo presupuesto de servicio", breadcrumb: "Nuevo" },
  },
  {
    path: "servicio/:id/editar",
    loadComponent: () =>
      import("./servicio/presupuesto-servicio-form").then(
        (m) => m.PresupuestoServicioForm,
      ),
    data: { title: "Editar presupuesto de servicio", breadcrumb: "Editar" },
  },

  // ── Compartidas: edición de venta y detalle ──
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
