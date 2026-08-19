import { HttpErrorResponse, HttpInterceptorFn } from "@angular/common/http";
import { inject } from "@angular/core";
import { Router } from "@angular/router";
import { Observable, catchError, switchMap, throwError } from "rxjs";
import { AuthService } from "./auth.service";
import { MonitorAuthService } from "../pages/monitor/monitor-auth.service";

/** Renovación en curso, compartida para que varios 401 simultáneos no
 * disparen múltiples refresh a la vez. */
let refreshEnCurso: Observable<{ accessToken: string } | null> | null = null;

/** Peticiones donde un 401 NO debe intentar renovar ni redirigir: son las de
 * la propia sesión (evita bucles). */
function esRutaDeSesion(url: string): boolean {
  return (
    url.includes("/auth/login") ||
    url.includes("/auth/refresh") ||
    url.includes("/auth/logout")
  );
}

/**
 * Elige con qué sesión va cada petición y reacciona cuando la sesión venció.
 *
 * Las pantallas del taller tienen cuenta propia y viven en el mismo origen
 * que el DMS, así que en el mismo navegador pueden convivir dos sesiones. Se
 * distingue por la ruta abierta: mientras se está en `/monitor`, quien pide
 * los datos es la pantalla, no la persona.
 *
 * Sin esto, un monitor colgado en la nave dejaría de funcionar en cuanto
 * alguien cerrara sesión en ese equipo.
 *
 * Ante un 401 (token vencido) intenta renovar una sola vez con el refresh
 * token y reintenta la petición; si tampoco se puede renovar, cierra la
 * sesión y manda al login para no dejar la pantalla en "Unauthorized".
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const monitor = inject(MonitorAuthService);
  const router = inject(Router);

  const enMonitor = location.pathname.startsWith("/monitor");
  const token = enMonitor ? monitor.token() : auth.getAccessToken();

  const conAuth = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(conAuth).pipe(
    catchError((err: unknown) => {
      const es401 =
        err instanceof HttpErrorResponse && err.status === 401;

      // No tocamos el flujo del monitor ni las propias rutas de sesión.
      if (!es401 || enMonitor || esRutaDeSesion(req.url)) {
        return throwError(() => err);
      }

      // Sin refresh token no hay nada que renovar: al login directo.
      if (!localStorage.getItem("nexdms_refreshToken")) {
        cerrarYaAlLogin(auth, router);
        return throwError(() => err);
      }

      if (!refreshEnCurso) {
        refreshEnCurso = auth.refresh();
      }

      return refreshEnCurso.pipe(
        switchMap((res) => {
          refreshEnCurso = null;
          if (!res?.accessToken) {
            cerrarYaAlLogin(auth, router);
            return throwError(() => err);
          }
          // Reintenta la petición original con el token nuevo.
          const reintento = req.clone({
            setHeaders: { Authorization: `Bearer ${res.accessToken}` },
          });
          return next(reintento);
        }),
        catchError((e) => {
          refreshEnCurso = null;
          cerrarYaAlLogin(auth, router);
          return throwError(() => e);
        }),
      );
    }),
  );
};

/** Limpia la sesión vencida y lleva al login conservando a dónde iba. */
function cerrarYaAlLogin(auth: AuthService, router: Router): void {
  if (router.url.startsWith("/auth/login")) return;
  auth.limpiarSesion();
  router.navigate(["/auth/login"], {
    queryParams: { returnUrl: router.url },
  });
}
