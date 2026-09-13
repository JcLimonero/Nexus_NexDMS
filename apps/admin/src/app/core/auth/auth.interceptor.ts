import { HttpInterceptorFn } from "@angular/common/http";
import { inject } from "@angular/core";
import { catchError, throwError } from "rxjs";
import { AuthService } from "./auth.service";
import { NotificacionService } from "../../shared/services/notificacion.service";

/** Lee una cookie legible (no httpOnly) del documento. */
function leerCookie(nombre: string): string | null {
  const par = document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${nombre}=`));
  return par ? decodeURIComponent(par.slice(nombre.length + 1)) : null;
}

const METODOS_MUTANTES = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * La sesión viaja en cookie httpOnly, así que:
 * - `withCredentials` para que el navegador mande la cookie en cada petición;
 * - en métodos que mutan se reenvía el token CSRF (cookie legible → header).
 * Además cierra sesión en 401 y avisa en errores de red/servidor.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const noti = inject(NotificacionService);

  const headers: Record<string, string> = {};
  if (METODOS_MUTANTES.has(req.method.toUpperCase())) {
    const csrf = leerCookie("nex_csrf");
    if (csrf) headers["X-CSRF-Token"] = csrf;
  }
  const peticion = req.clone({ withCredentials: true, setHeaders: headers });

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
