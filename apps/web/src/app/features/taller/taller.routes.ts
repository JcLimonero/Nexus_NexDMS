import { Routes } from "@angular/router";

import { demoOnlyGuard } from "../../shared/utils/demo-mode";
import { moduleGuard } from "../../shared/guard/module.guard";

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
    // Demo screen: the guard closes it when the `demo-mode` switch is off.
    path: "conversaciones",
    canActivate: [demoOnlyGuard],
    loadComponent: () =>
      import("./conversaciones/conversaciones").then((m) => m.Conversaciones),
    data: { title: "Conversaciones", breadcrumb: "Conversaciones" },
  },
  {
    // Módulo WhatsApp del taller. Cada pantalla declara su propia clave de
    // módulo (`data.module`) porque se contratan y cobran por separado, aunque
    // en el menú vivan agrupadas bajo Taller. Datos de demostración por ahora.
    path: "whatsapp",
    children: [
      { path: "", redirectTo: "panel", pathMatch: "full" },
      {
        // Panel de resultados: vista comercial del valor del módulo. Sin
        // `module` propio (agrega lo de los módulos WhatsApp contratados).
        path: "panel",
        data: { title: "Panel de resultados", breadcrumb: "Panel" },
        loadComponent: () =>
          import("./whatsapp/panel/panel").then((m) => m.Panel),
      },
      {
        path: "servicios-pendientes",
        canActivate: [moduleGuard],
        data: { title: "Servicios pendientes", breadcrumb: "Servicios pendientes", module: "wa-service-due" },
        loadComponent: () =>
          import("./whatsapp/servicios-pendientes/servicios-pendientes").then(
            (m) => m.ServiciosPendientes,
          ),
      },
      {
        path: "recordatorio-cita",
        canActivate: [moduleGuard],
        data: { title: "Recordatorio de cita", breadcrumb: "Recordatorio de cita", module: "wa-appointment-reminder" },
        loadComponent: () =>
          import("./whatsapp/recordatorio-cita/recordatorio-cita").then(
            (m) => m.RecordatorioCita,
          ),
      },
      {
        path: "agente-conversacional",
        canActivate: [moduleGuard],
        data: { title: "Agente conversacional", breadcrumb: "Agente conversacional", module: "wa-conversational-agent" },
        loadComponent: () =>
          import("./whatsapp/agente-conversacional/agente-conversacional").then(
            (m) => m.AgenteConversacional,
          ),
      },
      {
        // Consumo y facturación: agrega el gasto de los módulos de WhatsApp que
        // el tenant tenga contratados. Sin `module` propio (es una vista de
        // facturación, no un módulo aparte).
        path: "consumo",
        data: { title: "Consumo de WhatsApp", breadcrumb: "Consumo" },
        loadComponent: () =>
          import("./whatsapp/consumo/consumo").then((m) => m.Consumo),
      },
    ],
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
