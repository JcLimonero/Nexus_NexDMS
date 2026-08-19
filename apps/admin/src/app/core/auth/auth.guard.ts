import { inject } from "@angular/core";
import { CanActivateFn, Router } from "@angular/router";
import { AuthService } from "./auth.service";

/** Sin sesión de superadmin no se entra al portal. */
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.autenticado() && auth.esSuperadmin()) return true;
  return router.createUrlTree(["/acceso"]);
};
