import { Routes } from "@angular/router";

export const learning: Routes = [
  {
    path: "",
    children: [
      {
        path: "learninglist",
        loadComponent: () =>
          import("./learning-list/learning-list").then((m) => m.LearningList),
        data: {
          title: "Learning List",
          breadcrumb: "learning",
        },
      },
      {
        path: "learning-detail/:id",
        loadComponent: () =>
          import("./learning-detail/learning-detail").then(
            (m) => m.LearningDetail,
          ),
        data: {
          title: "Detail Course",
          breadcrumb: "Detail Course",
        },
      },
    ],
  },
];
