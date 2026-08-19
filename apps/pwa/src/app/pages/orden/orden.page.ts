import { Component, OnInit, computed, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute, RouterModule } from "@angular/router";
import { forkJoin } from "rxjs";

import { AuthService } from "../../core/auth.service";
import { DictadoService } from "../../core/dictado.service";
import {
  FichajeActual,
  MecanicoApiService,
  MyServiceOrder,
  Operacion,
  OrderUpdate,
  TimeSummary,
} from "../../core/mecanico-api.service";

/** Lo que el técnico elige al reportar un trabajo adicional. */
const CRITICIDADES = [
  { value: "BAJA", label: "Puede esperar" },
  { value: "MEDIA", label: "Conviene hacerlo" },
  { value: "ALTA", label: "Urgente / seguridad" },
];

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
  readonly dictado = inject(DictadoService);
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
  readonly criticidades = CRITICIDADES;
  hallazgoCriticidad = "MEDIA";
  hallazgoMinutos = 30;

  /** Operaciones de la orden y dónde estoy fichado. */
  operaciones = signal<Operacion[]>([]);
  fichaje = signal<FichajeActual | null>(null);

  /** Registro de tiempo del técnico logueado */
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
      operaciones: this.api.getOperaciones(this.id),
      fichaje: this.api.fichajeActual(),
    }).subscribe({
      next: ({ orden, updates, time, operaciones, fichaje }) => {
        this.orden.set(orden);
        this.updates.set(updates);
        this.timeSummaries.set(time);
        this.operaciones.set(operaciones);
        this.fichaje.set(fichaje);
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
    this.api
      .addFinding(this.id, desc, this.hallazgoFile, {
        criticality: this.hallazgoCriticidad,
        estimatedMinutes: this.hallazgoMinutos,
      })
      .subscribe({
        next: () => {
          this.busy.set(false);
          this.nuevoHallazgo = "";
          this.hallazgoFile = null;
          this.hallazgoCriticidad = "MEDIA";
          this.hallazgoMinutos = 30;
          this.showToast("Hallazgo enviado al asesor para cotizar");
        },
        error: (err) => {
          this.busy.set(false);
          this.showToast(err?.error?.message || "No se pudo reportar");
        },
      });
  }

  // ─── Fichaje por operación ─────────────────────────────────

  private refrescarOperaciones(): void {
    this.api.getOperaciones(this.id).subscribe({
      next: (ops) => this.operaciones.set(ops),
    });
    this.api.fichajeActual().subscribe({ next: (f) => this.fichaje.set(f) });
  }

  fichar(op: Operacion): void {
    if (this.busy()) return;
    this.busy.set(true);
    this.api.ficharOperacion(op.id).subscribe({
      next: (r) => {
        this.busy.set(false);
        // Si venía fichado en otra, la API la cerró sola: hay que decirlo,
        // porque el técnico necesita saber dónde quedó su tiempo.
        const cerro = (r as { cerroAnterior?: string | null })?.cerroAnterior;
        this.showToast(
          cerro ? "Se cerró tu operación anterior" : "Fichaje iniciado",
        );
        this.refrescarOperaciones();
      },
      error: (err) => {
        this.busy.set(false);
        this.showToast(err?.error?.message || "No se pudo fichar");
      },
    });
  }

  pausar(op: Operacion): void {
    if (this.busy()) return;
    this.busy.set(true);
    this.api.pausarOperacion(op.id).subscribe({
      next: () => {
        this.busy.set(false);
        this.showToast("Fichaje pausado");
        this.refrescarOperaciones();
      },
      error: (err) => {
        this.busy.set(false);
        this.showToast(err?.error?.message || "No se pudo pausar");
      },
    });
  }

  terminar(op: Operacion): void {
    if (this.busy()) return;
    this.busy.set(true);
    this.api.terminarOperacion(op.id).subscribe({
      next: () => {
        this.busy.set(false);
        this.showToast("Operación terminada");
        this.refrescarOperaciones();
      },
      error: (err) => {
        this.busy.set(false);
        this.showToast(err?.error?.message || "No se pudo terminar");
      },
    });
  }

  /** "1 h 20 min" — el técnico no lee minutos sueltos de tres dígitos. */
  /** Dicta el hallazgo en vez de escribirlo. */
  dictarHallazgo(): void {
    this.dictado.alternar((texto) => (this.nuevoHallazgo = texto));
  }

  hm(min: number): string {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return h > 0 ? `${h} h ${m} min` : `${m} min`;
  }

  /** Cómo va contra el baremo: es la lectura que importa de un vistazo. */
  desvio(op: Operacion): { texto: string; tono: "ok" | "alerta" } | null {
    if (op.deviationMinutes === null) return null;
    const d = op.deviationMinutes;
    if (d <= 0) {
      return { texto: `${this.hm(-d)} bajo baremo`, tono: "ok" };
    }
    return { texto: `${this.hm(d)} sobre baremo`, tono: "alerta" };
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
