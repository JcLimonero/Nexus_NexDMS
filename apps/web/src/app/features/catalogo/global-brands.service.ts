import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import {
  GlobalBrand,
  CreateGlobalBrandDto,
} from "./models/global-brand.model";

const API_URL = "/api/v1/global-brands";

@Injectable({
  providedIn: "root",
})
export class GlobalBrandsService {
  private http = inject(HttpClient);

  getAll(): Observable<GlobalBrand[]> {
    return this.http.get<GlobalBrand[]>(API_URL);
  }

  getById(id: string): Observable<GlobalBrand> {
    return this.http.get<GlobalBrand>(`${API_URL}/${id}`);
  }

  create(dto: CreateGlobalBrandDto): Observable<GlobalBrand> {
    return this.http.post<GlobalBrand>(API_URL, dto);
  }

  update(id: string, dto: Partial<CreateGlobalBrandDto>): Observable<GlobalBrand> {
    return this.http.patch<GlobalBrand>(`${API_URL}/${id}`, dto);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${API_URL}/${id}`);
  }
}
