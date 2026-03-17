import { Routes } from "@angular/router";

export const calendar: Routes = [
  {
    path: "",
    loadComponent: () => import("./calender").then((m) => m.Calender),
    data: {
      title: "Calender",
      breadcrumb: "Calender",
    },
  },
];
