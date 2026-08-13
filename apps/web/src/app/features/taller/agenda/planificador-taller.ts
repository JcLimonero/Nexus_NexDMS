import { Component, OnInit, computed, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { RouterModule } from "@angular/router";
import { forkJoin } from "rxjs";

import { CitasService, Appointment } from "../citas/citas.service";
import { TallerService } from "../taller.service";
import { BranchesService } from "../../inventario-refacciones/services/branches.service";
import { FeatherIcons } from "../../../shared/components/feather-icons/feather-icons";

interface TimelineBlock {
  appointment: Appointment;
  /** posición y ancho en % del ancho del carril */
  leftPct: number;
  widthPct: number;
  label: string;
  sublabel: string;
  statusClass: string;
}

interface MechanicLane {
  mechanicId: string;
  mechanicName: string;
  initials: string;
  blocks: TimelineBlock[];
  totalMin: number;
}

/**
 * Planificador de taller — timeline técnico × hora.
 * Cada técnico es una fila; sus citas del día se pintan como bloques
 * proporcionales a su duración (estilo "Planificador de trabajos").
 */
@Component({
  selector: "app-planificador-taller",
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, FeatherIcons],
  templateUrl: "./planificador-taller.html",
  styleUrls: ["./planificador-taller.scss"],
})
export class PlanificadorTaller implements OnInit {
  private citasService = inject(CitasService);
  private tallerService = inject(TallerService);
  private branchesService = inject(BranchesService);

  branches = signal<{ id: string; name: string }[]>([]);
  branchId = signal<string>("");
  date = signal<string>(new Date().toISOString().slice(0, 10));

  loading = signal(true);
  error = signal<string | null>(null);
  lanes = signal<MechanicLane[]>([]);

  /** Rango visible del día */
  readonly startHour = 8;
  readonly endHour = 19;

  hours = computed(() => {
    const out: number[] = [];
    for (let h = this.startHour; h < this.endHour; h++) out.push(h);
    return out;
  });

  totalCitas = computed(() =>
    this.lanes().reduce((acc, l) => acc + l.blocks.length, 0),
  );

  ngOnInit(): void {
    this.branchesService.getAll().subscribe({
      next: (res) => {
        this.branches.set(res.data.map((b) => ({ id: b.id, name: b.name })));
        if (res.data.length > 0 && !this.branchId()) {
          this.branchId.set(res.data[0].id);
          this.load();
        }
      },
      error: () => {
        this.loading.set(false);
        this.error.set("Error al cargar sucursales");
      },
    });
  }

  load(): void {
    const branchId = this.branchId();
    if (!branchId) return;
    this.loading.set(true);
    const date = this.date();
    forkJoin({
      mechanics: this.tallerService.getMechanicsForBranch(branchId),
      citas: this.citasService.getAppointments({
        branchId,
        dateFrom: date,
        dateTo: date,
        limit: 100,
      }),
    }).subscribe({
      next: ({ mechanics, citas }) => {
        this.buildLanes(mechanics, citas.data);
        this.loading.set(false);
        this.error.set(null);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.message || "Error al cargar planificador");
      },
    });
  }

  private buildLanes(
    mechanics: { id: string; firstName: string; lastName: string }[],
    citas: Appointment[],
  ): void {
    const rangeMin = (this.endHour - this.startHour) * 60;
    const active = citas.filter(
      (c) => c.status !== "CANCELLED" && c.status !== "NO_SHOW",
    );

    const lanes: MechanicLane[] = mechanics.map((m) => {
      const own = active.filter((c) => c.mechanicId === m.id);
      const blocks: TimelineBlock[] = own.map((c) => {
        const start = new Date(c.scheduledAt);
        const minutesFromStart =
          (start.getHours() - this.startHour) * 60 + start.getMinutes();
        const dur = c.durationMin || 60;
        const leftPct = Math.max(0, (minutesFromStart / rangeMin) * 100);
        const widthPct = Math.min(
          100 - leftPct,
          Math.max(2, (dur / rangeMin) * 100),
        );
        return {
          appointment: c,
          leftPct,
          widthPct,
          label: this.blockLabel(c),
          sublabel: c.serviceType,
          statusClass: this.statusClass(c.status),
        };
      });
      return {
        mechanicId: m.id,
        mechanicName: `${m.firstName} ${m.lastName}`,
        initials: `${m.firstName[0] ?? ""}${m.lastName[0] ?? ""}`.toUpperCase(),
        blocks,
        totalMin: own.reduce((acc, c) => acc + (c.durationMin || 60), 0),
      };
    });

    // Sin asignar al final (citas del día sin técnico)
    const unassigned = active.filter((c) => !c.mechanicId);
    if (unassigned.length > 0) {
      lanes.push({
        mechanicId: "",
        mechanicName: "Sin asignar",
        initials: "?",
        blocks: unassigned.map((c) => {
          const start = new Date(c.scheduledAt);
          const minutesFromStart =
            (start.getHours() - this.startHour) * 60 + start.getMinutes();
          const dur = c.durationMin || 60;
          const leftPct = Math.max(0, (minutesFromStart / rangeMin) * 100);
          return {
            appointment: c,
            leftPct,
            widthPct: Math.min(100 - leftPct, Math.max(2, (dur / rangeMin) * 100)),
            label: this.blockLabel(c),
            sublabel: c.serviceType,
            statusClass: "block-unassigned",
          };
        }),
        totalMin: unassigned.reduce((acc, c) => acc + (c.durationMin || 60), 0),
      });
    }

    this.lanes.set(lanes);
  }

  private blockLabel(c: Appointment): string {
    if (c.vehicle) {
      const v = [c.vehicle.brand, c.vehicle.model].filter(Boolean).join(" ");
      return c.vehicle.plate ? `${c.vehicle.plate} · ${v}` : v;
    }
    if (c.client) {
      return (
        c.client.companyName ||
        [c.client.firstName, c.client.lastName].filter(Boolean).join(" ")
      );
    }
    return c.clientName || "Cita";
  }

  private statusClass(status: string): string {
    const map: Record<string, string> = {
      PENDING_CONFIRMATION: "block-pending",
      SCHEDULED: "block-scheduled",
      CONFIRMED: "block-confirmed",
      COMPLETED: "block-completed",
    };
    return map[status] ?? "block-scheduled";
  }

  onBranchChange(id: string): void {
    this.branchId.set(id);
    this.load();
  }

  onDateChange(d: string): void {
    this.date.set(d);
    this.load();
  }

  shiftDate(days: number): void {
    const d = new Date(this.date() + "T12:00:00");
    d.setDate(d.getDate() + days);
    this.onDateChange(d.toISOString().slice(0, 10));
  }

  today(): void {
    this.onDateChange(new Date().toISOString().slice(0, 10));
  }

  formatHour(h: number): string {
    return `${String(h).padStart(2, "0")}:00`;
  }

  hourLabel(iso: string): string {
    return new Date(iso).toLocaleTimeString("es-MX", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  loadLabel(l: MechanicLane): string {
    const hrs = Math.round((l.totalMin / 60) * 10) / 10;
    return l.totalMin > 0 ? `${hrs} h ocupadas` : "Libre";
  }

  blockTooltip(b: TimelineBlock): string {
    const c = b.appointment;
    return `${b.label} — ${b.sublabel}\n${this.hourLabel(c.scheduledAt)} · ${c.durationMin || 60} min`;
  }
}
