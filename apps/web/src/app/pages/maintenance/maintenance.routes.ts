import { Routes } from "@angular/router";

export const maintenance: Routes = [
  {
    path: "",
    loadComponent: () => import("./maintenance").then((m) => m.Maintenance),
  },
];
