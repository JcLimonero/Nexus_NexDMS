import { Component, OnInit, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { RouterModule } from "@angular/router";

import { InventarioRefaccionesService } from "../../inventario-refacciones.service";
import { BranchesService } from "../../services/branches.service";
import { StockLocation } from "../../models/stock-location.model";
import { FeatherIcons } from "../../../../shared/components/feather-icons/feather-icons";

@Component({
  selector: "app-ubicaciones-list",
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, FeatherIcons],
  templateUrl: "./ubicaciones-list.html",
  styleUrls: ["./ubicaciones-list.scss"],
})
export class UbicacionesList implements OnInit {
  private inventarioService = inject(InventarioRefaccionesService);
  private branchesService = inject(BranchesService);

  ubicaciones = signal<StockLocation[]>([]);
  branches = signal<{ id: string; name: string }[]>([]);
  selectedBranchId = signal<string>("");
  loading = signal(true);
  error = signal<string | null>(null);

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
}
