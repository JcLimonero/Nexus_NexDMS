import { Injectable, inject } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { Observable } from "rxjs";

export interface Branch {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
}

export interface BranchesResponse {
  data: Branch[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

const BRANCHES_URL = "/api/v1/branches";

@Injectable({
  providedIn: "root",
})
export class BranchesService {
  private http = inject(HttpClient);

  getAll(page = 1, limit = 100): Observable<BranchesResponse> {
    const params = new HttpParams()
      .set("page", page.toString())
      .set("limit", limit.toString());
    return this.http.get<BranchesResponse>(BRANCHES_URL, { params });
  }
}
