import { Injectable, inject } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { Observable } from "rxjs";
import {
  WarehouseTransfer,
  WarehouseTransfersResponse,
  WarehouseTransferFilters,
  CreateWarehouseTransferDto,
} from "./models/warehouse-transfer.model";
import {
  UnitReservation,
  UnitReservationFilters,
  CreateUnitReservationDto,
} from "./models/unit-reservation.model";

const WAREHOUSE_TRANSFERS_URL = "/api/v1/warehouse-transfers";
const UNIT_RESERVATIONS_URL = "/api/v1/unit-reservations";
const STOCK_MOVEMENTS_URL = "/api/v1/stock-movements";
const STOCK_COUNTS_URL = "/api/v1/stock-counts";
const PARTS_URL = "/api/v1/parts";

export interface PartScan {
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
  stockQuantity: number;
  minStock: number;
  averageCost: number;
  publicPrice: number;
}

export interface ValuationItem {
  partId: string;
  sku: string;
  name: string;
  stockQuantity: number;
  averageCost: number;
  value: number;
  publicPrice: number;
  marginPct: number | null;
}

export interface Valuation {
  items: ValuationItem[];
  totals: {
    parts: number;
    units: number;
    costValue: number;
    retailValue: number;
  };
}

export interface StockCountLine {
  id: string;
  partId: string;
  sku: string;
  name: string;
  systemQty: number;
  countedQty: number | null;
  difference: number | null;
}

export interface StockCount {
  id: string;
  branchId: string;
  folio: string;
  status: "OPEN" | "APPLIED" | "CANCELLED";
  notes: string | null;
  createdAt: string;
  appliedAt: string | null;
  lines?: StockCountLine[];
}

@Injectable({
  providedIn: "root",
})
export class AlmacenService {
  private http = inject(HttpClient);

  // Transferencias
  getWarehouseTransfers(
    filters: WarehouseTransferFilters = {}
  ): Observable<WarehouseTransfersResponse> {
    let params = new HttpParams();
    if (filters.originBranchId)
      params = params.set("originBranchId", filters.originBranchId);
    if (filters.destinationBranchId)
      params = params.set("destinationBranchId", filters.destinationBranchId);
    if (filters.status) params = params.set("status", filters.status);
    if (filters.page) params = params.set("page", filters.page.toString());
    if (filters.limit) params = params.set("limit", filters.limit.toString());
    return this.http.get<WarehouseTransfersResponse>(WAREHOUSE_TRANSFERS_URL, {
      params,
    });
  }

  getWarehouseTransfer(id: string): Observable<WarehouseTransfer> {
    return this.http.get<WarehouseTransfer>(
      `${WAREHOUSE_TRANSFERS_URL}/${id}`
    );
  }

  createWarehouseTransfer(
    dto: CreateWarehouseTransferDto
  ): Observable<WarehouseTransfer> {
    return this.http.post<WarehouseTransfer>(WAREHOUSE_TRANSFERS_URL, dto);
  }

  updateWarehouseTransfer(
    id: string,
    dto: Partial<CreateWarehouseTransferDto>
  ): Observable<WarehouseTransfer> {
    return this.http.patch<WarehouseTransfer>(
      `${WAREHOUSE_TRANSFERS_URL}/${id}`,
      dto
    );
  }

  approveWarehouseTransfer(id: string): Observable<WarehouseTransfer> {
    return this.http.post<WarehouseTransfer>(
      `${WAREHOUSE_TRANSFERS_URL}/${id}/approve`,
      {}
    );
  }

  sendWarehouseTransfer(id: string): Observable<WarehouseTransfer> {
    return this.http.post<WarehouseTransfer>(
      `${WAREHOUSE_TRANSFERS_URL}/${id}/send`,
      {}
    );
  }

  receiveWarehouseTransfer(id: string): Observable<WarehouseTransfer> {
    return this.http.post<WarehouseTransfer>(
      `${WAREHOUSE_TRANSFERS_URL}/${id}/receive`,
      {}
    );
  }

  cancelWarehouseTransfer(id: string): Observable<WarehouseTransfer> {
    return this.http.post<WarehouseTransfer>(
      `${WAREHOUSE_TRANSFERS_URL}/${id}/cancel`,
      {}
    );
  }

  getTransferStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      PENDING: "Pendiente",
      APPROVED: "Aprobada",
      IN_TRANSIT: "En tránsito",
      RECEIVED: "Recibida",
      CANCELLED: "Cancelada",
    };
    return labels[status] ?? status;
  }

  getTransferTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      INTRA_BRAND: "Misma marca",
      INTER_BRAND: "Otra marca",
    };
    return labels[type] ?? type;
  }

  // Apartados
  getUnitReservations(
    filters: UnitReservationFilters = {}
  ): Observable<UnitReservation[]> {
    let params = new HttpParams();
    if (filters.status) params = params.set("status", filters.status);
    if (filters.catalogUnitId)
      params = params.set("catalogUnitId", filters.catalogUnitId);
    if (filters.clientId) params = params.set("clientId", filters.clientId);
    if (filters.branchId) params = params.set("branchId", filters.branchId);
    return this.http.get<UnitReservation[]>(UNIT_RESERVATIONS_URL, {
      params,
    });
  }

  getUnitReservation(id: string): Observable<UnitReservation> {
    return this.http.get<UnitReservation>(`${UNIT_RESERVATIONS_URL}/${id}`);
  }

  createUnitReservation(
    dto: CreateUnitReservationDto
  ): Observable<UnitReservation> {
    return this.http.post<UnitReservation>(UNIT_RESERVATIONS_URL, dto);
  }

  releaseUnitReservation(id: string, reason: string): Observable<UnitReservation> {
    return this.http.post<UnitReservation>(
      `${UNIT_RESERVATIONS_URL}/${id}/release`,
      { reason }
    );
  }

  getReservationStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      ACTIVE: "Activo",
      CONVERTED: "Convertido",
      RELEASED: "Liberado",
    };
    return labels[status] ?? status;
  }

  // ── Costeo ──
  getValuation(branchId: string): Observable<Valuation> {
    const params = new HttpParams().set("branchId", branchId);
    return this.http.get<Valuation>(`${STOCK_MOVEMENTS_URL}/valuation`, {
      params,
    });
  }

  registrarEntrada(dto: {
    partId: string;
    branchId: string;
    quantity: number;
    unitCost: number;
    notes?: string;
  }): Observable<unknown> {
    return this.http.post(`${STOCK_MOVEMENTS_URL}/entrada`, dto);
  }

  // ── Conteo físico ──
  getStockCounts(branchId?: string): Observable<StockCount[]> {
    let params = new HttpParams();
    if (branchId) params = params.set("branchId", branchId);
    return this.http.get<StockCount[]>(STOCK_COUNTS_URL, { params });
  }

  getStockCount(id: string): Observable<StockCount> {
    return this.http.get<StockCount>(`${STOCK_COUNTS_URL}/${id}`);
  }

  openStockCount(dto: {
    branchId: string;
    notes?: string;
  }): Observable<StockCount> {
    return this.http.post<StockCount>(STOCK_COUNTS_URL, dto);
  }

  saveStockCounts(
    id: string,
    lines: { lineId: string; countedQty: number }[],
  ): Observable<StockCount> {
    return this.http.post<StockCount>(`${STOCK_COUNTS_URL}/${id}/lines`, {
      lines,
    });
  }

  applyStockCount(id: string): Observable<StockCount> {
    return this.http.post<StockCount>(`${STOCK_COUNTS_URL}/${id}/apply`, {});
  }

  cancelStockCount(id: string): Observable<StockCount> {
    return this.http.post<StockCount>(`${STOCK_COUNTS_URL}/${id}/cancel`, {});
  }

  getCountStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      OPEN: "Abierto",
      APPLIED: "Aplicado",
      CANCELLED: "Cancelado",
    };
    return labels[status] ?? status;
  }

  // ── Inventario rápido por escaneo ──
  scanPart(code: string, branchId: string): Observable<PartScan> {
    const params = new HttpParams().set("code", code).set("branchId", branchId);
    return this.http.get<PartScan>(`${PARTS_URL}/scan`, { params });
  }

  crearAjuste(dto: {
    partId: string;
    branchId: string;
    type: "ADJUSTMENT_IN" | "ADJUSTMENT_OUT";
    quantity: number;
    notes?: string;
  }): Observable<unknown> {
    return this.http.post(`${STOCK_MOVEMENTS_URL}/adjustment`, dto);
  }
}
