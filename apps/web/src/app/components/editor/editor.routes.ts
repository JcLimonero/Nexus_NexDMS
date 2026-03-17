import { Routes } from "@angular/router";

export const editor: Routes = [
  {
    path: "",
    loadComponent: () => import("./editor").then((m) => m.Editors),
    data: {
      title: "Editors",
      breadcrumb: "Editors",
    },
  },
];
