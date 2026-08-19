import { Component, OnInit, computed, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { RouterModule } from "@angular/router";

import { InventarioUnidadesService } from "../../inventario-unidades.service";
import { BranchesService } from "../../../inventario-refacciones/services/branches.service";
import { UnitLocation } from "../../models/unit-location.model";
import { FeatherIcons } from "../../../../shared/components/feather-icons/feather-icons";

@Component({
  selector: "app-unidades-ubicaciones-list",
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, FeatherIcons],
  templateUrl: "./ubicaciones-list.html",
  styleUrls: ["./ubicaciones-list.scss"],
})
export class UbicacionesList implements OnInit {
  private inventarioService = inject(InventarioUnidadesService);
  private branchesService = inject(BranchesService);

  ubicaciones = signal<UnitLocation[]>([]);
  branches = signal<{ id: string; name: string }[]>([]);
  selectedBranchId = signal<string>("");
  loading = signal(true);
  error = signal<string | null>(null);
  searchFilter = signal<string>("");

  // Filtrado client-side: la lista llega completa (sin paginar) por sucursal.
  ubicacionesFiltradas = computed(() => {
    const term = this.searchFilter().trim().toLowerCase();
    if (!term) return this.ubicaciones();
    return this.ubicaciones().filter((loc) =>
      [loc.code, loc.zone, this.getZoneLabel(loc.zone), loc.space, loc.description]
        .filter((v): v is string => !!v)
        .some((v) => v.toLowerCase().includes(term)),
    );
  });

  ngOnInit(): void {
    this.branchesService.getAll().subscribe({
      next: (res) => {
        this.branches.set(res.data.map((b) => ({ id: b.id, name: b.name })));
        const first = res.data[0];
        if (first) {
          this.selectedBranchId.set(first.id);
          this.load();
        } else {
          this.loading.set(false);
        }
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.message || "Error al cargar sucursales");
      },
    });
  }

  onBranchChange(branchId: string): void {
    this.selectedBranchId.set(branchId);
    this.load();
  }

  load(): void {
    const branchId = this.selectedBranchId();
    if (!branchId) {
      this.ubicaciones.set([]);
      this.loading.set(false);
      return;
    }
    this.loading.set(true);
    this.inventarioService.getLocations(branchId).subscribe({
      next: (data) => {
        this.ubicaciones.set(data);
        this.loading.set(false);
        this.error.set(null);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.message || "Error al cargar ubicaciones");
      },
    });
  }

  getZoneLabel(zone: string): string {
    return this.inventarioService.getZoneLabel(zone);
  }
}
