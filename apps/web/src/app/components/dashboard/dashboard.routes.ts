import { Routes } from "@angular/router";

export const dashboard: Routes = [
  {
    path: "",
    children: [
      {
        path: "default",
        loadComponent: () => import("./default/default").then((m) => m.Default),
        data: {
          title: "Inicio",
          breadcrumb: "Inicio",
        },
      },
      {
        path: "e-commerce",
        loadComponent: () =>
          import("./e-commerce/e-commerce").then((m) => m.ECommerce),
        data: {
          title: "E-commerce",
          breadcrumb: "E-commerce",
        },
      },
      {
        path: "university",
        loadComponent: () =>
          import("./university/university").then((m) => m.University),
        data: {
          title: "University",
          breadcrumb: "University",
        },
      },
      {
        path: "bitcoin",
        loadComponent: () => import("./bitcoin/bitcoin").then((m) => m.Bitcoin),
        data: {
          title: "Crypto",
          breadcrumb: "Crypto",
        },
      },
      {
        path: "server",
        loadComponent: () => import("./server/server").then((m) => m.Server),
        data: {
          title: "Server",
          breadcrumb: "Server",
        },
      },
      {
        path: "project",
        loadComponent: () => import("./project/project").then((m) => m.Project),
        data: {
          title: "Project",
          breadcrumb: "Project",
        },
      },
    ],
  },
];
