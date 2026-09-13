import { HttpErrorResponse, HttpInterceptorFn } from "@angular/common/http";
import { inject } from "@angular/core";
import { Router } from "@angular/router";
import { Observable, catchError, switchMap, throwError } from "rxjs";
import { AuthService } from "./auth.service";
import { MonitorAuthService } from "../pages/monitor/monitor-auth.service";
import { BillingStateService } from "../shared/services/billing-state.service";

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

/** Lee una cookie legible (no httpOnly) del documento. */
function leerCookie(nombre: string): string | null {
  const par = document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${nombre}=`));
  return par ? decodeURIComponent(par.slice(nombre.length + 1)) : null;
}

const METODOS_MUTANTES = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * Prepara los encabezados/credenciales de la sesión del DMS (cookie httpOnly):
 * manda la cookie (withCredentials), reenvía el token CSRF en métodos que mutan
 * y, si hay token local (impersonación "entrar como cliente"), lo adjunta por
 * Bearer —que el backend prioriza sobre la cookie—.
 */
function conSesionDms(
  req: import("@angular/common/http").HttpRequest<unknown>,
  auth: AuthService,
) {
  const headers: Record<string, string> = {};
  if (METODOS_MUTANTES.has(req.method.toUpperCase())) {
    const csrf = leerCookie("nex_csrf");
    if (csrf) headers["X-CSRF-Token"] = csrf;
  }
  const impersonacion = auth.getAccessToken();
  if (impersonacion) headers["Authorization"] = `Bearer ${impersonacion}`;
  return req.clone({ withCredentials: true, setHeaders: headers });
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
  const billing = inject(BillingStateService);

  const enMonitor = location.pathname.startsWith("/monitor");
  // Monitor: sesión propia por Bearer (localStorage), sin cookie. DMS: cookie
  // httpOnly (+ CSRF, + Bearer solo en impersonación).
  const conAuth = enMonitor
    ? (() => {
        const token = monitor.token();
        return token
          ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
          : req;
      })()
    : conSesionDms(req, auth);

  return next(conAuth).pipe(
    catchError((err: unknown) => {
      // Bloqueo por falta de pago del SaaS: el backend responde 403 con un
      // código propio. En solo-lectura se avisa y se deja seguir navegando;
      // bloqueado se manda al portal de pago. El monitor queda al margen.
      if (
        err instanceof HttpErrorResponse &&
        err.status === 403 &&
        !enMonitor
      ) {
        const code = err.error?.code;
        if (code === "TENANT_PAYMENT_BLOCKED") {
          billing.marcarDesdeError(err.error);
          if (!router.url.startsWith("/pago")) router.navigate(["/pago"]);
          return throwError(() => err);
        }
        if (code === "TENANT_PAYMENT_READONLY") {
          billing.marcarDesdeError(err.error);
          return throwError(() => err);
        }
      }

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
          // Reintenta con la sesión renovada: la cookie ya viene actualizada del
          // backend (y en impersonación, el Bearer local también).
          return next(conSesionDms(req, auth));
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
