import { Routes } from "@angular/router";

export const base: Routes = [
  {
    path: "",
    children: [
      {
        path: "accordion",
        loadComponent: () =>
          import("./accordion/accordion").then((m) => m.Accordion),
        data: {
          title: "Accordion",
          breadcrumb: "Accordion",
        },
      },
      {
        path: "alert",
        loadComponent: () => import("./alert/alert").then((m) => m.Alert),
        data: {
          title: "Alert",
          breadcrumb: "Alert",
        },
      },
      {
        path: "buttons",
        loadComponent: () => import("./buttons/buttons").then((m) => m.Buttons),
        data: {
          title: "Buttons",
          breadcrumb: "Buttons",
        },
      },
      {
        path: "carousel",
        loadComponent: () =>
          import("./carousel/carousel").then((m) => m.Carousel),
        data: {
          title: "Carousel",
          breadcrumb: "Carousel",
        },
      },
      {
        path: "collapse",
        loadComponent: () =>
          import("./collapse/collapse").then((m) => m.Collapse),
        data: {
          title: "Collapse",
          breadcrumb: "Collapse",
        },
      },
      {
        path: "datepicker",
        loadComponent: () =>
          import("./datepicker/datepicker").then((m) => m.Datepicker),
        data: {
          title: "Datepicker",
          breadcrumb: "Datepicker",
        },
      },
      {
        path: "dropdown",
        loadComponent: () =>
          import("./dropdown/dropdown").then((m) => m.Dropdown),
        data: {
          title: "Dropdown",
          breadcrumb: "Dropdown",
        },
      },
      {
        path: "modal",
        loadComponent: () => import("./modal/modal").then((m) => m.Modal),
        data: {
          title: "Modal",
          breadcrumb: "Modal",
        },
      },
      {
        path: "pagination",
        loadComponent: () =>
          import("./pagination/pagination").then((m) => m.Pagination),
        data: {
          title: "Pagination",
          breadcrumb: "Pagination",
        },
      },
      {
        path: "popover",
        loadComponent: () => import("./popover/popover").then((m) => m.Popover),
        data: {
          title: "Popover",
          breadcrumb: "Popover",
        },
      },
      {
        path: "progressbar",
        loadComponent: () =>
          import("./progressbar/progressbar").then((m) => m.Progressbar),
        data: {
          title: "Progressbar",
          breadcrumb: "Progressbar",
        },
      },
      {
        path: "rating",
        loadComponent: () => import("./rating/rating").then((m) => m.Rating),
        data: {
          title: "Rating",
          breadcrumb: "Rating",
        },
      },
      {
        path: "tabset",
        loadComponent: () => import("./tabset/tabset").then((m) => m.Tabset),
        data: {
          title: "Tabset",
          breadcrumb: "Tabset",
        },
      },
      {
        path: "timepicker",
        loadComponent: () =>
          import("./timepicker/timepicker").then((m) => m.Timepicker),
        data: {
          title: "TimePicker",
          breadcrumb: "TimePicker",
        },
      },
      {
        path: "tooltip",
        loadComponent: () => import("./tooltip/tooltip").then((m) => m.Tooltip),
        data: {
          title: "Tooltip",
          breadcrumb: "Tooltip",
        },
      },
      {
        path: "typeahead",
        loadComponent: () =>
          import("./typeahead/typeahead").then((m) => m.Typeahead),
        data: {
          title: "Typeahead",
          breadcrumb: "Typeahead",
        },
      },
    ],
  },
];
