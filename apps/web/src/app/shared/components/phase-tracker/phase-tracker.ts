import { Component, computed, input } from "@angular/core";
import { CommonModule } from "@angular/common";

export interface Phase {
  key: string;
  label: string;
}

/**
 * Seguimiento visual de un documento: muestra en qué fase va (stepper).
 * Reutilizable en cualquier proceso — se le pasan las fases, la fase actual y,
 * opcionalmente, la clave de "cancelado" (estado terminal fuera del flujo).
 */
@Component({
  selector: "app-phase-tracker",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./phase-tracker.html",
  styleUrls: ["./phase-tracker.scss"],
})
export class PhaseTracker {
  phases = input<Phase[]>([]);
  current = input<string>("");
  /** Clave del estado cancelado/terminal fuera del flujo (opcional). */
  canceledKey = input<string | undefined>(undefined);

  readonly cancelado = computed(
    () => !!this.canceledKey() && this.current() === this.canceledKey(),
  );

  readonly currentIndex = computed(() =>
    this.phases().findIndex((p) => p.key === this.current()),
  );

  /** Estado visual de cada fase: hecha / actual / pendiente. */
  estado(i: number): "done" | "now" | "pend" {
    const idx = this.currentIndex();
    if (idx < 0) return "pend";
    if (i < idx) return "done";
    if (i === idx) return "now";
    return "pend";
  }
}
