import {
  Component,
  input,
  output,
  signal,
  computed,
  effect,
  inject,
  DestroyRef,
} from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";

import { VehicleColorsService } from "../vehicle-colors.service";
import type { VehicleColor } from "../vehicle-colors.service";

export type VehicleCatalogComboType = "exterior_color" | "interior_color";

@Component({
  selector: "app-vehicle-catalog-combo",
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="position-relative">
      <select
        class="form-select"
        [ngModel]="selectedId()"
        [disabled]="disabled()"
        (ngModelChange)="onSelectChange($event)"
      >
        <option value="">{{ placeholder() }}</option>
        @for (item of options(); track item.id) {
          <option [value]="item.id">{{ item.name }}</option>
        }
      </select>
      @if (allowCreate() && versionId()) {
        <button
          type="button"
          class="btn btn-link btn-sm position-absolute end-0 top-50 translate-middle-y"
          style="text-decoration: none; padding: 0 0.5rem"
          (click)="createRequested.emit()"
          title="Crear nuevo"
        >
          <i class="icofont icofont-plus"></i>
        </button>
      }
    </div>
  `,
})
export class VehicleCatalogCombo {
  private vehicleColorsService = inject(VehicleColorsService);
  private destroyRef = inject(DestroyRef);

  versionId = input.required<string>();
  colorType = input.required<VehicleCatalogComboType>();
  selectedId = input<string>("");
  placeholder = input<string>("Seleccionar...");
  disabled = input(false);
  allowCreate = input(true);

  selected = output<VehicleColor | null>();
  createRequested = output<void>();

  options = signal<VehicleColor[]>([]);

  constructor() {
    effect(
      () => {
        const vId = this.versionId();
        const cType = this.colorType();
        if (!vId) {
          this.options.set([]);
          return;
        }
        const type = cType === "exterior_color" ? "EXTERIOR" : "INTERIOR";
        this.vehicleColorsService
          .findByVersion(vId, type)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: (colors) => this.options.set(colors),
            error: () => this.options.set([]),
          });
      },
      { allowSignalWrites: true }
    );
  }

  onSelectChange(id: string): void {
    if (!id) {
      this.selected.emit(null);
      return;
    }
    const item = this.options().find((o) => o.id === id);
    this.selected.emit(item ?? null);
  }
}
