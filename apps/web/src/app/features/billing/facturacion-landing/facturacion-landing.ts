import { Component, OnInit, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterModule } from "@angular/router";

import { CfdiService } from "../../cfdi/cfdi.service";
import { CfdiLog, CfdiStatus } from "../../cfdi/models/cfdi-log.model";

@Component({
  selector: "app-facturacion-landing",
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: "./facturacion-landing.html",
  styleUrls: ["./facturacion-landing.scss"],
})
export class FacturacionLanding implements OnInit {
  private cfdiService = inject(CfdiService);

  recentCfdis = signal<CfdiLog[]>([]);
  totalCfdis = signal<number>(0);
  loading = signal(true);
  error = signal<string | null>(null);

  ngOnInit(): void {
    this.cfdiService
      .getCfdis({ limit: 5, status: CfdiStatus.VALID })
      .subscribe({
        next: (res) => {
          this.recentCfdis.set(res.data);
          this.totalCfdis.set(res.meta.total);
          this.loading.set(false);
          this.error.set(null);
        },
        error: (err) => {
          this.loading.set(false);
          this.error.set(err?.error?.message || "Error al cargar facturas");
        },
      });
  }

  getTypeLabel(type: string): string {
    return this.cfdiService.getTypeLabel(type);
  }

  getStatusLabel(status: string): string {
    return this.cfdiService.getStatusLabel(status);
  }

  getReferenceTypeLabel(type: string): string {
    return this.cfdiService.getReferenceTypeLabel(type);
  }
}
