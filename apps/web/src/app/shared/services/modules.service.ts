import { Injectable, computed, inject, signal } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable, map, of, tap } from "rxjs";

export interface AppModule {
  key: string;
  name: string;
  description: string;
  icon: string;
  route: string;
  hasDashboard: boolean;
}

export interface CatalogModule extends AppModule {
  minPlan: string;
  core: boolean;
  includedInPlan: boolean;
  active: boolean;
}

/**
 * Módulos licenciados del tenant. Es la fuente que alimenta el menú, el
 * guard de rutas y la pantalla de inicio: se consulta una vez por sesión
 * y se comparte desde aquí.
 */
@Injectable({ providedIn: "root" })
export class ModulesService {
  private http = inject(HttpClient);

  private loaded = signal(false);
  modules = signal<AppModule[]>([]);
  plan = signal<string>("");

  keys = computed(() => new Set(this.modules().map((m) => m.key)));

  /** Carga perezosa: la primera llamada consulta, las demás reutilizan. */
  load(force = false): Observable<AppModule[]> {
    if (this.loaded() && !force) return of(this.modules());
    return this.http
      .get<{ plan: string; modules: AppModule[] }>("/api/v1/modules/me")
      .pipe(
        tap((res) => {
          this.plan.set(res.plan);
          this.modules.set(res.modules);
          this.loaded.set(true);
        }),
        map((res) => res.modules),
      );
  }

  has(key: string): boolean {
    return this.keys().has(key);
  }

  get(key: string): AppModule | undefined {
    return this.modules().find((m) => m.key === key);
  }

  /** Catálogo completo para la pantalla de administración. */
  catalog(): Observable<{ plan: string; modules: CatalogModule[] }> {
    return this.http.get<{ plan: string; modules: CatalogModule[] }>(
      "/api/v1/modules/catalog",
    );
  }

  setModules(
    keys: string[] | null,
  ): Observable<{ plan: string; modules: CatalogModule[] }> {
    return this.http
      .patch<{ plan: string; modules: CatalogModule[] }>("/api/v1/modules/me", {
        modules: keys,
      })
      .pipe(tap(() => this.loaded.set(false)));
  }
}
