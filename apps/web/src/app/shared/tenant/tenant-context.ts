import { Injectable } from "@angular/core";

/**
 * Cliente en la ruta: `nex-dms.com/<slug>/…`.
 *
 * El primer segmento de la URL identifica al cliente y se vuelve la raíz de la
 * app (vía `APP_BASE_HREF`), así el slug se mantiene en cada pantalla sin tocar
 * las rutas ni los `routerLink`, que siguen siendo absolutos.
 *
 * Es compatible hacia atrás: si el primer segmento es una ruta conocida de la
 * app (no un cliente), no hay prefijo y todo funciona como antes. Por eso un
 * slug de cliente no puede coincidir con estas palabras reservadas.
 */
const RESERVADOS = new Set([
  "dashboard",
  "auth",
  "sso",
  "monitor",
  "portal",
  "recepcion",
  "reception",
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
  /** Slug del cliente de esta sesión de navegador (fijo desde el arranque). */
  readonly slug = slugDeLaUrl();
}
