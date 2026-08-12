import { Injectable, inject, signal } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable, tap } from "rxjs";

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
  refreshToken: string;
  user: PwaUser;
}

@Injectable({ providedIn: "root" })
export class AuthService {
  private http = inject(HttpClient);

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

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>("/api/v1/auth/login", { email, password })
      .pipe(
        tap((res) => {
          localStorage.setItem(STORAGE_TOKEN, res.accessToken);
          localStorage.setItem(STORAGE_USER, JSON.stringify(res.user));
          this.user.set(res.user);
        }),
      );
  }

  logout(): void {
    localStorage.removeItem(STORAGE_TOKEN);
    localStorage.removeItem(STORAGE_USER);
    this.user.set(null);
  }
}
