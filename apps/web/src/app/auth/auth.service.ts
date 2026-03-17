import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Router } from "@angular/router";
import { Observable, tap, catchError, of } from "rxjs";

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

  login(dto: LoginRequest): Observable<LoginResponse | TotpRequiredResponse> {
    return this.http
      .post<LoginResponse | TotpRequiredResponse>(`${API_URL}/login`, dto)
      .pipe(
        tap((res) => {
          if ("accessToken" in res) {
            this.setSession(res);
          }
        }),
      );
  }

  logout(): void {
    const token = this.getAccessToken();
    if (token) {
      this.http.post(`${API_URL}/logout`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      }).subscribe({ error: () => {} });
    }
    this.clearSession();
    this.router.navigate(["/auth/login"]);
  }

  refresh(): Observable<{ accessToken: string } | null> {
    const refreshToken = localStorage.getItem(STORAGE_REFRESH);
    if (!refreshToken) return of(null);
    return this.http
      .post<{ accessToken: string }>(`${API_URL}/refresh`, { refreshToken })
      .pipe(
        tap((res) => localStorage.setItem(STORAGE_ACCESS, res.accessToken)),
        catchError(() => {
          this.clearSession();
          return of(null);
        }),
      );
  }

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
    return !!this.getAccessToken();
  }

  private setSession(res: LoginResponse): void {
    localStorage.setItem(STORAGE_ACCESS, res.accessToken);
    localStorage.setItem(STORAGE_REFRESH, res.refreshToken);
    localStorage.setItem(STORAGE_USER, JSON.stringify(res.user));
  }

  private clearSession(): void {
    localStorage.removeItem(STORAGE_ACCESS);
    localStorage.removeItem(STORAGE_REFRESH);
    localStorage.removeItem(STORAGE_USER);
  }
}
