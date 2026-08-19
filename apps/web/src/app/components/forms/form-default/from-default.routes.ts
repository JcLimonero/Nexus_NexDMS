import { Routes } from "@angular/router";

export const FormDefault: Routes = [
  {
    path: "",
    loadComponent: () => import("./form-default").then((m) => m.FormDefaults),
    data: {
      title: "Form-Default",
      breadcrumb: "Form-Default",
    },
  },
];
