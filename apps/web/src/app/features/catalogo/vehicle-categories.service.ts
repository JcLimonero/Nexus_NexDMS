import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";

export interface VehicleCategory {
  id: string;
  code: string;
  label: string;
}

const API_URL = "/api/v1/vehicle-categories";

@Injectable({
  providedIn: "root",
})
export class VehicleCategoriesService {
  private http = inject(HttpClient);

  getAll(): Observable<VehicleCategory[]> {
    return this.http.get<VehicleCategory[]>(API_URL);
  }
}
