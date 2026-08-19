import { Routes } from "@angular/router";

export const email: Routes = [
  {
    path: "",
    loadComponent: () => import("./email").then((m) => m.Email),
    data: {
      title: "Email",
      breadcrumb: "Email",
    },
  },
];
