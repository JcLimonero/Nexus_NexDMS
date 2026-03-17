import { Routes } from "@angular/router";

export const Icons: Routes = [
  {
    path: "",
    children: [
      {
        path: "flag",
        loadComponent: () =>
          import("./flag-icon/flag-icon").then((m) => m.FlagIcon),
        data: {
          title: "Flag",
          breadcrumb: "Flag",
        },
      },
      {
        path: "fontawesome",
        loadComponent: () =>
          import("./font-awesome-icon/font-awesome-icon").then(
            (m) => m.FontAwesomeIcon,
          ),
        data: {
          title: "FontAwesome",
          breadcrumb: "FontAwesome",
        },
      },
      {
        path: "ico",
        loadComponent: () =>
          import("./ico-icon/ico-icon").then((m) => m.IcoIcon),
        data: {
          title: "Ico",
          breadcrumb: "Ico",
        },
      },
      {
        path: "themify",
        loadComponent: () =>
          import("./themify-icon/themify-icon").then((m) => m.ThemifyIcon),
        data: {
          title: "Themify",
          breadcrumb: "Themify",
        },
      },
      {
        path: "feather",
        loadComponent: () =>
          import("./feather-icon/feather-icon").then((m) => m.FeatherIcon),
        data: {
          title: "Feather",
          breadcrumb: "Feather",
        },
      },
      {
        path: "whether",
        loadComponent: () =>
          import("./weather-icon/weather-icon").then((m) => m.WeatherIcon),
        data: {
          title: "Whether",
          breadcrumb: "Whether",
        },
      },
    ],
  },
];
