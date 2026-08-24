import { Routes } from "@angular/router";

export const fleetsRoutes: Routes = [
  {
    path: "",
    loadComponent: () => import("./lista/lista").then((m) => m.Lista),
    title: "Flotillas",
  },
  {
    path: "nueva",
    loadComponent: () => import("./detalle/detalle").then((m) => m.Detalle),
    title: "Nuevo convenio de flotilla",
  },
  {
    path: ":id",
    loadComponent: () => import("./detalle/detalle").then((m) => m.Detalle),
    title: "Convenio de flotilla",
  },
];
