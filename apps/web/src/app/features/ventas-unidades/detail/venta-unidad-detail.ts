import { Component, OnInit, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ActivatedRoute, Router, RouterModule } from "@angular/router";
import { ToastrService } from "ngx-toastr";

import { VentasUnidadesService } from "../ventas-unidades.service";
import { UnitSale, UnitSaleStatus } from "../models/unit-sale.model";

@Component({
  selector: "app-venta-unidad-detail",
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: "./venta-unidad-detail.html",
  styleUrls: ["./venta-unidad-detail.scss"],
})
export class VentaUnidadDetail implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private ventasService = inject(VentasUnidadesService);
  private toastr = inject(ToastrService);

  sale = signal<UnitSale | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);

  readonly UnitSaleStatus = UnitSaleStatus;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get("id");
    if (!id) {
      this.router.navigate(["/sales"]);
      return;
    }
    this.ventasService.getOne(id).subscribe({
      next: (s) => {
        this.sale.set(s);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.message || "Error al cargar venta");
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
