import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";

const URL = "/api/v1/unit-accessories";

export interface CompatibilidadAccesorio {
  id: string;
  globalModelId: string;
  globalModel?: {
    id: string;
    model: string;
    version: string;
    year: number;
    brand?: { name: string };
  };
}

export interface Accesorio {
  id: string;
  name: string;
  sku: string | null;
  price: number;
  satProductKey: string | null;
  description: string | null;
  /** Monta en cualquier unidad; no necesita lista de modelos. */
  isUniversal: boolean;
  category: string | null;
  isActive: boolean;
  compatibilities?: CompatibilidadAccesorio[];
}

export interface NuevoAccesorio {
  name: string;
  sku?: string;
  price: number;
  satProductKey?: string;
  description?: string;
  isUniversal?: boolean;
  category?: string;
  isActive?: boolean;
  globalModelIds?: string[];
}

@Injectable({ providedIn: "root" })
export class AccesoriosService {
  private http = inject(HttpClient);

  listar(incluirInactivos = true): Observable<Accesorio[]> {
    return this.http.get<Accesorio[]>(
      `${URL}?incluirInactivos=${incluirInactivos}`,
    );
  }

  crear(dto: NuevoAccesorio): Observable<Accesorio> {
    return this.http.post<Accesorio>(URL, dto);
  }

  actualizar(id: string, dto: Partial<NuevoAccesorio>): Observable<Accesorio> {
    return this.http.patch<Accesorio>(`${URL}/${id}`, dto);
  }

  eliminar(id: string): Observable<void> {
    return this.http.delete<void>(`${URL}/${id}`);
  }

  /** Los que montan en esa unidad: universales más los de su modelo. */
  compatibles(catalogUnitId: string): Observable<Accesorio[]> {
    return this.http.get<Accesorio[]>(
      `${URL}/compatible?catalogUnitId=${catalogUnitId}`,
    );
  }
}
