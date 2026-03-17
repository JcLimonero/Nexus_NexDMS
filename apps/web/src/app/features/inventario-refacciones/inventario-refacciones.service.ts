import { Injectable, inject } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import {
  Part,
  PartsResponse,
  PartFilters,
  CreatePartDto,
} from "./models/part.model";
import {
  PartCategory,
  PartCategoriesResponse,
  PartCategoryFilters,
  CreatePartCategoryDto,
} from "./models/part-category.model";
import {
  StockLocation,
  CreateStockLocationDto,
} from "./models/stock-location.model";

const PARTS_URL = "/api/v1/parts";
const CATEGORIES_URL = "/api/v1/part-categories";
const LOCATIONS_URL = "/api/v1/stock-locations";

@Injectable({
  providedIn: "root",
})
export class InventarioRefaccionesService {
  private http = inject(HttpClient);

  // Partes
  getParts(filters: PartFilters = {}): Observable<PartsResponse> {
    let params = new HttpParams();
    if (filters.search) params = params.set("search", filters.search);
    if (filters.categoryId) params = params.set("categoryId", filters.categoryId);
    if (filters.vehicleType) params = params.set("vehicleType", filters.vehicleType);
    if (filters.branchId) params = params.set("branchId", filters.branchId);
    if (filters.searchScope) params = params.set("searchScope", filters.searchScope);
    if (filters.page) params = params.set("page", filters.page.toString());
    if (filters.limit) params = params.set("limit", filters.limit.toString());
    return this.http.get<PartsResponse>(PARTS_URL, { params });
  }

  getPart(id: string): Observable<Part> {
    return this.http.get<Part>(`${PARTS_URL}/${id}`);
  }

  createPart(dto: CreatePartDto): Observable<Part> {
    return this.http.post<Part>(PARTS_URL, dto);
  }

  updatePart(id: string, dto: Partial<CreatePartDto>): Observable<Part> {
    return this.http.patch<Part>(`${PARTS_URL}/${id}`, dto);
  }

  deletePart(id: string): Observable<void> {
    return this.http
      .delete<{ deleted: boolean }>(`${PARTS_URL}/${id}`)
      .pipe(map(() => undefined));
  }

  // Categorías
  getCategories(filters: PartCategoryFilters = {}): Observable<PartCategoriesResponse> {
    let params = new HttpParams();
    if (filters.page) params = params.set("page", filters.page.toString());
    if (filters.limit) params = params.set("limit", filters.limit.toString());
    return this.http.get<PartCategoriesResponse>(CATEGORIES_URL, { params });
  }

  getCategory(id: string): Observable<PartCategory> {
    return this.http.get<PartCategory>(`${CATEGORIES_URL}/${id}`);
  }

  createCategory(dto: CreatePartCategoryDto): Observable<PartCategory> {
    return this.http.post<PartCategory>(CATEGORIES_URL, dto);
  }

  updateCategory(id: string, dto: Partial<CreatePartCategoryDto>): Observable<PartCategory> {
    return this.http.patch<PartCategory>(`${CATEGORIES_URL}/${id}`, dto);
  }

  // Ubicaciones
  getLocations(branchId?: string): Observable<StockLocation[]> {
    let params = new HttpParams();
    if (branchId) params = params.set("branchId", branchId);
    return this.http.get<StockLocation[]>(LOCATIONS_URL, { params });
  }

  createLocation(dto: CreateStockLocationDto): Observable<StockLocation> {
    return this.http.post<StockLocation>(LOCATIONS_URL, dto);
  }

  updateLocation(id: string, dto: Partial<CreateStockLocationDto>): Observable<StockLocation> {
    return this.http.patch<StockLocation>(`${LOCATIONS_URL}/${id}`, dto);
  }

  // Helpers
  getVehicleTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      MOTORCYCLE: "Moto",
      CAR: "Auto",
      BOTH: "Ambos",
    };
    return labels[type] ?? type;
  }
}
