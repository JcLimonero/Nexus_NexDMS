import { Injectable, inject } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { Observable } from "rxjs";
import {
  Supplier,
  SuppliersResponse,
  SupplierFilters,
  CreateSupplierDto,
} from "./models/supplier.model";
import {
  PurchaseOrder,
  PurchaseOrdersResponse,
  PurchaseOrderFilters,
  CreatePurchaseOrderDto,
  ReceivePurchaseOrderDto,
} from "./models/purchase-order.model";

const SUPPLIERS_URL = "/api/v1/suppliers";
const PURCHASE_ORDERS_URL = "/api/v1/purchase-orders";

@Injectable({
  providedIn: "root",
})
export class ComprasService {
  private http = inject(HttpClient);

  // Proveedores
  getSuppliers(filters: SupplierFilters = {}): Observable<SuppliersResponse> {
    let params = new HttpParams();
    if (filters.search) params = params.set("search", filters.search);
    if (filters.isActive !== undefined)
      params = params.set("isActive", String(filters.isActive));
    if (filters.page) params = params.set("page", filters.page.toString());
    if (filters.limit) params = params.set("limit", filters.limit.toString());
    return this.http.get<SuppliersResponse>(SUPPLIERS_URL, { params });
  }

  getSupplier(id: string): Observable<Supplier> {
    return this.http.get<Supplier>(`${SUPPLIERS_URL}/${id}`);
  }

  createSupplier(dto: CreateSupplierDto): Observable<Supplier> {
    return this.http.post<Supplier>(SUPPLIERS_URL, dto);
  }

  updateSupplier(id: string, dto: Partial<CreateSupplierDto>): Observable<Supplier> {
    return this.http.patch<Supplier>(`${SUPPLIERS_URL}/${id}`, dto);
  }

  deleteSupplier(id: string): Observable<{ deleted: boolean }> {
    return this.http.delete<{ deleted: boolean }>(`${SUPPLIERS_URL}/${id}`);
  }

  // Órdenes de compra
  getPurchaseOrders(
    filters: PurchaseOrderFilters = {}
  ): Observable<PurchaseOrdersResponse> {
    let params = new HttpParams();
    if (filters.supplierId)
      params = params.set("supplierId", filters.supplierId);
    if (filters.status) params = params.set("status", filters.status);
    if (filters.branchId) params = params.set("branchId", filters.branchId);
    if (filters.dateFrom) params = params.set("dateFrom", filters.dateFrom);
    if (filters.dateTo) params = params.set("dateTo", filters.dateTo);
    if (filters.page) params = params.set("page", filters.page.toString());
    if (filters.limit) params = params.set("limit", filters.limit.toString());
    return this.http.get<PurchaseOrdersResponse>(PURCHASE_ORDERS_URL, {
      params,
    });
  }

  getPurchaseOrder(id: string): Observable<PurchaseOrder> {
    return this.http.get<PurchaseOrder>(`${PURCHASE_ORDERS_URL}/${id}`);
  }

  createPurchaseOrder(dto: CreatePurchaseOrderDto): Observable<PurchaseOrder> {
    return this.http.post<PurchaseOrder>(PURCHASE_ORDERS_URL, dto);
  }

  updatePurchaseOrder(
    id: string,
    dto: Partial<CreatePurchaseOrderDto>
  ): Observable<PurchaseOrder> {
    return this.http.patch<PurchaseOrder>(`${PURCHASE_ORDERS_URL}/${id}`, dto);
  }

  sendPurchaseOrder(id: string): Observable<PurchaseOrder> {
    return this.http.post<PurchaseOrder>(`${PURCHASE_ORDERS_URL}/${id}/send`, {});
  }

  receivePurchaseOrder(
    id: string,
    dto: ReceivePurchaseOrderDto
  ): Observable<PurchaseOrder> {
    return this.http.post<PurchaseOrder>(
      `${PURCHASE_ORDERS_URL}/${id}/receive`,
      dto
    );
  }

  cancelPurchaseOrder(id: string, reason?: string): Observable<PurchaseOrder> {
    return this.http.post<PurchaseOrder>(
      `${PURCHASE_ORDERS_URL}/${id}/cancel`,
      { reason }
    );
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      DRAFT: "Borrador",
      SENT: "Enviada",
      PARTIAL: "Parcial",
      RECEIVED: "Recibida",
      CANCELLED: "Cancelada",
    };
    return labels[status] ?? status;
  }
}
