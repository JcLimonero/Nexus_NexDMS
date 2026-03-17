import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { CombustionType } from "./models/modelo-global.model";

const API_URL = "/api/v1/combustion-types";

@Injectable({
  providedIn: "root",
})
export class CombustionTypesService {
  private http = inject(HttpClient);

  getAll(): Observable<CombustionType[]> {
    return this.http.get<CombustionType[]>(API_URL);
  }
}
