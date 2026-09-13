import { HttpInterceptorFn } from "@angular/common/http";
import { inject } from "@angular/core";
import { catchError, throwError } from "rxjs";
import { AuthService } from "./auth.service";
import { NotificacionService } from "../../shared/services/notificacion.service";

/** Adjunta la llave del portal, cierra sesión en 401 y avisa en errores de red/servidor. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const noti = inject(NotificacionService);
  const token = auth.token();
  const peticion = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(peticion).pipe(
    catchError((error) => {
      const status = error?.status;
      // 401 = la llave venció o dejó de ser válida; no tiene sentido dejar al
      // usuario en una pantalla que no va a poder cargar nada.
      if (status === 401 && !req.url.includes("/auth/login")) {
        auth.salir();
        noti.error("Tu sesión expiró. Vuelve a entrar.");
      } else if (status === 0) {
        // Sin respuesta: red caída o servidor inalcanzable.
        noti.error("Sin conexión con el servidor. Revisa tu red.");
      } else if (status >= 500) {
        noti.error("Ocurrió un error en el servidor. Intenta de nuevo.");
      }
      return throwError(() => error);
    }),
  );
};
