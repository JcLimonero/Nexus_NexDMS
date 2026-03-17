import { Routes } from "@angular/router";

export const blog: Routes = [
  {
    path: "",
    children: [
      {
        path: "details",
        loadComponent: () =>
          import("./blog-detail/blog-detail").then((m) => m.BlogDetail),
        data: {
          title: "Blog-Detail",
          breadcrumb: "Blog-Detail",
        },
      },
      {
        path: "single",
        loadComponent: () =>
          import("./blog-single/blog-single").then((m) => m.BlogSingle),
        data: {
          title: "Blog-Single",
          breadcrumb: "Blog-Single",
        },
      },
    ],
  },
];
