import { randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';

/**
 * Sesión por cookie httpOnly. El token de acceso deja de vivir en localStorage
 * (donde cualquier XSS lo lee) y viaja en una cookie httpOnly que el JS no puede
 * tocar. Como la cookie la manda el navegador sola, se acompaña de un token CSRF
 * de doble envío: una cookie legible que el frontend reenvía por header y el
 * backend compara (ver el middleware CSRF en `main.ts`).
 *
 * En producción el frontend (Vercel) reescribe `/api/*` hacia la API, así que el
 * navegador ve la API como mismo-origen y cada subdominio (app/admin/pwa/
 * recepcion) aísla su propia cookie. Por eso basta `SameSite=Lax` sin `domain`.
 */

/** Cookie httpOnly con el token de acceso (JWT). */
export const ACCESS_COOKIE = 'nex_at';
/** Cookie legible con el token CSRF (patrón double-submit). */
export const CSRF_COOKIE = 'nex_csrf';
/** Header por el que el frontend reenvía el token CSRF. */
export const CSRF_HEADER = 'x-csrf-token';
/**
 * Header con el que un cliente pide NO fijar la cookie de sesión al autenticar.
 * Lo usa el monitor del taller: comparte origen y endpoint con el DMS, pero
 * lleva su propia sesión por Bearer y no debe pisar la cookie del DMS.
 */
export const NO_COOKIE_HEADER = 'x-no-session-cookie';

/** ¿El request pidió explícitamente no fijar la cookie de sesión? */
export function optaPorNoCookie(req: Request): boolean {
  return req.headers?.[NO_COOKIE_HEADER] === '1';
}

const esProd = (): boolean => process.env.NODE_ENV === 'production';

/** Lee una cookie del request sin depender de cookie-parser. */
export function leerCookie(req: Request, nombre: string): string | undefined {
  const raw = req.headers?.cookie;
  if (!raw) return undefined;
  for (const parte of raw.split(';')) {
    const i = parte.indexOf('=');
    if (i === -1) continue;
    if (parte.slice(0, i).trim() === nombre) {
      return decodeURIComponent(parte.slice(i + 1).trim());
    }
  }
  return undefined;
}

/** Vida de la cookie, alineada con la expiración del JWT (`JWT_EXPIRES_IN`). */
function maxAgeMs(): number {
  const v = process.env.JWT_EXPIRES_IN?.trim() || '8h';
  const m = /^(\d+)\s*([smhd])?$/.exec(v);
  if (!m) return 8 * 60 * 60 * 1000;
  const n = parseInt(m[1], 10);
  const factor: Record<string, number> = {
    s: 1_000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  };
  return n * (factor[m[2] ?? 's'] ?? 1_000);
}

/**
 * Guarda el token de acceso en cookie httpOnly y fija la cookie CSRF que la
 * acompaña. Devuelve el token CSRF (por si el llamador quiere exponerlo).
 */
export function ponerCookiesSesion(res: Response, accessToken: string): string {
  const maxAge = maxAgeMs();
  res.cookie(ACCESS_COOKIE, accessToken, {
    httpOnly: true,
    secure: esProd(),
    sameSite: 'lax',
    path: '/',
    maxAge,
  });
  const csrf = randomUUID();
  // La cookie CSRF NO es httpOnly a propósito: el frontend la lee y la reenvía.
  res.cookie(CSRF_COOKIE, csrf, {
    httpOnly: false,
    secure: esProd(),
    sameSite: 'lax',
    path: '/',
    maxAge,
  });
  return csrf;
}

/** Borra las cookies de sesión (logout). */
export function limpiarCookiesSesion(res: Response): void {
  const base = {
    secure: esProd(),
    sameSite: 'lax' as const,
    path: '/',
  };
  res.clearCookie(ACCESS_COOKIE, { ...base, httpOnly: true });
  res.clearCookie(CSRF_COOKIE, { ...base, httpOnly: false });
}
