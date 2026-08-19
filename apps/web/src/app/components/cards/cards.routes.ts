import { Routes } from "@angular/router";

export const cards: Routes = [
  {
    path: "",
    children: [
      {
        path: "basic",
        loadComponent: () => import("./basic/basic").then((m) => m.Basic),
        data: {
          title: "Basic",
          breadcrumb: "Basic",
        },
      },
      {
        path: "creative",
        loadComponent: () =>
          import("./creative/creative").then((m) => m.Creative),
        data: {
          title: "Creative",
          breadcrumb: "Creative",
        },
      },
      {
        path: "tabbed",
        loadComponent: () => import("./tabbed/tabbed").then((m) => m.Tabbed),
        data: {
          title: "Tabbed",
          breadcrumb: "Tabbed",
        },
      },
    ],
  },
];
