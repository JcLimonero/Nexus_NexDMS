import { inject } from "@angular/core";
import { CanActivateFn, Router } from "@angular/router";

import { MonitorAuthService } from "./monitor-auth.service";

/**
 * Quién puede mirar cada pantalla.
 *
 * El tablero del taller es de quien trabaja en él y la agenda del día de
 * quien recibe: un técnico no entra al monitor de citas ni un asesor al del
 * taller. Los mandos entran a las dos porque supervisan ambas.
 *
 * El corte de verdad está en la API —cada pantalla tiene su endpoint con sus
 * roles—; esto evita el paso inútil de cargar una pantalla que va a
 * responder 403 y permite decir por qué.
 */
const PERMITIDOS: Record<string, string[]> = {
  "/monitor/taller": ["SUPERADMIN", "ADMIN", "MANAGER", "MECHANIC"],
  "/monitor/citas": [
    "SUPERADMIN",
    "ADMIN",
    "MANAGER",
    "CASHIER",
    "RECEPTIONIST",
  ],
};

export const monitorGuard: CanActivateFn = (_ruta, estado) => {
  const auth = inject(MonitorAuthService);
  const router = inject(Router);

  const destino = estado.url.split("?")[0];
  const permitidos = PERMITIDOS[destino] ?? [];

  if (!auth.autenticado()) {
    // Se recuerda cuál de las dos pantallas se pedía —con su sucursal— para
    // volver ahí tras entrar y no obligar a navegar de nuevo.
    router.navigate(["/monitor/acceso"], {
      queryParams: { returnUrl: estado.url },
    });
    return false;
  }

  const roles = auth.usuario()?.roles ?? [];
  if (permitidos.some((r) => roles.includes(r))) return true;

  // La sesión se cierra: dejarla abierta manda de vuelta al acceso con la
  // misma cuenta que acaba de ser rechazada, y se entra en bucle.
  auth.salirPorRol();
  router.navigate(["/monitor/acceso"], {
    queryParams: { returnUrl: estado.url, motivo: "rol" },
  });
  return false;
};
