import { Injectable, inject, signal } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable, tap } from "rxjs";
import { BrandingService } from "./branding.service";

const STORAGE_TOKEN = "nexdms_pwa_token";
const STORAGE_USER = "nexdms_pwa_user";

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

  user = signal<PwaUser | null>(this.readUser());

  private readUser(): PwaUser | null {
    try {
      const raw = localStorage.getItem(STORAGE_USER);
      return raw ? (JSON.parse(raw) as PwaUser) : null;
    } catch {
      return null;
    }
  }

  get token(): string | null {
    return localStorage.getItem(STORAGE_TOKEN);
  }

  get isLoggedIn(): boolean {
    return !!this.token;
  }

  login(
    email: string,
    password: string,
    tenantId?: string,
  ): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>("/api/v1/auth/login", { email, password, tenantId })
      .pipe(
        tap((res) => {
          localStorage.setItem(STORAGE_TOKEN, res.accessToken);
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
    localStorage.removeItem(STORAGE_TOKEN);
    localStorage.removeItem(STORAGE_USER);
    this.user.set(null);
  }
}
