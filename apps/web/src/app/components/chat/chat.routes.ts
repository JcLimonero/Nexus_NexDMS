import { Routes } from "@angular/router";

export const chat: Routes = [
  {
    path: "",
    loadComponent: () => import("./chat/chat").then((m) => m.Chat),
    data: {
      title: "Chat",
      breadcrumb: "",
    },
  },
];
