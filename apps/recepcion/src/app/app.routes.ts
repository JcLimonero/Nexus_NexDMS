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
  {
    // Se recibe por orden ya abierta o por cita (`?cita=`), que es como llega
    // desde la agenda cuando todavía no existe la orden.
    path: "recibir",
    canActivate: [authGuard],
    loadComponent: () =>
      import("./pages/recibir/recibir.page").then((m) => m.RecibirPage),
  },
  {
    path: "recibir/:ordenId",
    canActivate: [authGuard],
    loadComponent: () =>
      import("./pages/recibir/recibir.page").then((m) => m.RecibirPage),
  },
  { path: "**", redirectTo: "" },
];
