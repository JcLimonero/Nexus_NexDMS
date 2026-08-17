import { Injectable } from "@angular/core";

/**
 * Cliente en la ruta: `…/<slug>/…`.
 *
 * El primer segmento de la URL identifica al cliente y se vuelve la raíz de la
 * app (vía `APP_BASE_HREF`), así el slug se mantiene en cada pantalla sin tocar
 * rutas ni `routerLink`. Compatible hacia atrás: si el primer segmento es una
 * ruta conocida (no un cliente), no hay prefijo y todo funciona como antes.
 *
 * ⚠️ Portado del DMS (`apps/web/.../shared/tenant/tenant-context.ts`). Las apps
 * son proyectos separados; un cambio aquí hay que llevarlo también allá.
 */
const RESERVADOS = new Set([
  "login",
  "orden",
  "assets",
  "api",
]);

/** El slug del cliente en la URL actual, o null si se entró sin prefijo. */
export function slugDeLaUrl(): string | null {
  const path =
    typeof window !== "undefined" ? window.location.pathname : "/";
  const primero = path.split("/").filter(Boolean)[0];
  if (!primero || RESERVADOS.has(primero)) return null;
  return primero;
}

/** Base de la app: `/<slug>/` cuando hay cliente en la ruta, si no `/`. */
export function baseHrefDeTenant(): string {
  const slug = slugDeLaUrl();
  return slug ? `/${slug}/` : "/";
}

@Injectable({ providedIn: "root" })
export class TenantContext {
  readonly slug = slugDeLaUrl();
}
