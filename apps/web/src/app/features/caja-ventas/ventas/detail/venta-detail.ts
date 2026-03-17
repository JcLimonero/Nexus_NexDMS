import { Component, OnInit, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Router, ActivatedRoute, RouterModule } from "@angular/router";
import { ToastrService } from "ngx-toastr";

import { CajaVentasService } from "../../caja-ventas.service";
import { Sale, SaleItem, SaleStatus } from "../../models/sale.model";

@Component({
  selector: "app-venta-detail",
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: "./venta-detail.html",
  styleUrls: ["./venta-detail.scss"],
})
export class VentaDetail implements OnInit {
  private cajaService = inject(CajaVentasService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private toastr = inject(ToastrService);

  venta = signal<Sale | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);
  cancelling = signal(false);
  cancelReason = signal("");

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get("id");
    if (!id) {
      this.router.navigate(["/caja/ventas"]);
      return;
    }

    this.cajaService.getSale(id).subscribe({
      next: (s) => {
        this.venta.set(s);
        this.loading.set(false);
        this.error.set(null);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.message || "Error al cargar venta");
      },
    });
  }

  setCancelReason(value: string): void {
    this.cancelReason.set(value);
  }

  onCancel(): void {
    const v = this.venta();
    if (!v || this.cancelling()) return;
    if (v.status === SaleStatus.CANCELLED) return;
    if (!confirm("¿Cancelar esta venta? Se revertirá el stock.")) return;

    this.cancelling.set(true);
    this.cajaService.cancelSale(v.id, this.cancelReason()).subscribe({
      next: (updated) => {
        this.venta.set(updated);
        this.toastr.success("Venta cancelada");
        this.cancelling.set(false);
      },
      error: (err) => {
        this.toastr.error(err?.error?.message || "Error al cancelar");
        this.cancelling.set(false);
      },
    });
  }

  canCancel(): boolean {
    const v = this.venta();
    return !!v && v.status !== SaleStatus.CANCELLED;
  }

  getStatusLabel(status: string): string {
    return this.cajaService.getSaleStatusLabel(status);
  }

  getClientName(s: Sale): string {
    const c = s.client;
    if (!c) return "—";
    if (c.companyName) return c.companyName;
    const parts = [c.firstName, c.lastName].filter(Boolean);
    return parts.join(" ") || "—";
  }

  getItemPartName(item: SaleItem): string {
    return item.part?.name ?? item.partId;
  }
}
