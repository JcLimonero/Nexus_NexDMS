import { Injectable, inject } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { Observable } from "rxjs";

export interface VehicleColor {
  id: string;
  brandId: string;
  modelId: string;
  versionId: string;
  name: string;
  colorType: "INTERIOR" | "EXTERIOR";
}

export interface CreateVehicleColorDto {
  brandId: string;
  modelId: string;
  versionId: string;
  name: string;
  colorType: "INTERIOR" | "EXTERIOR";
}

const API_URL = "/api/v1/vehicle-colors";

@Injectable({
  providedIn: "root",
})
export class VehicleColorsService {
  private http = inject(HttpClient);

  findDistinctExteriorNames(): Observable<string[]> {
    return this.http.get<string[]>(`${API_URL}/distinct-exterior-names`);
  }

  findByVersion(
    versionId: string,
    colorType?: "INTERIOR" | "EXTERIOR"
  ): Observable<VehicleColor[]> {
    let params = new HttpParams().set("versionId", versionId);
    if (colorType) params = params.set("colorType", colorType);
    return this.http.get<VehicleColor[]>(API_URL, { params });
  }

  create(dto: CreateVehicleColorDto): Observable<VehicleColor> {
    return this.http.post<VehicleColor>(API_URL, dto);
  }
}
