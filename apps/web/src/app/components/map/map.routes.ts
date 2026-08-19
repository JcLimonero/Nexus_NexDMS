import { Routes } from "@angular/router";

export const map: Routes = [
  {
    path: "",
    children: [
      {
        path: "google",
        loadComponent: () =>
          import("./google-map/google-map").then((m) => m.GoogleMaps),
        data: {
          title: "Google-Map",
          breadcrumb: "Google-Map",
        },
      },
      {
        path: "leaflet",
        loadComponent: () =>
          import("./leaflet-map/leaflet-map").then((m) => m.LeafletMap),
        data: {
          title: "Leaflet-Map",
          breadcrumb: "Leaflet-Map",
        },
      },
    ],
  },
];
