import { Routes } from "@angular/router";

export const knowledgebase: Routes = [
  {
    path: "",
    loadComponent: () =>
      import("./knowledge-base").then((m) => m.KnowledgeBase),
    data: {
      title: "Knowledge Base",
      breadcrumb: "",
    },
  },
];
