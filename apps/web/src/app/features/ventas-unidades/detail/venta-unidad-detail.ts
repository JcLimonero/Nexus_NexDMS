import { Component, OnInit, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute, Router, RouterModule } from "@angular/router";
import { ToastrService } from "ngx-toastr";

import { VentasUnidadesService } from "../ventas-unidades.service";
import { UnitSale, UnitSaleStatus } from "../models/unit-sale.model";
import { ExpedienteVenta } from "../documentos/expediente-venta";
import { PagosVenta } from "../pagos/pagos-venta";
import { AuthService } from "../../../auth/auth.service";

@Component({
  selector: "app-venta-unidad-detail",
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, ExpedienteVenta, PagosVenta],
  templateUrl: "./venta-unidad-detail.html",
  styleUrls: ["./venta-unidad-detail.scss"],
})
export class VentaUnidadDetail implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private ventasService = inject(VentasUnidadesService);
  private toastr = inject(ToastrService);
  private auth = inject(AuthService);

  /** Quién puede aprobar o rechazar documentos del expediente. */
  puedeRevisar = (this.auth.getUser()?.roles ?? []).some((r) =>
    ["SUPERADMIN", "ADMIN", "MANAGER"].includes(r),
  );

  sale = signal<UnitSale | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);

  /** Pestaña activa de la ficha. */
  pestana = signal<"datos" | "pagos" | "documentos">("datos");

  /** Captura de la fecha de entrega, que al crear la venta no se conoce. */
  editandoEntrega = signal(false);
  fechaEntrega = "";
  guardandoEntrega = signal(false);

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

  abrirEntrega(actual: string | null | undefined): void {
    this.fechaEntrega = actual ? String(actual).slice(0, 10) : "";
    this.editandoEntrega.set(true);
  }

  guardarEntrega(): void {
    const s = this.sale();
    if (!s) return;
    this.guardandoEntrega.set(true);
    this.ventasService
      .scheduleDelivery(s.id, this.fechaEntrega || null)
      .subscribe({
        next: (actualizada) => {
          this.sale.set(actualizada);
          this.guardandoEntrega.set(false);
          this.editandoEntrega.set(false);
          this.toastr.success("Fecha de entrega guardada");
        },
        error: (e) => {
          this.guardandoEntrega.set(false);
          this.toastr.error(e?.error?.message || "No se pudo guardar");
        },
      });
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
