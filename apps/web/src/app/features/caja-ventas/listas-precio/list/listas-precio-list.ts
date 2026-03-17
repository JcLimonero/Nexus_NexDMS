import { Component, OnInit, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { RouterModule } from "@angular/router";

import { CajaVentasService } from "../../caja-ventas.service";
import { BranchesService } from "../../../inventario-refacciones/services/branches.service";
import { PriceList } from "../../models/price-list.model";
import { FeatherIcons } from "../../../../shared/components/feather-icons/feather-icons";

@Component({
  selector: "app-listas-precio-list",
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, FeatherIcons],
  templateUrl: "./listas-precio-list.html",
  styleUrls: ["./listas-precio-list.scss"],
})
export class ListasPrecioList implements OnInit {
  private cajaService = inject(CajaVentasService);
  private branchesService = inject(BranchesService);

  listas = signal<PriceList[]>([]);
  branches = signal<{ id: string; name: string }[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  branchFilter = signal<string>("");

  ngOnInit(): void {
    this.branchesService.getAll().subscribe({
      next: (res) =>
        this.branches.set(res.data.map((b) => ({ id: b.id, name: b.name }))),
    });
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.cajaService
      .getPriceLists({ branchId: this.branchFilter() || undefined })
      .subscribe({
        next: (res) => {
          this.listas.set(res);
          this.loading.set(false);
          this.error.set(null);
        },
        error: (err) => {
          this.loading.set(false);
          this.error.set(err?.error?.message || "Error al cargar listas");
        },
      });
  }

  onBranchChange(branchId: string): void {
    this.branchFilter.set(branchId);
    this.load();
  }

  getTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      PUBLIC: "Público",
      WHOLESALE: "Mayoreo",
      BUSINESS: "Empresa",
    };
    return labels[type] ?? type;
  }

  getBranchName(id: string): string {
    return this.branches().find((b) => b.id === id)?.name ?? id;
  }

  getBranchNameFromList(list: PriceList): string {
    return this.getBranchName(list.branchId);
  }
}
