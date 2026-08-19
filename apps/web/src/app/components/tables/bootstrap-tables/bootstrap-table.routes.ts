import { Routes } from "@angular/router";

export const bootstrapTables: Routes = [
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
        path: "sizing",
        loadComponent: () => import("./sizing/sizing").then((m) => m.Sizing),
        data: {
          title: "Sizing",
          breadcrumb: "Sizing",
        },
      },
      {
        path: "border",
        loadComponent: () => import("./border/border").then((m) => m.Border),
        data: {
          title: "Border",
          breadcrumb: "Border",
        },
      },
      {
        path: "styling",
        loadComponent: () => import("./styling/styling").then((m) => m.Styling),
        data: {
          title: "BOOTSTRAP STYLING TABLES",
          breadcrumb: "Styling",
        },
      },
      {
        path: "filter-table",
        loadComponent: () => import("./styling/styling").then((m) => m.Styling),
        data: {
          title: "Styling",
          breadcrumb: "Styling",
        },
      },
    ],
  },
];
