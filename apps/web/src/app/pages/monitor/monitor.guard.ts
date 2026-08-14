import { inject } from "@angular/core";
import { CanActivateFn, Router } from "@angular/router";

import { MonitorAuthService } from "./monitor-auth.service";

/**
 * Sesión propia del monitor.
 *
 * No vale la del DMS: la pantalla del taller tiene su cuenta y su acceso, y
 * mezclarlas haría que cerrar sesión en el equipo apagara el monitor.
 */
export const monitorGuard: CanActivateFn = (_ruta, estado) => {
  const auth = inject(MonitorAuthService);
  const router = inject(Router);
  if (auth.autenticado()) return true;
  // Se recuerda cuál de las dos pantallas se pedía —con su sucursal— para
  // volver ahí tras entrar y no obligar a navegar de nuevo.
  router.navigate(["/monitor/acceso"], {
    queryParams: { returnUrl: estado.url },
  });
  return false;
};
