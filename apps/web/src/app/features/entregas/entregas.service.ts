import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";

export type DeliveryKind = "UNIT_SALE" | "SERVICE";

export interface ChecklistItem {
  label: string;
  done: boolean;
}

export interface Delivery {
  id: string;
  folio: string;
  kind: DeliveryKind;
  referenceLabel: string | null;
  clientId: string | null;
  checklist: ChecklistItem[];
  notes: string | null;
  deliveredAt: string | null;
  createdAt: string;
}

export interface CreateDeliveryDto {
  branchId?: string;
  kind: DeliveryKind;
  referenceLabel?: string;
  clientId?: string;
  checklist?: ChecklistItem[];
  notes?: string;
}

const URL = "/api/v1/deliveries";

@Injectable({ providedIn: "root" })
export class EntregasService {
  private http = inject(HttpClient);

  getDeliveries(kind?: DeliveryKind): Observable<Delivery[]> {
    const q = kind ? `?kind=${kind}` : "";
    return this.http.get<Delivery[]>(`${URL}${q}`);
  }

  getTemplate(kind: DeliveryKind): Observable<ChecklistItem[]> {
    return this.http.get<ChecklistItem[]>(`${URL}/template/${kind}`);
  }

  create(dto: CreateDeliveryDto): Observable<Delivery> {
    return this.http.post<Delivery>(URL, dto);
  }
}
