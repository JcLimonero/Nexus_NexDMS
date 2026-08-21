import { Routes } from "@angular/router";

export const bodyworkRoutes: Routes = [
  {
    path: "",
    loadComponent: () => import("./lista/lista").then((m) => m.Lista),
    title: "Hojalatería y Pintura",
  },
  {
    path: "catalogo",
    loadComponent: () =>
      import("./catalogo/catalogo").then((m) => m.Catalogo),
    title: "Catálogo de piezas",
  },
  {
    path: "nueva",
    loadComponent: () => import("./detalle/detalle").then((m) => m.Detalle),
    title: "Nueva orden de carrocería",
  },
  {
    path: ":id",
    loadComponent: () => import("./detalle/detalle").then((m) => m.Detalle),
    title: "Orden de carrocería",
  },
];
