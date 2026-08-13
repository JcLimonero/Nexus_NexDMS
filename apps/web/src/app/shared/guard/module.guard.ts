import { inject } from "@angular/core";
import { CanActivateFn, Router } from "@angular/router";
import { map, of } from "rxjs";
import { ModulesService } from "../services/modules.service";

/**
 * Bloquea rutas de módulos que el tenant no tiene licenciados.
 *
 * Ocultar el módulo del menú no basta: sin este guard, escribir la URL a
 * mano abriría la pantalla (y solo fallarían las llamadas a la API).
 * La clave del módulo se declara en `data.module` de la ruta.
 */
export const moduleGuard: CanActivateFn = (route) => {
  const modules = inject(ModulesService);
  const router = inject(Router);

  // Se busca en la rama de rutas, para que sirva en rutas hijas
  let key: string | undefined;
  let r: typeof route | null = route;
  while (r && !key) {
    key = r.data?.["module"] as string | undefined;
    r = r.parent as typeof route | null;
  }
  if (!key) return true;

  const decide = () => {
    if (modules.has(key!)) return true;
    return router.createUrlTree(["/sin-acceso"], {
      queryParams: { modulo: key },
    });
  };

  // Si aún no se cargaron los módulos (entrada directa por URL), se espera
  return modules.modules().length
    ? of(decide()).pipe(map((v) => v))
    : modules.load().pipe(map(() => decide()));
};
