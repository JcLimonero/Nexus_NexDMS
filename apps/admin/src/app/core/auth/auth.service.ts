import { Injectable, computed, inject, signal } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Router } from "@angular/router";
import { Observable, tap } from "rxjs";

const TOKEN = "nexdms_admin_token";
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
 * La llave se guarda aparte de la del DMS a propósito: son dos aplicaciones
 * distintas y quien administra el SaaS suele tener también una cuenta de
 * operación. Compartir la llave haría que entrar en una cerrara la otra.
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

  token(): string | null {
    return localStorage.getItem(TOKEN);
  }

  login(email: string, password: string): Observable<RespuestaLogin> {
    return this.http
      .post<RespuestaLogin>("/api/v1/admin-auth/login", { email, password })
      .pipe(
        tap((r) => {
          localStorage.setItem(TOKEN, r.accessToken);
          localStorage.setItem(USUARIO, JSON.stringify(r.user));
          this.usuario.set(r.user);
        }),
      );
  }

  /** Este portal es solo para quien administra el SaaS. */
  esSuperadmin(): boolean {
    return this.usuario()?.roles?.includes("SUPERADMIN") ?? false;
  }

  salir(): void {
    localStorage.removeItem(TOKEN);
    localStorage.removeItem(USUARIO);
    this.usuario.set(null);
    void this.router.navigate(["/acceso"]);
  }
}
