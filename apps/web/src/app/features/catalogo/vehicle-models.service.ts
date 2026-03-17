import { Injectable, inject } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { Observable } from "rxjs";

export interface VehicleModel {
  id: string;
  brandId: string;
  name: string;
}

export interface CreateVehicleModelDto {
  brandId: string;
  name: string;
}

const API_URL = "/api/v1/vehicle-models";

@Injectable({
  providedIn: "root",
})
export class VehicleModelsService {
  private http = inject(HttpClient);

  findByBrandId(brandId: string): Observable<VehicleModel[]> {
    const params = new HttpParams().set("brandId", brandId);
    return this.http.get<VehicleModel[]>(API_URL, { params });
  }

  create(dto: CreateVehicleModelDto): Observable<VehicleModel> {
    return this.http.post<VehicleModel>(API_URL, dto);
  }
}
