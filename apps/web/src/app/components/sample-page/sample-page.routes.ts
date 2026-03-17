import { Routes } from "@angular/router";

export const samplePage: Routes = [
  {
    path: "",
    loadComponent: () => import("./sample-page").then((m) => m.SamplePage),
    data: {
      title: "Sample Page",
      breadcrumb: "",
    },
  },
];
