import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { VehicleType } from "./models/modelo-global.model";

const API_URL = "/api/v1/vehicle-types";

export interface CreateVehicleTypeDto {
  code: string;
  label: string;
}

@Injectable({
  providedIn: "root",
})
export class VehicleTypesService {
  private http = inject(HttpClient);

  getAll(): Observable<VehicleType[]> {
    return this.http.get<VehicleType[]>(API_URL);
  }

  getById(id: string): Observable<VehicleType> {
    return this.http.get<VehicleType>(`${API_URL}/${id}`);
  }

  create(dto: CreateVehicleTypeDto): Observable<VehicleType> {
    return this.http.post<VehicleType>(API_URL, dto);
  }

  update(id: string, dto: Partial<CreateVehicleTypeDto>): Observable<VehicleType> {
    return this.http.patch<VehicleType>(`${API_URL}/${id}`, dto);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${API_URL}/${id}`);
  }
}
