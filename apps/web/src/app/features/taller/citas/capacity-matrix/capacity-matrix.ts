import {
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { forkJoin } from "rxjs";

import { TallerService } from "../../taller.service";
import { CitasService, AvailableSlot } from "../citas.service";

export interface SlotSelection {
  mechanicId: string;
  mechanicName: string;
  start: string; // ISO
  end: string; // ISO
}

interface MatrixRow {
  mechanicId: string;
  mechanicName: string;
  /** huecos disponibles por hora (index = posición en hours()) */
  counts: number[];
  /** primer slot disponible por hora, para seleccionar con un clic */
  firstSlot: (AvailableSlot | null)[];
}

/**
 * Matriz de capacidad mecánico × hora ("Visión Diaria").
 * Cada celda muestra los huecos restantes; clic selecciona el primer
 * slot de esa hora para ese mecánico.
 */
@Component({
  selector: "app-capacity-matrix",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./capacity-matrix.html",
  styleUrls: ["./capacity-matrix.scss"],
})
export class CapacityMatrix {
  private tallerService = inject(TallerService);
  private citasService = inject(CitasService);

  branchId = input.required<string>();
  date = input.required<string>(); // YYYY-MM-DD
  serviceTypeId = input<string>("");
  durationMin = input<number | undefined>(undefined);

  slotSelected = output<SlotSelection>();

  loading = signal(false);
  error = signal<string | null>(null);
  rows = signal<MatrixRow[]>([]);
  hours = signal<number[]>([]);
  selected = signal<{ mechanicId: string; hour: number } | null>(null);

  totalSlots = computed(() =>
    this.rows().reduce((acc, r) => acc + r.counts.reduce((a, c) => a + c, 0), 0),
  );

  constructor() {
    effect(() => {
      const branchId = this.branchId();
      const date = this.date();
      const serviceTypeId = this.serviceTypeId();
      const durationMin = this.durationMin();
      if (!branchId || !date) {
        this.rows.set([]);
        return;
      }
      this.load(branchId, date, serviceTypeId, durationMin);
    });
  }

  private load(
    branchId: string,
    date: string,
    serviceTypeId: string,
    durationMin?: number,
  ): void {
    this.loading.set(true);
    this.error.set(null);
    this.selected.set(null);

    forkJoin({
      mechanics: this.tallerService.getMechanicsForBranch(branchId),
      slots: this.citasService.getSlots(branchId, date, {
        serviceTypeId: serviceTypeId || undefined,
        durationMin,
      }),
    }).subscribe({
      next: ({ mechanics, slots }) => {
        this.buildMatrix(mechanics, slots);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(
          err?.error?.message || "Error al cargar disponibilidad",
        );
      },
    });
  }

  private buildMatrix(
    mechanics: { id: string; firstName: string; lastName: string }[],
    slots: AvailableSlot[],
  ): void {
    if (slots.length === 0) {
      this.hours.set([]);
      this.rows.set(
        mechanics.map((m) => ({
          mechanicId: m.id,
          mechanicName: `${m.firstName} ${m.lastName}`,
          counts: [],
          firstSlot: [],
        })),
      );
      return;
    }

    // Rango de horas: del primer al último slot del día
    let minHour = 23;
    let maxHour = 0;
    for (const s of slots) {
      const h = new Date(s.start).getHours();
      if (h < minHour) minHour = h;
      if (h > maxHour) maxHour = h;
    }
    const hours: number[] = [];
    for (let h = minHour; h <= maxHour; h++) hours.push(h);
    this.hours.set(hours);

    const rows: MatrixRow[] = mechanics.map((m) => {
      const mSlots = slots.filter((s) => s.mechanicId === m.id);
      const counts = hours.map(
        (h) => mSlots.filter((s) => new Date(s.start).getHours() === h).length,
      );
      const firstSlot = hours.map((h) => {
        const inHour = mSlots
          .filter((s) => new Date(s.start).getHours() === h)
          .sort(
            (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime(),
          );
        return inHour[0] ?? null;
      });
      return {
        mechanicId: m.id,
        mechanicName: `${m.firstName} ${m.lastName}`,
        counts,
        firstSlot,
      };
    });
    this.rows.set(rows);
  }

  cellClass(count: number): string {
    if (count === 0) return "cell-none";
    if (count === 1) return "cell-low";
    return "cell-ok";
  }

  isSelected(mechanicId: string, hour: number): boolean {
    const sel = this.selected();
    return !!sel && sel.mechanicId === mechanicId && sel.hour === hour;
  }

  onCellClick(row: MatrixRow, hourIndex: number): void {
    const slot = row.firstSlot[hourIndex];
    if (!slot) return;
    this.selected.set({
      mechanicId: row.mechanicId,
      hour: this.hours()[hourIndex],
    });
    this.slotSelected.emit({
      mechanicId: row.mechanicId,
      mechanicName: row.mechanicName,
      start: slot.start,
      end: slot.end,
    });
  }

  formatHour(h: number): string {
    return `${String(h).padStart(2, "0")}:00`;
  }
}
