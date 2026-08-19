import { Component, OnInit, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { RouterModule } from "@angular/router";
import { Subject } from "rxjs";
import { debounceTime, switchMap } from "rxjs/operators";

import { InventarioUnidadesService } from "../../inventario-unidades.service";
import { BranchesService } from "../../../inventario-refacciones/services/branches.service";
import { VehicleTypesService } from "../../../catalogo/vehicle-types.service";
import type { VehicleType } from "../../../catalogo/models/modelo-global.model";
import {
  CatalogUnit,
  CatalogUnitVehicleType,
  CatalogUnitStatus,
} from "../../models/catalog-unit.model";
import { FeatherIcons } from "../../../../shared/components/feather-icons/feather-icons";

@Component({
  selector: "app-unidades-list",
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, FeatherIcons],
  templateUrl: "./unidades-list.html",
  styleUrls: ["./unidades-list.scss"],
})
export class UnidadesList implements OnInit {
  private inventarioService = inject(InventarioUnidadesService);
  private branchesService = inject(BranchesService);
  private vehicleTypesService = inject(VehicleTypesService);

  unidades = signal<CatalogUnit[]>([]);
  vehicleTypes = signal<{ code: string; label: string }[]>([]);
  branches = signal<{ id: string; name: string }[]>([]);
  meta = signal<{ total: number; page: number; limit: number; totalPages: number } | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);
  searchTerm = signal("");
  vehicleTypeFilter = signal<string>("");
  statusFilter = signal<string>("");
  branchFilter = signal<string>("");

  private searchSubject = new Subject<void>();

  ngOnInit(): void {
    this.branchesService.getAll().subscribe({
      next: (res) => this.branches.set(res.data.map((b) => ({ id: b.id, name: b.name }))),
    });
    this.vehicleTypesService.getAll().subscribe({
      next: (types: VehicleType[]) =>
        this.vehicleTypes.set(types.map((t) => ({ code: t.code, label: t.label }))),
    });

    this.searchSubject
      .pipe(
        debounceTime(300),
        switchMap(() =>
          this.inventarioService.getUnits({
            search: this.searchTerm() || undefined,
            vehicleType:
              this.vehicleTypeFilter() as CatalogUnitVehicleType | undefined,
            status: this.statusFilter() as CatalogUnitStatus | undefined,
            branchId: this.branchFilter() || undefined,
            page: this.meta()?.page ?? 1,
            limit: 20,
          }),
        ),
      )
      .subscribe({
        next: (res) => {
          this.unidades.set(res.data);
          this.meta.set(res.meta);
          this.loading.set(false);
          this.error.set(null);
        },
        error: (err) => {
          this.loading.set(false);
          this.error.set(err?.error?.message || "Error al cargar unidades");
        },
      });

    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.searchSubject.next();
  }

  onSearchChange(value: string): void {
    this.searchTerm.set(value);
    this.meta.update((m) => (m ? { ...m, page: 1 } : null));
    this.load();
  }

  onVehicleTypeFilterChange(value: string): void {
    this.vehicleTypeFilter.set(value);
    this.meta.update((m) => (m ? { ...m, page: 1 } : null));
    this.load();
  }

  onStatusFilterChange(value: string): void {
    this.statusFilter.set(value);
    this.meta.update((m) => (m ? { ...m, page: 1 } : null));
    this.load();
  }

  onBranchFilterChange(value: string): void {
    this.branchFilter.set(value);
    this.meta.update((m) => (m ? { ...m, page: 1 } : null));
    this.load();
  }

  goToPage(page: number): void {
    const m = this.meta();
    if (!m || page < 1 || page > m.totalPages) return;
    this.meta.update((prev) => (prev ? { ...prev, page } : null));
    this.load();
  }

  getVehicleTypeLabel(type: string): string {
    return this.inventarioService.getVehicleTypeLabel(type);
  }

  getStatusLabel(status: string): string {
    return this.inventarioService.getStatusLabel(status as CatalogUnitStatus);
  }

  getConditionLabel(condition: string): string {
    return this.inventarioService.getConditionLabel(condition);
  }

  getDisplayLabel(u: CatalogUnit): string {
    const v = u.version ? ` ${u.version}` : "";
    return `${u.brand} ${u.model}${v} (${u.year}) - ${u.color}`;
  }
}
