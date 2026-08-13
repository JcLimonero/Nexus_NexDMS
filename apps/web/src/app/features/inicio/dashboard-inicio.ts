import { Component, OnInit, computed, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { HttpClient, HttpParams } from "@angular/common/http";
import { RouterModule } from "@angular/router";

import { BranchesService } from "../inventario-refacciones/services/branches.service";
import { FormsModule } from "@angular/forms";
import { FeatherIcons } from "../../shared/components/feather-icons/feather-icons";
import { ModulesService } from "../../shared/services/modules.service";

interface DashboardSummary {
  taller: {
    ordenesActivas: number;
    porEstatus: { status: string; count: number }[];
    entregadasMes: number;
    citasHoy: number;
  };
  ventas: { unidadesMes: number; montoMes: number; enProceso: number };
  caja: { ticketsHoy: number; ingresosHoy: number };
  almacen: { piezasBajoMinimo: number };
  satisfaccion: { encuestasRespondidas: number; promedio: number };
}

const STATUS_LABELS: Record<string, string> = {
  RECEIVED: "Recibida",
  DIAGNOSIS: "Diagnóstico",
  IN_PROGRESS: "En progreso",
  WAITING_PARTS: "Esp. refacciones",
  READY: "Listas",
};

@Component({
  selector: "app-dashboard-inicio",
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, FeatherIcons],
  templateUrl: "./dashboard-inicio.html",
  styleUrls: ["./dashboard-inicio.scss"],
})
export class DashboardInicio implements OnInit {
  private http = inject(HttpClient);
  private branchesService = inject(BranchesService);
  modulesService = inject(ModulesService);

  /** Módulos con dashboard propio, para los accesos del inicio. */
  modulosConDashboard = computed(() =>
    this.modulesService.modules().filter((m) => m.hasDashboard),
  );

  loading = signal(true);
  error = signal<string | null>(null);
  data = signal<DashboardSummary | null>(null);
  branches = signal<{ id: string; name: string }[]>([]);
  branchId = signal<string>("");

  readonly hoy = new Date().toLocaleDateString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  ngOnInit(): void {
    this.branchesService.getAll().subscribe({
      next: (res) =>
        this.branches.set(res.data.map((b) => ({ id: b.id, name: b.name }))),
    });
    this.load();
  }

  load(): void {
    this.loading.set(true);
    let params = new HttpParams();
    if (this.branchId()) params = params.set("branchId", this.branchId());
    this.http
      .get<DashboardSummary>("/api/v1/dashboard/summary", { params })
      .subscribe({
        next: (d) => {
          this.data.set(d);
          this.loading.set(false);
          this.error.set(null);
        },
        error: (err) => {
          this.loading.set(false);
          this.error.set(err?.error?.message || "Error al cargar indicadores");
        },
      });
  }

  onBranchChange(id: string): void {
    this.branchId.set(id);
    this.load();
  }

  statusLabel(s: string): string {
    return STATUS_LABELS[s] ?? s;
  }

  money(n: number): string {
    return n.toLocaleString("es-MX", {
      style: "currency",
      currency: "MXN",
      maximumFractionDigits: 0,
    });
  }

  maxStatusCount(): number {
    const d = this.data();
    if (!d) return 1;
    return Math.max(1, ...d.taller.porEstatus.map((s) => s.count));
  }
}
