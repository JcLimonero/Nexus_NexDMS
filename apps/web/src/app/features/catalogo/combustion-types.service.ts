import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { CombustionType } from "./models/modelo-global.model";

const API_URL = "/api/v1/combustion-types";

export interface CreateCombustionTypeDto {
  code: string;
  label: string;
}

@Injectable({
  providedIn: "root",
})
export class CombustionTypesService {
  private http = inject(HttpClient);

  getAll(): Observable<CombustionType[]> {
    return this.http.get<CombustionType[]>(API_URL);
  }

  getById(id: string): Observable<CombustionType> {
    return this.http.get<CombustionType>(`${API_URL}/${id}`);
  }

  create(dto: CreateCombustionTypeDto): Observable<CombustionType> {
    return this.http.post<CombustionType>(API_URL, dto);
  }

  update(id: string, dto: Partial<CreateCombustionTypeDto>): Observable<CombustionType> {
    return this.http.patch<CombustionType>(`${API_URL}/${id}`, dto);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${API_URL}/${id}`);
  }
}
