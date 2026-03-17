import { Routes } from "@angular/router";

export const Faq: Routes = [
  {
    path: "",
    loadComponent: () => import("./faq").then((m) => m.Faqs),
    data: {
      title: "FAQ",
      breadcrumb: "FAQ",
    },
  },
];
