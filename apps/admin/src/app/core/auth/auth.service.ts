import { Injectable, computed, inject, signal } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Router } from "@angular/router";
import { Observable, tap } from "rxjs";

// El token ya NO se guarda en localStorage: vive en una cookie httpOnly que el
// JS no puede leer (a prueba de XSS). Aquí solo se conserva el perfil del
// usuario (dato no sensible) para saber quién entró tras recargar; la sesión la
// respalda la cookie, que el navegador manda sola.
const USUARIO = "nexdms_admin_user";

export interface AdminUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  roles: string[];
}

interface RespuestaLogin {
  accessToken: string;
  refreshToken: string;
  user: AdminUser;
}

/**
 * Sesión del portal de administración.
 *
 * La sesión vive en una cookie httpOnly propia de este subdominio (admin.), así
 * que es independiente de la del DMS: quien administra el SaaS puede tener
 * también cuenta de operación sin que una cierre la otra.
 */
@Injectable({ providedIn: "root" })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  readonly usuario = signal<AdminUser | null>(this.leerUsuario());
  readonly autenticado = computed(() => !!this.usuario());

  private leerUsuario(): AdminUser | null {
    const crudo = localStorage.getItem(USUARIO);
    if (!crudo) return null;
    try {
      return JSON.parse(crudo) as AdminUser;
    } catch {
      // Si quedó basura de una versión anterior, se descarta en vez de
      // arrastrar una sesión ilegible.
      localStorage.removeItem(USUARIO);
      return null;
    }
  }

  login(email: string, password: string): Observable<RespuestaLogin> {
    return this.http
      .post<RespuestaLogin>("/api/v1/admin-auth/login", { email, password })
      .pipe(
        tap((r) => {
          // El token lo fija el backend como cookie httpOnly; aquí solo el perfil.
          localStorage.setItem(USUARIO, JSON.stringify(r.user));
          this.usuario.set(r.user);
        }),
      );
  }

  forgotPassword(email: string): Observable<{ ok: true }> {
    return this.http.post<{ ok: true }>(
      "/api/v1/admin-auth/forgot-password",
      { email },
    );
  }

  resetPassword(token: string, newPassword: string): Observable<{ ok: true }> {
    return this.http.post<{ ok: true }>(
      "/api/v1/admin-auth/reset-password",
      { token, newPassword },
    );
  }

  /** Este portal es solo para quien administra el SaaS. */
  esSuperadmin(): boolean {
    return this.usuario()?.roles?.includes("SUPERADMIN") ?? false;
  }

  salir(): void {
    // Solo el backend puede borrar la cookie httpOnly; se pide y pase lo que
    // pase se limpia el estado local y se manda al acceso.
    const cerrar = () => {
      localStorage.removeItem(USUARIO);
      this.usuario.set(null);
      void this.router.navigate(["/acceso"]);
    };
    this.http.post("/api/v1/admin-auth/logout", {}).subscribe({
      next: cerrar,
      error: cerrar,
    });
  }
}
