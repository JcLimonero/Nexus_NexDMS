import { Routes } from "@angular/router";

export const workshopRoutes: Routes = [
  {
    path: "",
    redirectTo: "service-orders",
    pathMatch: "full",
  },
  {
    path: "comisiones",
    loadComponent: () =>
      import("./comisiones/comisiones").then((m) => m.Comisiones),
    data: { title: "Comisiones", breadcrumb: "Comisiones" },
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
    // La recepción se movió a `/reception`, que es su propio módulo. Se deja
    // el redirect para no romper los enlaces ya repartidos.
    path: "recepcion",
    redirectTo: "/reception",
    pathMatch: "full",
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
  {
    // Ya no es una pantalla de demostración: lee las conversaciones reales de
    // WhatsApp de la sucursal, así que sale de detrás del interruptor de demo.
    path: "conversaciones",
    loadComponent: () =>
      import("./conversaciones/conversaciones").then((m) => m.Conversaciones),
    data: { title: "Conversaciones", breadcrumb: "Conversaciones" },
  },
  {
    // Los mismos tableros que se cuelgan en la pantalla del taller, pero
    // accesibles desde el DMS. Van bajo `workshop` (no bajo `/monitor`) para
    // que usen la sesión del usuario que ya inició sesión, no la del monitor.
    path: "tablero-taller",
    loadComponent: () =>
      import("../../pages/monitor/monitor-taller").then((m) => m.MonitorTaller),
    data: { title: "Monitor de taller", breadcrumb: "Monitor de taller" },
  },
  {
    path: "tablero-citas",
    loadComponent: () =>
      import("../../pages/monitor/monitor-citas").then((m) => m.MonitorCitas),
    data: { title: "Monitor de citas", breadcrumb: "Monitor de citas" },
  },
];
