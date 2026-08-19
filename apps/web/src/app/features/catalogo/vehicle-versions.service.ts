import { Injectable, inject } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { Observable } from "rxjs";

export interface VehicleVersion {
  id: string;
  brandId: string;
  modelId: string;
  year: number;
  name: string;
}

export interface CreateVehicleVersionDto {
  brandId: string;
  modelId: string;
  year: number;
  name: string;
}

const API_URL = "/api/v1/vehicle-versions";

@Injectable({
  providedIn: "root",
})
export class VehicleVersionsService {
  private http = inject(HttpClient);

  findByContext(
    brandId: string,
    modelName: string,
    year: number,
    versionName: string
  ): Observable<VehicleVersion | null> {
    let params = new HttpParams()
      .set("brandId", brandId)
      .set("modelName", modelName)
      .set("year", year.toString())
      .set("versionName", versionName);
    return this.http.get<VehicleVersion | null>(`${API_URL}/by-context`, {
      params,
    });
  }

  findByBrandModelYear(
    brandId: string,
    modelId: string,
    year: number
  ): Observable<VehicleVersion[]> {
    let params = new HttpParams().set("brandId", brandId).set("modelId", modelId);
    params = params.set("year", year.toString());
    return this.http.get<VehicleVersion[]>(API_URL, { params });
  }

  create(dto: CreateVehicleVersionDto): Observable<VehicleVersion> {
    return this.http.post<VehicleVersion>(API_URL, dto);
  }
}
