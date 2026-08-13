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
      import("./pages/mis-recepciones/mis-recepciones.page").then(
        (m) => m.MisRecepcionesPage,
      ),
  },
  { path: "**", redirectTo: "" },
];
