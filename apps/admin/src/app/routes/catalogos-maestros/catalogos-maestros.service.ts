import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";

export interface CampoDef {
  prop: string;
  label: string;
  type: "string" | "number" | "boolean";
  required?: boolean;
}

export interface CatalogoMaestro {
  key: string;
  label: string;
  fields: CampoDef[];
  count: number;
}

export type EntradaCatalogo = Record<string, unknown> & { id: string };

@Injectable({ providedIn: "root" })
export class CatalogosMaestrosService {
  private http = inject(HttpClient);
  private base = "/api/v1/master-catalogs";

  catalogos(): Observable<CatalogoMaestro[]> {
    return this.http.get<CatalogoMaestro[]>(this.base);
  }

  entradas(key: string): Observable<EntradaCatalogo[]> {
    return this.http.get<EntradaCatalogo[]>(`${this.base}/${key}`);
  }

  crear(key: string, body: Record<string, unknown>): Observable<EntradaCatalogo> {
    return this.http.post<EntradaCatalogo>(`${this.base}/${key}`, body);
  }

  actualizar(
    key: string,
    id: string,
    body: Record<string, unknown>,
  ): Observable<EntradaCatalogo> {
    return this.http.patch<EntradaCatalogo>(`${this.base}/${key}/${id}`, body);
  }

  eliminar(key: string, id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${key}/${id}`);
  }
}
