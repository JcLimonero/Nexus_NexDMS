import { Routes } from "@angular/router";

export const contactosRoutes: Routes = [
  {
    path: "",
    loadComponent: () =>
      import("./landing/contactos-landing").then((m) => m.ContactosLanding),
    data: { title: "Contactos", breadcrumb: "Contactos" },
  },
];
