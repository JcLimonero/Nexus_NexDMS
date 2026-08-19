import { Routes } from "@angular/router";

export const User: Routes = [
  {
    path: "",
    children: [
      {
        path: "profile",
        loadComponent: () =>
          import("./users-profile/users-profile").then((m) => m.UsersProfile),
        data: {
          title: "Profile",
          breadcrumb: "Profile",
        },
      },
      {
        path: "edit",
        loadComponent: () =>
          import("./user-edit/user-edit").then((m) => m.UserEdit),
        data: {
          title: "Edit",
          breadcrumb: "Edit",
        },
      },
      {
        path: "cards",
        loadComponent: () =>
          import("./user-cards/user-cards").then((m) => m.UserCards),
        data: {
          title: "Cards",
          breadcrumb: "Cards",
        },
      },
    ],
  },
];
