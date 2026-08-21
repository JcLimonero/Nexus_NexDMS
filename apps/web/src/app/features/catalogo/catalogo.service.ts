import { Injectable, inject } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { Observable } from "rxjs";
import {
  GlobalModel,
  GlobalModelsResponse,
  CreateGlobalModelDto,
  FilterGlobalModels,
} from "./models/modelo-global.model";

const API_URL = "/api/v1/global-models";

@Injectable({
  providedIn: "root",
})
export class CatalogoService {
  private http = inject(HttpClient);

  getAll(filters: FilterGlobalModels = {}): Observable<GlobalModelsResponse> {
    let params = new HttpParams();
    if (filters.search) params = params.set("search", filters.search);
    if (filters.brandId) params = params.set("brandId", filters.brandId);
    if (filters.vehicleTypeId)
      params = params.set("vehicleTypeId", filters.vehicleTypeId);
    if (filters.year) params = params.set("year", filters.year.toString());
    if (filters.isActive !== undefined)
      params = params.set("isActive", String(filters.isActive));
    if (filters.page) params = params.set("page", filters.page.toString());
    if (filters.limit) params = params.set("limit", filters.limit.toString());

    return this.http.get<GlobalModelsResponse>(API_URL, { params });
  }

  getById(id: string): Observable<GlobalModel> {
    return this.http.get<GlobalModel>(`${API_URL}/${id}`);
  }

  getBrands(vehicleTypeCode: string): Observable<string[]> {
    const params = new HttpParams().set(
      "vehicleTypeCode",
      vehicleTypeCode || "CAR",
    );
    return this.http.get<string[]>(`${API_URL}/brands`, { params });
  }

  getModels(vehicleTypeCode: string, brandName: string): Observable<string[]> {
    let params = new HttpParams().set(
      "vehicleTypeCode",
      vehicleTypeCode || "CAR",
    );
    if (brandName) params = params.set("brandName", brandName);
    return this.http.get<string[]>(`${API_URL}/models`, { params });
  }

  create(dto: CreateGlobalModelDto): Observable<GlobalModel> {
    return this.http.post<GlobalModel>(API_URL, dto);
  }

  update(id: string, dto: Partial<CreateGlobalModelDto>): Observable<GlobalModel> {
    return this.http.patch<GlobalModel>(`${API_URL}/${id}`, dto);
  }

  getDisplayLabel(model: GlobalModel): string {
    const version = model.version ? ` ${model.version}` : "";
    const brandName = model.brand?.name ?? "—";
    return `${brandName} ${model.model}${version} (${model.year})`;
  }

  getVehicleTypeLabel(model: GlobalModel): string {
    return model.vehicleType?.label ?? "—";
  }

  getCombustionTypeLabel(model: GlobalModel): string {
    return model.combustionType?.label ?? "—";
  }
}
