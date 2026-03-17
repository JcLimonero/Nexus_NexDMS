import { Injectable, inject } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { Observable } from "rxjs";
import {
  CatalogUnit,
  CatalogUnitsResponse,
  CatalogUnitFilters,
  CreateCatalogUnitDto,
  CatalogUnitStatus,
  UnitHistoryEvent,
  ExpedienteStatus,
} from "./models/catalog-unit.model";
import {
  UnitLocation,
  CreateUnitLocationDto,
} from "./models/unit-location.model";

const UNITS_URL = "/api/v1/catalog-units";
const LOCATIONS_URL = "/api/v1/unit-locations";

@Injectable({
  providedIn: "root",
})
export class InventarioUnidadesService {
  private http = inject(HttpClient);

  // Unidades
  getUnits(filters: CatalogUnitFilters = {}): Observable<CatalogUnitsResponse> {
    let params = new HttpParams();
    if (filters.vehicleType) params = params.set("vehicleType", filters.vehicleType);
    if (filters.brand) params = params.set("brand", filters.brand);
    if (filters.status) params = params.set("status", filters.status);
    if (filters.searchScope) params = params.set("searchScope", filters.searchScope);
    if (filters.branchId) params = params.set("branchId", filters.branchId);
    if (filters.search) params = params.set("search", filters.search);
    if (filters.page) params = params.set("page", filters.page.toString());
    if (filters.limit) params = params.set("limit", filters.limit.toString());
    return this.http.get<CatalogUnitsResponse>(UNITS_URL, { params });
  }

  getUnit(id: string): Observable<CatalogUnit> {
    return this.http.get<CatalogUnit>(`${UNITS_URL}/${id}`);
  }

  getUnitHistory(id: string): Observable<UnitHistoryEvent[]> {
    return this.http.get<UnitHistoryEvent[]>(`${UNITS_URL}/${id}/history`);
  }

  getExpedienteStatus(id: string): Observable<ExpedienteStatus> {
    return this.http.get<ExpedienteStatus>(`${UNITS_URL}/${id}/expediente-status`);
  }

  completeExpediente(id: string): Observable<CatalogUnit> {
    return this.http.post<CatalogUnit>(`${UNITS_URL}/${id}/complete-expediente`, {});
  }

  createUnit(dto: CreateCatalogUnitDto): Observable<CatalogUnit> {
    return this.http.post<CatalogUnit>(UNITS_URL, dto);
  }

  updateUnit(id: string, dto: Partial<CreateCatalogUnitDto>): Observable<CatalogUnit> {
    return this.http.patch<CatalogUnit>(`${UNITS_URL}/${id}`, dto);
  }

  updateUnitLocation(id: string, locationId: string): Observable<CatalogUnit> {
    return this.http.patch<CatalogUnit>(`${UNITS_URL}/${id}/location`, {
      locationId,
    });
  }

  createUnitReturn(dto: {
    catalogUnitId: string;
    clientId: string;
    unitSaleId?: string;
    returnDate: string;
    buybackPrice: number;
    mileage?: number;
    notes?: string;
  }): Observable<{ id: string }> {
    return this.http.post<{ id: string }>("/api/v1/unit-returns", dto);
  }

  // Ubicaciones
  getLocations(branchId?: string): Observable<UnitLocation[]> {
    let params = new HttpParams();
    if (branchId) params = params.set("branchId", branchId);
    return this.http.get<UnitLocation[]>(LOCATIONS_URL, { params });
  }

  getLocation(id: string): Observable<UnitLocation> {
    return this.http.get<UnitLocation>(`${LOCATIONS_URL}/${id}`);
  }

  createLocation(dto: CreateUnitLocationDto): Observable<UnitLocation> {
    return this.http.post<UnitLocation>(LOCATIONS_URL, dto);
  }

  updateLocation(id: string, dto: Partial<CreateUnitLocationDto>): Observable<UnitLocation> {
    return this.http.patch<UnitLocation>(`${LOCATIONS_URL}/${id}`, dto);
  }

  // Helpers
  getVehicleTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      MOTORCYCLE: "Moto",
      CAR: "Auto",
      SUV: "SUV",
      MINIVAN: "Minivan",
      TRUCK: "Camión",
      VAN: "Van",
      CARGO_VAN: "Van de carga",
      BOX_TRUCK: "Camión de caja",
    };
    return labels[type] ?? type;
  }

  getStatusLabel(status: CatalogUnitStatus): string {
    const labels: Record<string, string> = {
      AVAILABLE: "Disponible",
      RESERVED: "Reservada",
      SOLD: "Vendida",
      WRITTEN_OFF: "Dado de baja",
      PENDING_EXPEDIENTE: "Expediente pendiente",
    };
    return labels[status] ?? status;
  }

  getZoneLabel(zone: string): string {
    const labels: Record<string, string> = {
      LOT: "Patio",
      EXHIBITION: "Exhibición",
      WAREHOUSE: "Almacén",
    };
    return labels[zone] ?? zone;
  }

  getConditionLabel(condition: string): string {
    const labels: Record<string, string> = {
      NEW: "Nueva",
      USED: "Seminueva",
    };
    return labels[condition] ?? condition;
  }

  getHistoryEventLabel(event: UnitHistoryEvent): string {
    switch (event.type) {
      case "ACQUISITION":
        return "Ingreso a agencia";
      case "SALE":
        return `Vendida a ${event.clientName ?? "cliente"}`;
      case "RETURN":
        return `Recompra de ${event.clientName ?? "cliente"}`;
      default:
        return event.type;
    }
  }
}
