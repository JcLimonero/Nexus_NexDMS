import { Component, computed, input, output } from "@angular/core";
import { CommonModule } from "@angular/common";
import { Phase } from "../phase-tracker/phase-tracker";

export interface BoardItem {
  id: string;
  code: string;
  title: string;
  subtitle?: string;
  phaseKey: string;
}

/**
 * Tablero por fase (kanban): una columna por fase, tarjetas = documentos en esa
 * fase. Reutilizable por cualquier proceso; se le pasan las fases y los items.
 * Al hacer clic en una tarjeta emite su id (para abrir el detalle).
 */
@Component({
  selector: "app-phase-board",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./phase-board.html",
  styleUrls: ["./phase-board.scss"],
})
export class PhaseBoard {
  phases = input<Phase[]>([]);
  items = input<BoardItem[]>([]);
  loading = input<boolean>(false);
  abrir = output<string>();

  /** Items agrupados por fase, en el orden de las fases. */
  readonly columnas = computed(() =>
    this.phases().map((p) => ({
      phase: p,
      items: this.items().filter((it) => it.phaseKey === p.key),
    })),
  );

  /** Items cuyo status no cae en ninguna fase (p. ej. cancelados). */
  readonly fuera = computed(() => {
    const keys = new Set(this.phases().map((p) => p.key));
    return this.items().filter((it) => !keys.has(it.phaseKey));
  });
}
