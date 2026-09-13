import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Router } from "@angular/router";
import { BrandingService } from "../shared/services/branding.service";
import { Observable, tap, map, catchError, of } from "rxjs";

const API_URL = "/api/v1/auth";
const STORAGE_ACCESS = "nexdms_accessToken";
const STORAGE_REFRESH = "nexdms_refreshToken";
const STORAGE_USER = "nexdms_user";

export interface LoginRequest {
  email: string;
  password: string;
  tenantId?: string;
  totpCode?: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    roles: string[];
    scope?: string;
  };
  branding?: import("../shared/services/branding.service").Branding;
}

export interface TotpRequiredResponse {
  requiresTotp: true;
  message: string;
}

export interface AuthUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  roles: string[];
  scope?: string;
}

@Injectable({
  providedIn: "root",
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private branding = inject(BrandingService);

  login(dto: LoginRequest): Observable<LoginResponse | TotpRequiredResponse> {
    return this.http
      .post<LoginResponse | TotpRequiredResponse>(`${API_URL}/login`, dto)
      .pipe(
        tap((res) => {
          if ("accessToken" in res) {
            this.setSession(res);
            // El backend manda la marca ya resuelta en el login; se aplica de
            // una vez para no entrar al DMS con los colores de fábrica.
            this.branding.establecer(res.branding);
          }
        }),
      );
  }

  /** Solicita el correo de recuperación de contraseña. */
  forgotPassword(email: string, tenantId?: string): Observable<{ ok: true }> {
    return this.http.post<{ ok: true }>(`${API_URL}/forgot-password`, {
      email,
      tenantId,
    });
  }

  /** Fija la nueva contraseña con el token del correo. */
  resetPassword(token: string, newPassword: string): Observable<{ ok: true }> {
    return this.http.post<{ ok: true }>(`${API_URL}/reset-password`, {
      token,
      newPassword,
    });
  }

  /** Usuarios de demostración del cliente (por slug), para el panel de acceso. */
  demoUsersPorSlug(
    slug: string,
  ): Observable<{ email: string; nombre: string; roles: string[] }[]> {
    return this.http.get<
      { email: string; nombre: string; roles: string[] }[]
    >(`${API_URL}/demo-users/${slug}`);
  }

  /**
   * Marca pública de un cliente por su slug, para vestir y acotar el acceso
   * cuando se entra por su liga (`/<slug>/…`). Incluye el id del cliente.
   */
  brandingPorSlug(
    slug: string,
  ): Observable<LoginResponse["branding"] & { id: string }> {
    return this.http.get<LoginResponse["branding"] & { id: string }>(
      `${API_URL}/branding/${slug}`,
    );
  }

  /**
   * Entra con una sesión ya emitida (handoff desde el portal de superadmin):
   * guarda los tokens, resuelve el usuario y su marca con /me, y deja la sesión
   * lista. Devuelve si logró establecerla.
   */
  entrarConToken(
    accessToken: string,
    refreshToken: string,
  ): Observable<boolean> {
    localStorage.setItem(STORAGE_ACCESS, accessToken);
    if (refreshToken) localStorage.setItem(STORAGE_REFRESH, refreshToken);
    return this.http.get<AuthUser & { branding?: LoginResponse["branding"] }>(
      `${API_URL}/me`,
    ).pipe(
      tap((me) => {
        localStorage.setItem(
          STORAGE_USER,
          JSON.stringify({
            id: me.id,
            firstName: me.firstName,
            lastName: me.lastName,
            email: me.email,
            roles: me.roles,
            scope: me.scope,
          }),
        );
        this.branding.establecer(me.branding);
      }),
      map(() => true),
      catchError(() => {
        localStorage.removeItem(STORAGE_ACCESS);
        localStorage.removeItem(STORAGE_REFRESH);
        return of(false);
      }),
    );
  }

  logout(): void {
    // La sesión va por cookie httpOnly; el interceptor adjunta credenciales y
    // CSRF, así que basta pegarle a /logout para que el backend la borre. (En
    // impersonación, donde la sesión va por Bearer local, el interceptor también
    // adjunta ese token.)
    this.http.post(`${API_URL}/logout`, {}).subscribe({ error: () => {} });
    this.clearSession();
    this.branding.limpiar();
    this.router.navigate(["/auth/login"]);
  }

  refresh(): Observable<{ accessToken: string } | null> {
    const refreshToken = localStorage.getItem(STORAGE_REFRESH);
    if (!refreshToken) return of(null);
    return this.http
      .post<{ accessToken: string }>(`${API_URL}/refresh`, { refreshToken })
      .pipe(
        tap((res) => {
          // La sesión normal ya recibió la cookie nueva del backend; solo la
          // sesión por Bearer (impersonación) necesita refrescar el token local.
          if (localStorage.getItem(STORAGE_ACCESS)) {
            localStorage.setItem(STORAGE_ACCESS, res.accessToken);
          }
        }),
        catchError(() => {
          this.clearSession();
          return of(null);
        }),
      );
  }

  /** Token local; solo existe en sesiones por Bearer (impersonación). */
  getAccessToken(): string | null {
    return localStorage.getItem(STORAGE_ACCESS);
  }

  getUser(): AuthUser | null {
    const raw = localStorage.getItem(STORAGE_USER);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AuthUser;
    } catch {
      return null;
    }
  }

  isAuthenticated(): boolean {
    // La sesión normal ya no guarda el token (vive en cookie httpOnly); se sabe
    // que hay sesión por el perfil guardado. En impersonación además hay token.
    return !!this.getUser();
  }

  private setSession(res: LoginResponse): void {
    // El token de acceso lo fija el backend como cookie httpOnly (a prueba de
    // XSS); aquí solo el refresh (para renovar sesión) y el perfil.
    localStorage.setItem(STORAGE_REFRESH, res.refreshToken);
    localStorage.setItem(STORAGE_USER, JSON.stringify(res.user));
  }

  /**
   * Limpia la sesión local y la marca sin llamar al backend. Se usa cuando la
   * sesión ya venció (401 irrecuperable): no tiene caso pegarle a /logout con
   * un token muerto, solo hay que dejar todo limpio antes de ir al login.
   */
  limpiarSesion(): void {
    this.clearSession();
    this.branding.limpiar();
  }

  private clearSession(): void {
    localStorage.removeItem(STORAGE_ACCESS);
    localStorage.removeItem(STORAGE_REFRESH);
    localStorage.removeItem(STORAGE_USER);
  }
}
