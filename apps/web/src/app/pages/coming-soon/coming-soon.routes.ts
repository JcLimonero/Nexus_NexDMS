import { Routes } from "@angular/router";

export const comingsoonPages: Routes = [
  {
    path: "",
    children: [
      {
        path: "page",
        loadComponent: () => import("./simple/simple").then((m) => m.Simple),
      },
      {
        path: "page/image",
        loadComponent: () =>
          import("./page-with-image/page-with-image").then(
            (m) => m.PageWithImage,
          ),
      },
      {
        path: "page/video",
        loadComponent: () =>
          import("./page-with-video/page-with-video").then(
            (m) => m.PageWithVideo,
          ),
      },
    ],
  },
];
