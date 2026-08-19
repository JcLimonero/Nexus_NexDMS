import { Routes } from "@angular/router";
import { authGuard } from "./core/auth.guard";

export const routes: Routes = [
  {
    path: "login",
    loadComponent: () =>
      import("./pages/login/login.page").then((m) => m.LoginPage),
  },
  {
    path: "",
    canActivate: [authGuard],
    loadComponent: () =>
      import("./pages/mi-dia/mi-dia.page").then((m) => m.MiDiaPage),
  },
  {
    path: "orden/:id",
    canActivate: [authGuard],
    loadComponent: () =>
      import("./pages/orden/orden.page").then((m) => m.OrdenPage),
  },
  { path: "**", redirectTo: "" },
];
