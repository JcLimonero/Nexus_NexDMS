import { Component, OnInit, computed, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute, RouterModule } from "@angular/router";
import { forkJoin } from "rxjs";

import { AuthService } from "../../core/auth.service";
import {
  MecanicoApiService,
  MyServiceOrder,
  OrderUpdate,
  TimeSummary,
} from "../../core/mecanico-api.service";

@Component({
  selector: "app-orden-page",
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: "./orden.page.html",
  styleUrls: ["./orden.page.scss"],
})
export class OrdenPage implements OnInit {
  private api = inject(MecanicoApiService);
  private auth = inject(AuthService);
  private route = inject(ActivatedRoute);

  id = "";
  loading = signal(true);
  error = signal<string | null>(null);
  orden = signal<MyServiceOrder | null>(null);
  updates = signal<OrderUpdate[]>([]);
  timeSummaries = signal<TimeSummary[]>([]);
  busy = signal(false);
  toast = signal<string | null>(null);

  nuevaNota = "";
  nuevoHallazgo = "";
  hallazgoFile: File | null = null;

  /** Registro de tiempo del mecánico logueado */
  myTime = computed(() => {
    const uid = this.auth.user()?.id;
    return this.timeSummaries().find((t) => t.mechanicId === uid) ?? null;
  });

  running = computed(() => {
    const t = this.myTime();
    return !!t?.entries?.some((e) => !e.endedAt);
  });

  totalMin = computed(() => this.myTime()?.totalMinutes ?? 0);

  ngOnInit(): void {
    this.id = this.route.snapshot.paramMap.get("id") ?? "";
    this.load();
  }

  load(): void {
    this.loading.set(true);
    forkJoin({
      orden: this.api.getOrder(this.id),
      updates: this.api.getUpdates(this.id),
      time: this.api.getTimeSummary(this.id),
    }).subscribe({
      next: ({ orden, updates, time }) => {
        this.orden.set(orden);
        this.updates.set(updates);
        this.timeSummaries.set(time);
        this.loading.set(false);
        this.error.set(null);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.message || "Error al cargar la orden");
      },
    });
  }

  private refreshTime(): void {
    this.api.getTimeSummary(this.id).subscribe({
      next: (t) => this.timeSummaries.set(t),
    });
  }

  private showToast(msg: string): void {
    this.toast.set(msg);
    setTimeout(() => this.toast.set(null), 2500);
  }

  toggleTimer(): void {
    if (this.busy()) return;
    this.busy.set(true);
    const action = this.running()
      ? this.api.pauseTime(this.id)
      : this.api.startTime(this.id);
    action.subscribe({
      next: () => {
        this.busy.set(false);
        this.showToast(this.running() ? "Tiempo pausado" : "Tiempo iniciado");
        this.refreshTime();
      },
      error: (err) => {
        this.busy.set(false);
        this.showToast(err?.error?.message || "Error en el cronómetro");
      },
    });
  }

  changeStatus(status: string): void {
    if (this.busy()) return;
    this.busy.set(true);
    this.api.changeStatus(this.id, status).subscribe({
      next: () => {
        this.busy.set(false);
        this.showToast("Estatus actualizado");
        this.load();
      },
      error: (err) => {
        this.busy.set(false);
        this.showToast(err?.error?.message || "No se pudo cambiar el estatus");
      },
    });
  }

  addNota(): void {
    const msg = this.nuevaNota.trim();
    if (!msg || this.busy()) return;
    this.busy.set(true);
    this.api.addUpdate(this.id, msg).subscribe({
      next: () => {
        this.busy.set(false);
        this.nuevaNota = "";
        this.showToast("Avance registrado");
        this.api.getUpdates(this.id).subscribe({
          next: (u) => this.updates.set(u),
        });
      },
      error: (err) => {
        this.busy.set(false);
        this.showToast(err?.error?.message || "No se pudo registrar");
      },
    });
  }

  onHallazgoFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.hallazgoFile = input.files?.[0] ?? null;
  }

  addHallazgo(): void {
    const desc = this.nuevoHallazgo.trim();
    if (!desc || !this.hallazgoFile || this.busy()) return;
    this.busy.set(true);
    this.api.addFinding(this.id, desc, this.hallazgoFile).subscribe({
      next: () => {
        this.busy.set(false);
        this.nuevoHallazgo = "";
        this.hallazgoFile = null;
        this.showToast("Hallazgo reportado al asesor");
      },
      error: (err) => {
        this.busy.set(false);
        this.showToast(err?.error?.message || "No se pudo reportar");
      },
    });
  }

  // ─── Helpers ───
  statusLabel(s: string): string {
    return this.api.getStatusLabel(s);
  }

  vehicleLabel(): string {
    const o = this.orden();
    if (!o?.vehicle) return "";
    const v = [o.vehicle.brand ?? o.vehicle.make, o.vehicle.model, o.vehicle.year]
      .filter(Boolean)
      .join(" ");
    return o.vehicle.plate ? `${o.vehicle.plate} · ${v}` : v;
  }

  clientLabel(): string {
    const o = this.orden();
    if (!o?.client) return "";
    return (
      o.client.companyName ||
      [o.client.firstName, o.client.lastName].filter(Boolean).join(" ")
    );
  }

  timeLabel(): string {
    const min = this.totalMin();
    const h = Math.floor(min / 60);
    const m = min % 60;
    return h > 0 ? `${h} h ${m} min` : `${m} min`;
  }

  updateText(u: OrderUpdate): string {
    return u.message || u.comment || "";
  }

  dateLabel(iso: string): string {
    return new Date(iso).toLocaleString("es-MX", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  /** Transiciones válidas — espejo de STATUS_TRANSITIONS de la API. */
  nextStatuses(): { value: string; label: string }[] {
    const s = this.orden()?.status;
    const flow: Record<string, string[]> = {
      RECEIVED: ["DIAGNOSIS"],
      DIAGNOSIS: ["IN_PROGRESS"],
      IN_PROGRESS: ["WAITING_PARTS", "READY"],
      WAITING_PARTS: ["IN_PROGRESS"],
    };
    return (flow[s ?? ""] ?? []).map((v) => ({
      value: v,
      label: this.statusLabel(v),
    }));
  }
}
