import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";

export type ReturnKind = "CLIENT_RETURN" | "SUPPLIER_CLAIM";
export type RefundMethod = "CASH" | "CREDIT_NOTE" | "REPLACEMENT" | "NONE";
export type ReturnCondition = "GOOD" | "DEFECTIVE";

export interface PartReturnLine {
  partId: string;
  quantity: number;
  unitPrice?: number;
  condition?: ReturnCondition;
}

export interface CreatePartReturnDto {
  branchId?: string;
  kind: ReturnKind;
  clientId?: string;
  supplierId?: string;
  isWarranty?: boolean;
  restock?: boolean;
  reason?: string;
  refundMethod?: RefundMethod;
  lines: PartReturnLine[];
}

export interface PartReturnItem {
  id: string;
  partId: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  condition: ReturnCondition;
}

export interface PartReturn {
  id: string;
  branchId: string;
  folio: string;
  kind: ReturnKind;
  clientId: string | null;
  supplierId: string | null;
  isWarranty: boolean;
  restock: boolean;
  reason: string | null;
  refundMethod: RefundMethod;
  refundTotal: number;
  createdAt: string;
  items?: PartReturnItem[];
}

const URL = "/api/v1/part-returns";

@Injectable({ providedIn: "root" })
export class DevolucionesService {
  private http = inject(HttpClient);

  getReturns(kind?: ReturnKind): Observable<PartReturn[]> {
    const q = kind ? `?kind=${kind}` : "";
    return this.http.get<PartReturn[]>(`${URL}${q}`);
  }

  getReturn(id: string): Observable<PartReturn> {
    return this.http.get<PartReturn>(`${URL}/${id}`);
  }

  createReturn(dto: CreatePartReturnDto): Observable<PartReturn> {
    return this.http.post<PartReturn>(URL, dto);
  }
}
