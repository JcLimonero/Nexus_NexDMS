import { Component, OnInit, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ActivatedRoute, RouterModule } from "@angular/router";
import { HttpClient } from "@angular/common/http";
import { toSignal } from "@angular/core/rxjs-interop";
import { map } from "rxjs";

import { ModulesService } from "../../shared/services/modules.service";
import { FeatherIcons } from "../../shared/components/feather-icons/feather-icons";

interface Kpi {
  label: string;
  value: number;
  format: "number" | "currency" | "percent" | "rating";
  tone?: "neutral" | "good" | "warn" | "bad";
  link?: string;
  hint?: string;
}

interface ModuleDashboardData {
  module: string;
  name: string;
  kpis: Kpi[];
  breakdown?: { title: string; items: { label: string; value: number }[] };
}

/**
 * Dashboard de módulo. Un solo componente sirve a todos los módulos:
 * la API decide qué indicadores manda y cómo se formatean, así que
 * agregar KPIs no requiere tocar el web.
 */
@Component({
  selector: "app-module-dashboard",
  standalone: true,
  imports: [CommonModule, RouterModule, FeatherIcons],
  templateUrl: "./module-dashboard.html",
  styleUrls: ["./module-dashboard.scss"],
})
export class ModuleDashboard implements OnInit {
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);
  modulesService = inject(ModulesService);

  /** Se re-lee en cada navegación para que /m/taller → /m/ventas recargue. */
  private key = toSignal(
    this.route.paramMap.pipe(map((p) => p.get("key") ?? "")),
    { initialValue: "" },
  );

  data = signal<ModuleDashboardData | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);

  ngOnInit(): void {
    this.route.paramMap.subscribe(() => this.load());
  }

  load(): void {
    const k = this.key();
    if (!k) return;
    this.loading.set(true);
    this.http
      .get<ModuleDashboardData>(`/api/v1/dashboard/module/${k}`)
      .subscribe({
        next: (d) => {
          this.data.set(d);
          this.loading.set(false);
          this.error.set(null);
        },
        error: (err) => {
          this.loading.set(false);
          this.error.set(
            err?.error?.message || "No se pudieron cargar los indicadores",
          );
        },
      });
  }

  moduleRoute(): string | null {
    return this.modulesService.get(this.key())?.route ?? null;
  }

  moduleIcon(): string {
    return this.modulesService.get(this.key())?.icon ?? "grid";
  }

  format(k: Kpi): string {
    switch (k.format) {
      case "currency":
        return k.value.toLocaleString("es-MX", {
          style: "currency",
          currency: "MXN",
          maximumFractionDigits: 0,
        });
      case "percent":
        return `${k.value}%`;
      case "rating":
        return k.value > 0 ? `${k.value} / 5` : "—";
      default:
        return k.value.toLocaleString("es-MX");
    }
  }

  maxBreakdown(): number {
    const items = this.data()?.breakdown?.items ?? [];
    return Math.max(1, ...items.map((i) => i.value));
  }
}
