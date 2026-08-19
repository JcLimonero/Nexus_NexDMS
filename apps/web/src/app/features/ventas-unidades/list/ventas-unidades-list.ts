import { Component, OnInit, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { RouterModule } from "@angular/router";

import { VentasUnidadesService } from "../ventas-unidades.service";
import { UnitSale, UnitSaleStatus } from "../models/unit-sale.model";
import { BranchesService } from "../../inventario-refacciones/services/branches.service";

@Component({
  selector: "app-ventas-unidades-list",
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: "./ventas-unidades-list.html",
  styleUrls: ["./ventas-unidades-list.scss"],
})
export class VentasUnidadesList implements OnInit {
  private ventasService = inject(VentasUnidadesService);
  private branchesService = inject(BranchesService);

  ventas = signal<UnitSale[]>([]);
  branches = signal<{ id: string; name: string }[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  branchFilter = signal<string>("");
  statusFilter = signal<string>("");

  ngOnInit(): void {
    this.branchesService.getAll().subscribe({
      next: (res) =>
        this.branches.set(res.data.map((b) => ({ id: b.id, name: b.name }))),
    });
    this.load();
  }

  onFiltersChange(): void {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.error.set(null);
    const filters: { clientId?: string; status?: string; branchId?: string } =
      {};
    if (this.statusFilter()) filters.status = this.statusFilter();
    if (this.branchFilter()) filters.branchId = this.branchFilter();

    this.ventasService.getAll(filters).subscribe({
      next: (list) => {
        this.ventas.set(list);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.message || "Error al cargar ventas");
      },
    });
  }

  getStatusLabel(status: UnitSaleStatus): string {
    const labels: Record<UnitSaleStatus, string> = {
      [UnitSaleStatus.IN_PROGRESS]: "En proceso",
      [UnitSaleStatus.COMPLETED]: "Completada",
      [UnitSaleStatus.CANCELLED]: "Cancelada",
    };
    return labels[status] ?? status;
  }

  getStatusBadgeClass(status: UnitSaleStatus): string {
    switch (status) {
      case UnitSaleStatus.IN_PROGRESS:
        return "bg-warning";
      case UnitSaleStatus.COMPLETED:
        return "bg-success";
      case UnitSaleStatus.CANCELLED:
        return "bg-secondary";
      default:
        return "bg-secondary";
    }
  }

  getUnitLabel(sale: UnitSale): string {
    const cu = sale.catalogUnit;
    if (cu) return `${cu.year} ${cu.brand} ${cu.model}`;
    return sale.catalogUnitId;
  }

  getClientLabel(sale: UnitSale): string {
    const c = sale.client;
    if (!c) return sale.clientId;
    if (c.companyName) return c.companyName;
    const parts = [c.firstName, c.lastName].filter(Boolean);
    return parts.join(" ") || sale.clientId;
  }
}
