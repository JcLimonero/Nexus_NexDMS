import { Routes } from "@angular/router";

export const charts: Routes = [
  {
    path: "",
    children: [
      {
        path: "google",
        loadComponent: () => import("./google/google").then((m) => m.Google),
        data: {
          title: "Google",
          breadcrumb: "Google",
        },
      },
      {
        path: "chartjs",
        loadComponent: () => import("./chartjs/chartjs").then((m) => m.Chartjs),
        data: {
          title: "ChartJS",
          breadcrumb: "ChartJS",
        },
      },
      {
        path: "chartist",
        loadComponent: () =>
          import("./chartist/chartist").then((m) => m.Chartist),
        data: {
          title: "Chartist",
          breadcrumb: "Chartist",
        },
      },
      {
        path: "ngx-chart",
        loadComponent: () =>
          import("./ngx-chart/ngx-chart").then((m) => m.NgxChart),
        data: {
          title: "Ngx-Chart",
          breadcrumb: "Ngx-Chart",
        },
      },
    ],
  },
];
