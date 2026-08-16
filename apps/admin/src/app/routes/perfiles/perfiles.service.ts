import { Injectable, inject } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { Observable } from "rxjs";

export interface CustomRole {
  id: string;
  tenantId: string;
  name: string;
  baseRoles: string[];
  description: string | null;
  isActive: boolean;
  resolvedModules: { key: string; name: string }[];
  operationCount: number;
}

export interface CustomRoleInput {
  tenantId?: string;
  name: string;
  baseRoles: string[];
  description?: string;
}

@Injectable({ providedIn: "root" })
export class PerfilesService {
  private http = inject(HttpClient);

  list(tenantId: string): Observable<CustomRole[]> {
    const params = new HttpParams().set("tenantId", tenantId);
    return this.http.get<CustomRole[]>("/api/v1/custom-roles", { params });
  }

  create(dto: CustomRoleInput): Observable<CustomRole> {
    return this.http.post<CustomRole>("/api/v1/custom-roles", dto);
  }

  update(id: string, dto: Partial<CustomRoleInput>): Observable<CustomRole> {
    return this.http.patch<CustomRole>(`/api/v1/custom-roles/${id}`, dto);
  }

  remove(id: string): Observable<{ ok: boolean }> {
    return this.http.delete<{ ok: boolean }>(`/api/v1/custom-roles/${id}`);
  }
}
