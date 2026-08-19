import { Routes } from "@angular/router";

export const UiKits: Routes = [
  {
    path: "",
    children: [
      {
        path: "typography",
        loadComponent: () =>
          import("./typography/typography").then((m) => m.Typography),
        data: {
          title: "Typography",
          breadcrumb: "Typography",
        },
      },
      {
        path: "avatars",
        loadComponent: () => import("./avatars/avatars").then((m) => m.Avatars),
        data: {
          title: "Avatars",
          breadcrumb: "Avatars",
        },
      },
      {
        path: "helper-classes",
        loadComponent: () =>
          import("./helper-classes/helper-classes").then(
            (m) => m.HelperClasses,
          ),
        data: {
          title: "Helper-Classes",
          breadcrumb: "Helper-Classes",
        },
      },
      {
        path: "grid",
        loadComponent: () => import("./grid/grid").then((m) => m.Grid),
        data: {
          title: "Grid",
          breadcrumb: "Grid",
        },
      },
      {
        path: "tag-n-pills",
        loadComponent: () =>
          import("./tag-n-pills/tag-n-pills").then((m) => m.TagNPills),
        data: {
          title: "Tag and Pills",
          breadcrumb: "Tag and Pills",
        },
      },
      {
        path: "spinner",
        loadComponent: () =>
          import("./spinners/spinners").then((m) => m.Spinners),
        data: {
          title: "Spinner",
          breadcrumb: "Spinner",
        },
      },
      {
        path: "shadow",
        loadComponent: () => import("./shadow/shadow").then((m) => m.Shadow),
        data: {
          title: "Shadow",
          breadcrumb: "Shadow",
        },
      },
      {
        path: "list",
        loadComponent: () => import("./list/list").then((m) => m.List),
        data: {
          title: "List",
          breadcrumb: "List",
        },
      },
      {
        path: "ribbons",
        loadComponent: () =>
          import("./ribbions/ribbions").then((m) => m.Ribbions),
        data: {
          title: "Ribbons",
          breadcrumb: "Ribbons",
        },
      },
      {
        path: "steps",
        loadComponent: () => import("./steps/steps").then((m) => m.Steps),
        data: {
          title: "Steps",
          breadcrumb: "Steps",
        },
      },
      {
        path: "breadcrumb",
        loadComponent: () =>
          import("./breadcrumb/breadcrumb").then((m) => m.Breadcrumb),
        data: {
          title: "Breadcrumb",
          breadcrumb: "Breadcrumb",
        },
      },
    ],
  },
];
