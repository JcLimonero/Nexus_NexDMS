import { Routes } from "@angular/router";

export const workshopRoutes: Routes = [
  {
    path: "",
    redirectTo: "service-orders",
    pathMatch: "full",
  },
  {
    path: "service-orders",
    children: [
      {
        path: "",
        loadComponent: () =>
          import("./ordenes-servicio/list/ordenes-servicio-list").then(
            (m) => m.OrdenesServicioList
          ),
        data: { title: "Órdenes de servicio", breadcrumb: "Órdenes" },
      },
      {
        path: "nueva",
        loadComponent: () =>
          import("./ordenes-servicio/form/orden-servicio-form").then(
            (m) => m.OrdenServicioForm
          ),
        data: { title: "Nueva orden", breadcrumb: "Nueva" },
      },
      {
        path: ":id",
        loadComponent: () =>
          import("./ordenes-servicio/detail/orden-servicio-detail").then(
            (m) => m.OrdenServicioDetail
          ),
        data: { title: "Detalle orden", breadcrumb: "Detalle" },
      },
    ],
  },
  {
    path: "recepcion",
    loadComponent: () =>
      import("./recepcion/recepcion-page").then((m) => m.RecepcionPage),
    data: { title: "Recepción de unidades", breadcrumb: "Recepción" },
  },
  {
    path: "agenda",
    loadComponent: () =>
      import("./agenda/planificador-taller").then((m) => m.PlanificadorTaller),
    data: { title: "Planificador de taller", breadcrumb: "Planificador" },
  },
  {
    path: "citas",
    loadComponent: () =>
      import("./citas/citas-page").then((m) => m.CitasPage),
    data: { title: "Citas", breadcrumb: "Citas" },
  },
];
