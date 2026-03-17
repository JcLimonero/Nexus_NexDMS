import { Routes } from "@angular/router";

export const ngxDataTable: Routes = [
  {
    path: "",
    loadComponent: () => import("./basic").then((m) => m.BasicNgxDatatable),
    data: {
      title: "Basic",
      breadcrumb: "Ngx-Datatables / Basic",
    },
  },
];
