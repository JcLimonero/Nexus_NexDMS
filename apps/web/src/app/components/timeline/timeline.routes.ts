import { Routes } from "@angular/router";

export const Timeline: Routes = [
  {
    path: "",
    loadComponent: () =>
      import("./timeline1/timeline1").then((m) => m.Timeline1),
    data: {
      title: "Timeline1",
      breadcrumb: "Timeline1",
    },
  },
];
