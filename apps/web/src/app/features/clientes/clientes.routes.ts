import { Routes } from "@angular/router";

export const clientsRoutes: Routes = [
  {
    path: "",
    loadComponent: () =>
      import("./list/clientes-list").then((m) => m.ClientesList),
    data: { title: "Clientes", breadcrumb: "Clientes" },
  },
  {
    // Antes que `:id`, o la ruta se comería "relaciones" como si fuera un id.
    path: "relaciones",
    loadComponent: () =>
      import("./relaciones/relaciones").then((m) => m.Relaciones),
    data: {
      title: "Clientes, vehículos y servicios",
      breadcrumb: "Relaciones",
    },
  },
  {
    path: "nuevo",
    loadComponent: () =>
      import("./form/cliente-form").then((m) => m.ClienteForm),
    data: { title: "Nuevo cliente", breadcrumb: "Nuevo" },
  },
  {
    path: ":id",
    children: [
      {
        path: "",
        loadComponent: () =>
          import("./detail/cliente-detail").then((m) => m.ClienteDetail),
        data: { title: "Detalle cliente", breadcrumb: "Detalle" },
      },
      {
        path: "editar",
        loadComponent: () =>
          import("./form/cliente-form").then((m) => m.ClienteForm),
        data: { title: "Editar cliente", breadcrumb: "Editar" },
      },
      {
        path: "contacts",
        loadComponent: () =>
          import("./contactos/list/contactos-list").then((m) => m.ContactosList),
        data: { title: "Contactos", breadcrumb: "Contactos" },
      },
      {
        path: "contacts/nuevo",
        loadComponent: () =>
          import("./contactos/form/contacto-form").then((m) => m.ContactoForm),
        data: { title: "Nuevo contacto", breadcrumb: "Nuevo" },
      },
      {
        path: "contacts/:contactId",
        loadComponent: () =>
          import("./contactos/detail/contacto-detail").then((m) => m.ContactoDetail),
        data: { title: "Detalle contacto", breadcrumb: "Detalle" },
      },
      {
        path: "contacts/:contactId/editar",
        loadComponent: () =>
          import("./contactos/form/contacto-form").then((m) => m.ContactoForm),
        data: { title: "Editar contacto", breadcrumb: "Editar" },
      },
    ],
  },
];

