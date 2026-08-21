import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";

export interface AdminUsuario {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface NuevoAdminUsuario {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
}

const URL = "/api/v1/admin-users";

/** Usuarios del portal de administración del SaaS. */
@Injectable({ providedIn: "root" })
export class UsuariosService {
  private http = inject(HttpClient);

  listar(): Observable<AdminUsuario[]> {
    return this.http.get<AdminUsuario[]>(URL);
  }

  crear(dto: NuevoAdminUsuario): Observable<AdminUsuario> {
    return this.http.post<AdminUsuario>(URL, dto);
  }

  actualizar(
    id: string,
    dto: { firstName?: string; lastName?: string; isActive?: boolean },
  ): Observable<AdminUsuario> {
    return this.http.patch<AdminUsuario>(`${URL}/${id}`, dto);
  }

  cambiarPassword(id: string, password: string): Observable<void> {
    return this.http.patch<void>(`${URL}/${id}/password`, { password });
  }

  eliminar(id: string): Observable<void> {
    return this.http.delete<void>(`${URL}/${id}`);
  }
}
