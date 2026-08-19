import { Injectable, inject } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { Observable } from "rxjs";
import {
  UnitSale,
  CreateUnitSaleDto,
  UnitAccessory,
} from "./models/unit-sale.model";

const UNIT_SALES_URL = "/api/v1/unit-sales";
const UNIT_ACCESSORIES_URL = "/api/v1/unit-accessories";

export interface UnitSalesFilters {
  clientId?: string;
  status?: string;
  branchId?: string;
  dateFrom?: string;
  dateTo?: string;
}

@Injectable({
  providedIn: "root",
})
export class VentasUnidadesService {
  private http = inject(HttpClient);

  getAll(filters: UnitSalesFilters = {}): Observable<UnitSale[]> {
    let params = new HttpParams();
    if (filters.clientId) params = params.set("clientId", filters.clientId);
    if (filters.status) params = params.set("status", filters.status);
    if (filters.branchId) params = params.set("branchId", filters.branchId);
    if (filters.dateFrom) params = params.set("dateFrom", filters.dateFrom);
    if (filters.dateTo) params = params.set("dateTo", filters.dateTo);
    return this.http.get<UnitSale[]>(UNIT_SALES_URL, { params });
  }

  getOne(id: string): Observable<UnitSale> {
    return this.http.get<UnitSale>(`${UNIT_SALES_URL}/${id}`);
  }

  create(dto: CreateUnitSaleDto): Observable<UnitSale> {
    return this.http.post<UnitSale>(UNIT_SALES_URL, dto);
  }

  /** Programa la fecha de entrega (o la borra con null). */
  scheduleDelivery(id: string, deliveryDate: string | null): Observable<UnitSale> {
    return this.http.post<UnitSale>(`${UNIT_SALES_URL}/${id}/delivery-date`, {
      deliveryDate,
    });
  }

  complete(id: string): Observable<UnitSale> {
    return this.http.post<UnitSale>(`${UNIT_SALES_URL}/${id}/complete`, {});
  }

  cancel(id: string, reason: string): Observable<UnitSale> {
    return this.http.post<UnitSale>(`${UNIT_SALES_URL}/${id}/cancel`, {
      reason,
    });
  }

  /**
   * Obtiene solo los accesorios compatibles con la unidad seleccionada.
   * Debe llamarse después de seleccionar una unidad.
   */
  getCompatibleAccessories(catalogUnitId: string): Observable<UnitAccessory[]> {
    return this.http.get<UnitAccessory[]>(
      `${UNIT_ACCESSORIES_URL}/compatible`,
      {
        params: { catalogUnitId },
      }
    );
  }
}
