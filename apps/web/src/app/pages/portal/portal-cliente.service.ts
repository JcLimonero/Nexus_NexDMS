import { Injectable, inject, signal } from "@angular/core";
import { HttpClient, HttpHeaders } from "@angular/common/http";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";

export interface PortalInicio {
  vehiculos: number;
  trabajosEnCurso: number;
  citas: number;
  encuestasPendientes: number;
  firmasPendientes: number;
}

export interface PortalVehiculo {
  id: string;
  marca: string | null;
  modelo: string | null;
  anio: number | null;
  placa: string | null;
  enTaller: boolean;
  ordenActual: { id: string; folio: string; status: string } | null;
}

export interface PortalEtapa {
  clave: string;
  nombre: string;
  alcanzada: boolean;
  actual: boolean;
}

export interface PortalOrden {
  id: string;
  folio: string;
  status: string;
  entregaPrevista: string | null;
  sucursal: string | null;
  problema: string;
  etapas: PortalEtapa[];
  vehiculo: { marca: string | null; modelo: string | null; placa: string | null } | null;
}

export interface PortalCita {
  id: string;
  scheduledAt: string;
  serviceType: string;
  status: string;
  sucursal: string | null;
  placa: string | null;
}

export interface PortalDocumento {
  id: string;
  kind: string;
  folio: string | null;
  firmada: boolean;
  signedAt: string | null;
  token: string | null;
}

export interface PortalEncuesta {
  id: string;
  token: string;
  respondida: boolean;
  enviadaEl: string | null;
}

export interface PortalMensaje {
  id: string;
  sender: "CLIENT" | "STAFF";
  body: string;
  createdAt: string;
  leido: boolean;
}

const CLAVE_SESION = "nexdms_portal_token";
const CLAVE_NOMBRE = "nexdms_portal_nombre";

/**
 * Sesión y datos del cliente en su portal.
 *
 * El token se guarda aparte del de la aplicación interna: son dos sesiones
 * distintas y no deben pisarse si alguien del taller usa el mismo navegador
 * para probar el portal.
 */
@Injectable({ providedIn: "root" })
export class PortalClienteService {
  private http = inject(HttpClient);

  readonly token = signal<string | null>(
    localStorage.getItem(CLAVE_SESION),
  );
  readonly nombre = signal<string>(
    localStorage.getItem(CLAVE_NOMBRE) ?? "",
  );

  private get auth(): { headers: HttpHeaders } {
    return {
      headers: new HttpHeaders({ Authorization: `Bearer ${this.token()}` }),
    };
  }

  solicitarCodigo(phone: string): Observable<{ enviado: boolean }> {
    return this.http.post<{ enviado: boolean }>("/api/v1/portal/auth/codigo", {
      phone,
    });
  }

  verificar(
    phone: string,
    code: string,
  ): Observable<{ accessToken: string; nombre: string }> {
    return this.http
      .post<{ accessToken: string; nombre: string }>(
        "/api/v1/portal/auth/verificar",
        { phone, code },
      )
      .pipe(
        tap((r) => {
          localStorage.setItem(CLAVE_SESION, r.accessToken);
          localStorage.setItem(CLAVE_NOMBRE, r.nombre);
          this.token.set(r.accessToken);
          this.nombre.set(r.nombre);
        }),
      );
  }

  salir(): void {
    localStorage.removeItem(CLAVE_SESION);
    localStorage.removeItem(CLAVE_NOMBRE);
    this.token.set(null);
    this.nombre.set("");
  }

  inicio(): Observable<PortalInicio> {
    return this.http.get<PortalInicio>("/api/v1/portal/inicio", this.auth);
  }

  vehiculos(): Observable<PortalVehiculo[]> {
    return this.http.get<PortalVehiculo[]>(
      "/api/v1/portal/vehiculos",
      this.auth,
    );
  }

  orden(id: string): Observable<PortalOrden> {
    return this.http.get<PortalOrden>(`/api/v1/portal/ordenes/${id}`, this.auth);
  }

  citas(): Observable<PortalCita[]> {
    return this.http.get<PortalCita[]>("/api/v1/portal/citas", this.auth);
  }

  documentos(): Observable<PortalDocumento[]> {
    return this.http.get<PortalDocumento[]>(
      "/api/v1/portal/documentos",
      this.auth,
    );
  }

  encuestas(): Observable<PortalEncuesta[]> {
    return this.http.get<PortalEncuesta[]>(
      "/api/v1/portal/encuestas",
      this.auth,
    );
  }

  mensajes(ordenId: string): Observable<PortalMensaje[]> {
    return this.http.get<PortalMensaje[]>(
      `/api/v1/portal/ordenes/${ordenId}/mensajes`,
      this.auth,
    );
  }

  escribir(ordenId: string, body: string): Observable<unknown> {
    return this.http.post(
      `/api/v1/portal/ordenes/${ordenId}/mensajes`,
      { body },
      this.auth,
    );
  }
}
