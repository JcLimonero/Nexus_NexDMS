import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable, shareReplay } from "rxjs";
import { ClientTypeOption } from "./models/client-type.model";

const API_URL = "/api/v1/client-types";

@Injectable({
  providedIn: "root",
})
export class ClientTypesService {
  private http = inject(HttpClient);

  private cache$: Observable<ClientTypeOption[]> | null = null;

  getAll(): Observable<ClientTypeOption[]> {
    if (!this.cache$) {
      this.cache$ = this.http
        .get<ClientTypeOption[]>(API_URL)
        .pipe(shareReplay(1));
    }
    return this.cache$;
  }

  getLabelForCode(code: string, types: ClientTypeOption[]): string {
    const found = types.find((t) => t.code === code);
    return found?.label ?? code;
  }
}
