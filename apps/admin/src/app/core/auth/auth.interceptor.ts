import { HttpInterceptorFn } from "@angular/common/http";
import { inject } from "@angular/core";
import { catchError, throwError } from "rxjs";
import { AuthService } from "./auth.service";

/** Adjunta la llave del portal y cierra la sesión si el backend la rechaza. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.token();
  const peticion = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(peticion).pipe(
    catchError((error) => {
      // 401 = la llave venció o dejó de ser válida; no tiene sentido dejar al
      // usuario en una pantalla que no va a poder cargar nada.
      if (error?.status === 401 && !req.url.includes("/auth/login")) {
        auth.salir();
      }
      return throwError(() => error);
    }),
  );
};
