import { Routes } from "@angular/router";

export const searchResult: Routes = [
  {
    path: "",
    loadComponent: () => import("./search-result").then((m) => m.SearchResult),
    data: {
      title: "Search Result",
      breadcrumb: "",
    },
  },
];
