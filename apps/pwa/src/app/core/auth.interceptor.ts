import { HttpInterceptorFn } from "@angular/common/http";
import { inject } from "@angular/core";
import { Router } from "@angular/router";
import { catchError, throwError } from "rxjs";
import { AuthService } from "./auth.service";

/** Lee una cookie legible (no httpOnly) del documento. */
function leerCookie(nombre: string): string | null {
  const par = document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${nombre}=`));
  return par ? decodeURIComponent(par.slice(nombre.length + 1)) : null;
}

const METODOS_MUTANTES = new Set(["POST", "PUT", "PATCH", "DELETE"]);

// La sesión viaja en cookie httpOnly: withCredentials para mandarla y, en
// métodos que mutan, el token CSRF (cookie nex_csrf → header X-CSRF-Token).
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const headers: Record<string, string> = {};
  if (METODOS_MUTANTES.has(req.method.toUpperCase())) {
    const csrf = leerCookie("nex_csrf");
    if (csrf) headers["X-CSRF-Token"] = csrf;
  }
  const cloned = req.clone({ withCredentials: true, setHeaders: headers });

  return next(cloned).pipe(
    catchError((err) => {
      if (err?.status === 401 && !req.url.includes("/auth/login")) {
        auth.logout();
        router.navigate(["/login"]);
      }
      return throwError(() => err);
    }),
  );
};
