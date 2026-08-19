import { Component, OnInit, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { RouterModule } from "@angular/router";
import { Subject } from "rxjs";
import { debounceTime, switchMap } from "rxjs/operators";

import { CatalogoService } from "../../catalogo.service";
import { VehicleTypesService } from "../../vehicle-types.service";
import {
  GlobalModel,
  GlobalModelsResponse,
  VehicleType,
} from "../../models/modelo-global.model";
import { FeatherIcons } from "../../../../shared/components/feather-icons/feather-icons";

@Component({
  selector: "app-variantes-list",
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, FeatherIcons],
  templateUrl: "./variantes-list.html",
  styleUrls: ["./variantes-list.scss"],
})
export class VariantesList implements OnInit {
  private catalogoService = inject(CatalogoService);
  private vehicleTypesService = inject(VehicleTypesService);

  models = signal<GlobalModel[]>([]);
  vehicleTypes = signal<VehicleType[]>([]);
  meta = signal<GlobalModelsResponse["meta"] | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);
  vehicleTypeFilter = signal<string>("");

  private searchSubject = new Subject<void>();

  ngOnInit(): void {
    this.vehicleTypesService.getAll().subscribe({
      next: (types) => this.vehicleTypes.set(types),
    });

    this.searchSubject
      .pipe(
        debounceTime(300),
        switchMap(() =>
          this.catalogoService.getAll({
            vehicleTypeId: this.vehicleTypeFilter() || undefined,
            page: this.meta()?.page ?? 1,
            limit: 20,
          })
        )
      )
      .subscribe({
        next: (res) => {
          this.models.set(res.data);
          this.meta.set(res.meta);
          this.loading.set(false);
          this.error.set(null);
        },
        error: (err) => {
          this.loading.set(false);
          this.error.set(err?.error?.message || "Error al cargar variantes");
        },
      });

    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.searchSubject.next();
  }

  onTypeFilterChange(value: string): void {
    this.vehicleTypeFilter.set(value);
    this.meta.update((m) => (m ? { ...m, page: 1 } : null));
    this.load();
  }

  goToPage(page: number): void {
    const m = this.meta();
    if (!m || page < 1 || page > m.totalPages) return;
    this.meta.update((prev) => (prev ? { ...prev, page } : null));
    this.load();
  }

  getDisplayLabel(model: GlobalModel): string {
    return this.catalogoService.getDisplayLabel(model);
  }

  getVehicleTypeLabel(model: GlobalModel): string {
    return this.catalogoService.getVehicleTypeLabel(model);
  }

  getCombustionTypeLabel(model: GlobalModel): string {
    return this.catalogoService.getCombustionTypeLabel(model);
  }
}
