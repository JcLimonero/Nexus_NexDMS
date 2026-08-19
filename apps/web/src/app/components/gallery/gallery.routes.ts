import { Routes } from "@angular/router";

export const Gallery: Routes = [
  {
    path: "",
    children: [
      {
        path: "gallery-grid",
        loadComponent: () =>
          import("./gallery-grid/gallery-grid").then((m) => m.GalleryGrid),
        data: {
          title: "Gallery Grid",
          breadcrumb: "Gallery Grid",
        },
      },
      {
        path: "gallery-desc",
        loadComponent: () =>
          import("./gallery-desc/gallery-desc").then((m) => m.GalleryDesc),
        data: {
          title: "Gallery Grid With Desc",
          breadcrumb: "Gallery Grid With Desc",
        },
      },
      {
        path: "mesonry",
        loadComponent: () => import("./mesonry/mesonry").then((m) => m.Mesonry),
        data: {
          title: "Masonry Gallery",
          breadcrumb: "Masonry Gallery",
        },
      },
      {
        path: "hover-effect",
        loadComponent: () =>
          import("./hover-effect/hover-effect").then((m) => m.HoverEffect),
        data: {
          title: "Hover Effect",
          breadcrumb: "Hover Effect",
        },
      },
    ],
  },
];
