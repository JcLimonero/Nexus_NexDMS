import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { VehicleType } from "./models/modelo-global.model";

const API_URL = "/api/v1/vehicle-types";

@Injectable({
  providedIn: "root",
})
export class VehicleTypesService {
  private http = inject(HttpClient);

  getAll(): Observable<VehicleType[]> {
    return this.http.get<VehicleType[]>(API_URL);
  }
}
