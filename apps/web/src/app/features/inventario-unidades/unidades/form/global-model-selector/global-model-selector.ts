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

import { CatalogoService } from "../../../../catalogo/catalogo.service";
import { GlobalBrandsService } from "../../../../catalogo/global-brands.service";
import { VehicleTypesService } from "../../../../catalogo/vehicle-types.service";
import type { GlobalModel } from "../../../../catalogo/models/modelo-global.model";

@Component({
  selector: "app-global-model-selector",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./global-model-selector.html",
  styleUrls: ["./global-model-selector.scss"],
})
export class GlobalModelSelector {
  private catalogoService = inject(CatalogoService);
  private globalBrandsService = inject(GlobalBrandsService);
  private vehicleTypesService = inject(VehicleTypesService);
  private destroyRef = inject(DestroyRef);

  brandName = input.required<string>();
  vehicleTypeCode = input<string>("CAR");
  selectedModel = input<GlobalModel | null>(null);
  initialDisplay = input<string>("");
  disabled = input(false);

  modelSelected = output<GlobalModel | null>();
  createRequested = output<void>();

  searchTerm = signal("");
  showDropdown = signal(false);
  allModels = signal<GlobalModel[]>([]);
  loading = signal(false);

  filteredModels = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const models = this.allModels();
    if (!term) return models.slice(0, 50);
    return models.filter(
      (m) =>
        m.model.toLowerCase().includes(term) ||
        (m.version?.toLowerCase().includes(term) ?? false) ||
        (m.brand?.name?.toLowerCase().includes(term) ?? false)
    );
  });

  displayValue = computed(() => {
    const sel = this.selectedModel();
    if (sel) return this.getModelLabel(sel);
    return this.searchTerm() || this.initialDisplay() || "Buscar o seleccionar modelo...";
  });

  constructor() {
    effect(
      () => {
        const brand = this.brandName();
        const vtCode = this.vehicleTypeCode();
        if (!brand?.trim()) {
          this.allModels.set([]);
          this.loading.set(false);
          return;
        }
        this.loadModels(brand.trim(), vtCode || "CAR");
      },
      { allowSignalWrites: true }
    );

    effect(() => {
      const sel = this.selectedModel();
      const initial = this.initialDisplay();
      if (sel) {
        this.searchTerm.set(this.getModelLabel(sel));
      } else if (initial) {
        this.searchTerm.set(initial);
      }
    });
  }

  private loadModels(brandName: string, vehicleTypeCode: string): void {
    this.loading.set(true);
    this.globalBrandsService.getAll().subscribe({
      next: (brands) => {
        const brand = brands.find(
          (b) => b.name.toLowerCase() === brandName.toLowerCase()
        );
        if (!brand) {
          this.allModels.set([]);
          this.loading.set(false);
          return;
        }
        this.vehicleTypesService.getAll().subscribe({
          next: (types) => {
            const vt = types.find(
              (t) => t.code.toLowerCase() === vehicleTypeCode.toLowerCase()
            );
            if (!vt) {
              this.allModels.set([]);
              this.loading.set(false);
              return;
            }
            this.catalogoService
              .getAll({
                brandId: brand.id,
                vehicleTypeId: vt.id,
                isActive: true,
                limit: 500,
              })
              .pipe(takeUntilDestroyed(this.destroyRef))
              .subscribe({
                next: (res) => {
                  this.allModels.set(res.data);
                  this.loading.set(false);
                },
                error: () => {
                  this.allModels.set([]);
                  this.loading.set(false);
                },
              });
          },
          error: () => {
            this.allModels.set([]);
            this.loading.set(false);
          },
        });
      },
      error: () => {
        this.allModels.set([]);
        this.loading.set(false);
      },
    });
  }

  getModelLabel(m: GlobalModel): string {
    return this.catalogoService.getDisplayLabel(m);
  }

  onFocus(): void {
    this.showDropdown.set(true);
  }

  onBlur(): void {
    setTimeout(() => this.showDropdown.set(false), 150);
  }

  onSearchInput(value: string): void {
    this.searchTerm.set(value);
    this.showDropdown.set(true);
  }

  selectModel(model: GlobalModel): void {
    this.modelSelected.emit(model);
    this.searchTerm.set(this.getModelLabel(model));
    this.showDropdown.set(false);
  }

  clearSelection(): void {
    this.modelSelected.emit(null);
    this.searchTerm.set("");
  }

  onCreateClick(): void {
    this.createRequested.emit();
    this.showDropdown.set(false);
  }
}
