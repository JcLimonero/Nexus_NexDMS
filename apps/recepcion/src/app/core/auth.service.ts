import { Injectable, inject, signal } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Router } from "@angular/router";
import { Observable, tap } from "rxjs";
import { BrandingService } from "./branding.service";

// El token vive en cookie httpOnly (a prueba de XSS), no en localStorage.
// Aquí solo se guarda el perfil (dato no sensible) para saber quién entró.
const STORAGE_USER = "nexdms_recepcion_user";

export interface PwaUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  roles: string[];
}

interface LoginResponse {
  accessToken: string;
  branding?: import("./branding.service").Branding;
  refreshToken: string;
  user: PwaUser;
}

@Injectable({ providedIn: "root" })
export class AuthService {
  private http = inject(HttpClient);
  private branding = inject(BrandingService);
  private router = inject(Router);

  user = signal<PwaUser | null>(this.readUser());

  private readUser(): PwaUser | null {
    try {
      const raw = localStorage.getItem(STORAGE_USER);
      return raw ? (JSON.parse(raw) as PwaUser) : null;
    } catch {
      return null;
    }
  }

  get isLoggedIn(): boolean {
    return !!this.user();
  }

  login(
    email: string,
    password: string,
    tenantId?: string,
  ): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>("/api/v1/auth/login", {
        email,
        password,
        tenantId,
      })
      .pipe(
        tap((res) => {
          // El token lo fija el backend como cookie httpOnly; aquí solo el perfil.
          localStorage.setItem(STORAGE_USER, JSON.stringify(res.user));
          this.user.set(res.user);
          this.branding.establecer(res.branding);
        }),
      );
  }

  /** Marca pública del cliente (por su slug) para vestir y acotar el acceso. */
  brandingPublica(slug: string): Observable<
    import("./branding.service").Branding & { id: string; nombre?: string }
  > {
    return this.http.get<
      import("./branding.service").Branding & { id: string; nombre?: string }
    >(`/api/v1/auth/branding/${slug}`);
  }

  /** Usuarios de demostración del cliente, para el panel de acceso. */
  demoUsers(
    slug: string,
  ): Observable<{ email: string; nombre: string; roles: string[] }[]> {
    return this.http.get<
      { email: string; nombre: string; roles: string[] }[]
    >(`/api/v1/auth/demo-users/${slug}`);
  }

  logout(): void {
    // Solo el backend puede borrar la cookie httpOnly; se pide y pase lo que
    // pase se limpia el estado local y se manda al login (sin redirigir, limpiar
    // la sesión no se nota y parece que el botón no hace nada).
    const cerrar = () => {
      localStorage.removeItem(STORAGE_USER);
      this.user.set(null);
      void this.router.navigate(["/login"]);
    };
    this.http.post("/api/v1/auth/logout", {}).subscribe({
      next: cerrar,
      error: cerrar,
    });
  }
}
