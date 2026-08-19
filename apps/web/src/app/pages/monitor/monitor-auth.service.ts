import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Router } from "@angular/router";
import { Observable, catchError, map, of, tap } from "rxjs";
import { Branding, BrandingService } from "../../shared/services/branding.service";

const API_URL = "/api/v1/auth";

/**
 * Sesión propia de las pantallas colgadas en el taller.
 *
 * Claves distintas de las del DMS a propósito. Un monitor se enciende una vez
 * y se queda meses: si compartiera la sesión del DMS, cerrar sesión en ese
 * equipo —o que caduque la de quien la abrió— apagaría la pantalla del taller
 * sin que nadie entienda por qué. Al revés también: quien pasa por ese equipo
 * a consultar algo no debería heredar la cuenta del monitor.
 *
 * Es el mismo criterio que ya siguen los portales de recepción y del técnico.
 */
const ACCESO = "nexdms_monitor_accessToken";
const REFRESCO = "nexdms_monitor_refreshToken";
const USUARIO = "nexdms_monitor_user";

export interface MonitorUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  roles: string[];
}

interface RespuestaLogin {
  accessToken: string;
  branding?: Branding;
  refreshToken: string;
  user: MonitorUser;
}

@Injectable({ providedIn: "root" })
export class MonitorAuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private branding = inject(BrandingService);

  entrar(
    email: string,
    password: string,
  ): Observable<RespuestaLogin | { requiresTotp: true; message: string }> {
    return this.http
      .post<RespuestaLogin | { requiresTotp: true; message: string }>(
        `${API_URL}/login`,
        { email, password },
      )
      .pipe(
        tap((r) => {
          if ("accessToken" in r) {
            localStorage.setItem(ACCESO, r.accessToken);
            localStorage.setItem(REFRESCO, r.refreshToken);
            localStorage.setItem(USUARIO, JSON.stringify(r.user));
            // El monitor de pared no pasó por el DMS: su marca llega aquí.
            this.branding.establecer(r.branding);
          }
        }),
      );
  }

  /**
   * Cierra la sesión sin navegar: lo hace el guard, que ya sabe a dónde
   * mandar y con qué motivo.
   */
  salirPorRol(): void {
    localStorage.removeItem(ACCESO);
    localStorage.removeItem(REFRESCO);
    localStorage.removeItem(USUARIO);
  }

  salir(): void {
    localStorage.removeItem(ACCESO);
    localStorage.removeItem(REFRESCO);
    localStorage.removeItem(USUARIO);
    this.router.navigate(["/monitor/acceso"]);
  }

  /**
   * Renueva el acceso sin intervención.
   *
   * Es lo que mantiene viva una pantalla que nadie va a tocar: sin esto, al
   * caducar el token el monitor se quedaría con el último dato en pantalla y
   * envejeciendo en silencio.
   */
  renovar(): Observable<boolean> {
    const refreshToken = localStorage.getItem(REFRESCO);
    if (!refreshToken) return of(false);
    return this.http
      .post<{ accessToken: string }>(`${API_URL}/refresh`, { refreshToken })
      .pipe(
        tap((r) => localStorage.setItem(ACCESO, r.accessToken)),
        map(() => true),
        catchError(() => of(false)),
      );
  }

  token(): string | null {
    return localStorage.getItem(ACCESO);
  }

  usuario(): MonitorUser | null {
    const raw = localStorage.getItem(USUARIO);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as MonitorUser;
    } catch {
      return null;
    }
  }

  autenticado(): boolean {
    return !!this.token();
  }
}
