import { HttpInterceptorFn } from "@angular/common/http";
import { inject } from "@angular/core";
import { AuthService } from "./auth.service";
import { MonitorAuthService } from "../pages/monitor/monitor-auth.service";

/**
 * Elige con qué sesión va cada petición.
 *
 * Las pantallas del taller tienen cuenta propia y viven en el mismo origen
 * que el DMS, así que en el mismo navegador pueden convivir dos sesiones. Se
 * distingue por la ruta abierta: mientras se está en `/monitor`, quien pide
 * los datos es la pantalla, no la persona.
 *
 * Sin esto, un monitor colgado en la nave dejaría de funcionar en cuanto
 * alguien cerrara sesión en ese equipo.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const monitor = inject(MonitorAuthService);

  const enMonitor = location.pathname.startsWith("/monitor");
  const token = enMonitor ? monitor.token() : auth.getAccessToken();

  if (token) {
    req = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    });
  }
  return next(req);
};
