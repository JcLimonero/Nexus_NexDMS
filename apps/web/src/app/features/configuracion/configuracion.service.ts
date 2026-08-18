import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";

const BRANCHES_URL = "/api/v1/branches";
const TENANTS_URL = "/api/v1/tenants";

/** Reglas de "salir con adeudo" (R6) del tenant. */
export interface CreditConfig {
  /** Tope de días de la fecha promesa de pago (0/omitido = sin tope). */
  promiseDaysCap?: number;
  /** Valida el límite de crédito del cliente al entregar con adeudo. */
  creditCheckEnabled?: boolean;
}

export interface BranchConfigSafe {
  id: string;
  branchId: string;
  whatsappPhoneId: string | null;
  whatsappToken: string | null;
  facturaapiApiKey: string | null;
  bankName: string | null;
  bankClabe: string | null;
  bankAccount: string | null;
  bankHolder: string | null;
  cfdiLastFolio: number;
  updatedAt: string;
}

export interface UpdateBranchConfigDto {
  whatsappPhoneId?: string;
  whatsappToken?: string;
  facturaapiApiKey?: string;
  bankName?: string;
  bankClabe?: string;
  bankAccount?: string;
  bankHolder?: string;
  cfdiLastFolio?: number;
}

export const SENSITIVE_PLACEHOLDER = "••••••••";

@Injectable({
  providedIn: "root",
})
export class ConfiguracionService {
  private http = inject(HttpClient);

  getBranchConfig(branchId: string): Observable<BranchConfigSafe> {
    return this.http.get<BranchConfigSafe>(
      `${BRANCHES_URL}/${branchId}/config`
    );
  }

  updateBranchConfig(
    branchId: string,
    dto: UpdateBranchConfigDto
  ): Observable<BranchConfigSafe> {
    return this.http.patch<BranchConfigSafe>(
      `${BRANCHES_URL}/${branchId}/config`,
      dto
    );
  }

  getCreditConfig(): Observable<{ creditConfig: CreditConfig | null }> {
    return this.http.get<{ creditConfig: CreditConfig | null }>(
      `${TENANTS_URL}/me/credit-config`
    );
  }

  setCreditConfig(
    creditConfig: CreditConfig | null
  ): Observable<{ creditConfig: CreditConfig | null }> {
    return this.http.patch<{ creditConfig: CreditConfig | null }>(
      `${TENANTS_URL}/me/credit-config`,
      { creditConfig }
    );
  }
}
