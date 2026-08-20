import { Injectable, inject } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { Observable } from "rxjs";

export interface ComisionOperacion {
  operationId: string;
  description: string;
  chargeType: string;
  laborPrice: number;
  comision: number;
  motivo: string;
}

export interface ComisionPreview {
  mecanico: {
    id: string;
    nombre: string;
    periodo: string | null;
    porcentaje: number;
    sueldoGarantia: number;
  };
  desde: string;
  hasta: string;
  operaciones: ComisionOperacion[];
  comisionTotal: number;
  sueldoGarantia: number;
  total: number;
}

export interface Mecanico {
  id: string;
  firstName: string;
  lastName: string;
  roles: string[];
  commissionPeriod: string | null;
}

@Injectable({ providedIn: "root" })
export class ComisionesService {
  private http = inject(HttpClient);

  preview(mechanicId: string, from: string, to: string): Observable<ComisionPreview> {
    const params = new HttpParams()
      .set("mechanicId", mechanicId)
      .set("from", from)
      .set("to", to);
    return this.http.get<ComisionPreview>("/api/v1/commissions/preview", { params });
  }

  mecanicos(): Observable<Mecanico[]> {
    return this.http.get<Mecanico[]>("/api/v1/users");
  }

  getExentos(): Observable<{ exemptChargeTypes: string[] }> {
    return this.http.get<{ exemptChargeTypes: string[] }>(
      "/api/v1/tenants/me/commission-config",
    );
  }

  setExentos(exemptChargeTypes: string[]): Observable<{ exemptChargeTypes: string[] }> {
    return this.http.patch<{ exemptChargeTypes: string[] }>(
      "/api/v1/tenants/me/commission-config",
      { exemptChargeTypes },
    );
  }
}
