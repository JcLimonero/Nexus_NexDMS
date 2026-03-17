import { Routes } from "@angular/router";

export const supportTicket: Routes = [
  {
    path: "",
    loadComponent: () =>
      import("./support-ticket").then((m) => m.SupportTicket),
    data: {
      title: "Support Ticket",
      breadcrumb: "",
    },
  },
];
