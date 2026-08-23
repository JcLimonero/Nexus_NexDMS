import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";

export interface ProvisionTenantDto {
  name: string;
  slug: string;
  codePrefix?: string;
  plan: "BASIC" | "PRO" | "ENTERPRISE";
  enabledModules?: string[] | null;
  palette?: string;
  razonSocial?: string;
  giro: "MOTO" | "AUTO" | "BOTH";
  rfc?: string;
  taxRegime?: string;
  taxPostalCode?: string;
  branchName: string;
  branchSlug?: string;
  branchAddress: string;
  branchCity: string;
  branchState: string;
  branchPhone: string;
  branchEmail: string;
  adminFirstName: string;
  adminLastName: string;
  adminEmail: string;
}

export interface ResultadoProvisioning {
  tenantId: string;
  slug: string;
  legalEntityId: string;
  branchId: string;
  adminUserId: string;
  inviteUrl: string;
}

export interface ModuloCatalogo {
  key: string;
  name: string;
}

export const PALETAS = [
  { id: "nexus", nombre: "Nexus (predeterminada)" },
  { id: "acero", nombre: "Acero" },
  { id: "rojo-agencia", nombre: "Rojo agencia" },
  { id: "verde-bandera", nombre: "Verde bandera" },
  { id: "grafito", nombre: "Grafito" },
  { id: "ambar", nombre: "Ámbar" },
  { id: "vino", nombre: "Vino" },
  { id: "indigo", nombre: "Índigo" },
  { id: "turquesa", nombre: "Turquesa" },
  { id: "negro-oro", nombre: "Negro y oro" },
];

@Injectable({ providedIn: "root" })
export class WizardAltaService {
  private http = inject(HttpClient);

  modulos(): Observable<{ modules: ModuloCatalogo[] }> {
    return this.http.get<{ modules: ModuloCatalogo[] }>(
      "/api/v1/modules/catalog",
    );
  }

  provision(dto: ProvisionTenantDto): Observable<ResultadoProvisioning> {
    return this.http.post<ResultadoProvisioning>(
      "/api/v1/provisioning/tenant",
      dto,
    );
  }
}
