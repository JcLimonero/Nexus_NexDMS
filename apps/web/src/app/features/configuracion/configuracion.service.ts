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

export type SurveyArea = "SERVICE" | "SALES";
export interface SurveyQuestion {
  id: string;
  label: string;
  type: "RATING" | "TEXT";
}
export interface SurveyConfig {
  area: SurveyArea;
  intro: string | null;
  thanks: string | null;
  questions: SurveyQuestion[];
  isActive: boolean;
}

export interface BranchConfigSafe {
  id: string;
  branchId: string;
  /** `phone_number_id` de Meta. Viaja en claro: no es secreto y hay que poder verificarlo. */
  whatsappPhoneNumberId: string | null;
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
  whatsappPhoneNumberId?: string;
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

  // ─── Divisa del tenant ──────────────────────────────────────

  getCurrency(): Observable<{ currency: string }> {
    return this.http.get<{ currency: string }>(`${TENANTS_URL}/me/currency`);
  }

  setCurrency(currency: string): Observable<{ currency: string }> {
    return this.http.patch<{ currency: string }>(`${TENANTS_URL}/me/currency`, {
      currency,
    });
  }

  // ─── Configuración de encuestas por área ────────────────────

  getSurveyConfig(area: SurveyArea): Observable<SurveyConfig> {
    return this.http.get<SurveyConfig>(`/api/v1/survey-configs/${area}`);
  }

  setSurveyConfig(
    area: SurveyArea,
    dto: Partial<SurveyConfig>
  ): Observable<SurveyConfig> {
    return this.http.put<SurveyConfig>(`/api/v1/survey-configs/${area}`, dto);
  }
}
