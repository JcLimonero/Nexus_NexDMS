import { Routes } from "@angular/router";

export const contact: Routes = [
  {
    path: "",
    children: [
      {
        path: "new-user",
        loadComponent: () =>
          import("./new-user/new-user").then((m) => m.NewUser),
        data: {
          title: "New User",
          breadcrumb: "New User",
        },
      },
      {
        path: "contacts",
        loadComponent: () =>
          import("./contacts/contacts").then((m) => m.Contacts),
        data: {
          title: "Contact",
          breadcrumb: "Contact",
        },
      },
      {
        path: "edit-user/:id",
        loadComponent: () =>
          import("./edit-user/edit-user").then((m) => m.EditUser),

        data: {
          title: "Edit User",
          breadcrumb: "Edit User",
        },
      },
    ],
  },
];
