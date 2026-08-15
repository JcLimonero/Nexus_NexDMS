import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";

export interface RoleModule {
  key: string;
  name: string;
}

export interface RoleOperation {
  method: string;
  path: string;
  module: string | null;
}

export interface RoleAccess {
  role: string;
  modules: RoleModule[];
  operationCount: number;
  operations: RoleOperation[];
}

export interface RoleMap {
  generatedAt: string;
  roles: RoleAccess[];
  openOperations: RoleOperation[];
  modules: { key: string; name: string; roles: string[] }[];
}

/** Etiquetas en español para los roles del sistema. */
const ETIQUETAS_ROL: Record<string, string> = {
  SUPERADMIN: "Superadministrador",
  ADMIN: "Administrador",
  MANAGER: "Gerente",
  WAREHOUSE: "Almacén",
  CASHIER: "Cajero",
  MECHANIC: "Mecánico",
  RECEPTIONIST: "Recepción",
  SELLER: "Vendedor",
  EXECUTIVE: "Ejecutivo",
  LEGAL_ENTITY_MANAGER: "Gerente de razón social",
  ADMIN_MANAGER: "Gerente administrativo",
  PARTS_MANAGER: "Gerente de refacciones",
  AFTERSALES_MANAGER: "Gerente de posventa",
};

@Injectable({ providedIn: "root" })
export class RolesService {
  private http = inject(HttpClient);

  getRoleMap(): Observable<RoleMap> {
    return this.http.get<RoleMap>("/api/v1/role-map");
  }

  etiquetaRol(role: string): string {
    return ETIQUETAS_ROL[role] ?? role;
  }
}
