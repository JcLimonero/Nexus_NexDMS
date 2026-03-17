import { Routes } from "@angular/router";

export const reportesRoutes: Routes = [
  {
    path: "",
    loadComponent: () =>
      import("./reportes-landing/reportes-landing").then(
        (m) => m.ReportesLanding
      ),
    data: { title: "Reportes", breadcrumb: "Reportes" },
  },
  {
    path: "comisiones",
    children: [
      {
        path: "",
        loadComponent: () =>
          import("./comisiones/comisiones-list").then(
            (m) => m.ComisionesList
          ),
        data: { title: "Comisiones", breadcrumb: "Comisiones" },
      },
      {
        path: "nuevo",
        loadComponent: () =>
          import("./comisiones/comision-period-form").then(
            (m) => m.ComisionPeriodForm
          ),
        data: { title: "Nuevo período", breadcrumb: "Nuevo" },
      },
      {
        path: ":id",
        loadComponent: () =>
          import("./comisiones/comision-period-detail").then(
            (m) => m.ComisionPeriodDetail
          ),
        data: { title: "Detalle período", breadcrumb: "Detalle" },
      },
    ],
  },
  {
    path: "general",
    loadComponent: () =>
      import("../../components/placeholder/placeholder").then(
        (m) => m.Placeholder
      ),
    data: { title: "Reportes generales", breadcrumb: "General" },
  },
];
