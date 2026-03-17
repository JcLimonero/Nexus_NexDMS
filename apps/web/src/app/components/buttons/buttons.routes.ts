import { Routes } from "@angular/router";

export const Buttons: Routes = [
  {
    path: "",
    children: [
      {
        path: "default",
        loadComponent: () => import("./default/default").then((m) => m.Default),
        data: {
          title: "Default",
          breadcrumb: "Default",
        },
      },
      {
        path: "flat",
        loadComponent: () => import("./flat/flat").then((m) => m.Flat),
        data: {
          title: "Flat",
          breadcrumb: "Flat",
        },
      },
      {
        path: "edge",
        loadComponent: () => import("./edge/edge").then((m) => m.Edge),
        data: {
          title: "Edge",
          breadcrumb: "Edge",
        },
      },
      {
        path: "raised",
        loadComponent: () => import("./raised/raised").then((m) => m.Raised),
        data: {
          title: "Raised",
          breadcrumb: "Raised",
        },
      },
      {
        path: "group",
        loadComponent: () =>
          import("./button-group/button-group").then((m) => m.ButtonGroup),
        data: {
          title: "Group",
          breadcrumb: "Group",
        },
      },
    ],
  },
];
