import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";

export interface SaleSurvey {
  id: string;
  referenceLabel: string | null;
  clientName: string | null;
  token: string;
  score: number | null;
  answeredAt: string | null;
  sentAt: string | null;
  createdAt: string;
}

export interface SaleSurveyResumen {
  total: number;
  respondidas: number;
  promedio: number | null;
}

const URL = "/api/v1/sale-surveys";

@Injectable({ providedIn: "root" })
export class EncuestasVentaService {
  private http = inject(HttpClient);

  getAll(): Observable<SaleSurvey[]> {
    return this.http.get<SaleSurvey[]>(URL);
  }

  resumen(): Observable<SaleSurveyResumen> {
    return this.http.get<SaleSurveyResumen>(`${URL}/resumen`);
  }

  create(dto: {
    referenceLabel?: string;
    clientName?: string;
    branchId?: string;
  }): Observable<SaleSurvey> {
    return this.http.post<SaleSurvey>(URL, dto);
  }
}
