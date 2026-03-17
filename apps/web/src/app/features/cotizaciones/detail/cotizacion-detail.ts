import { Component, OnInit, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Router, ActivatedRoute, RouterModule } from "@angular/router";
import { ToastrService } from "ngx-toastr";

import { CotizacionesService } from "../cotizaciones.service";
import { BranchesService } from "../../inventario-refacciones/services/branches.service";
import {
  Quotation,
  QuotationItem,
  QuotationStatus,
} from "../models/quotation.model";

@Component({
  selector: "app-cotizacion-detail",
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: "./cotizacion-detail.html",
  styleUrls: ["./cotizacion-detail.scss"],
})
export class CotizacionDetail implements OnInit {
  private cotizacionesService = inject(CotizacionesService);
  private branchesService = inject(BranchesService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private toastr = inject(ToastrService);

  cotizacion = signal<Quotation | null>(null);
  branches = signal<{ id: string; name: string }[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  approving = signal(false);
  rejecting = signal(false);
  sending = signal(false);
  converting = signal(false);
  rejectReason = signal("");

  ngOnInit(): void {
    this.branchesService.getAll().subscribe({
      next: (res) =>
        this.branches.set(res.data.map((b) => ({ id: b.id, name: b.name }))),
    });

    const id = this.route.snapshot.paramMap.get("id");
    if (!id) {
      this.router.navigate(["/quotes"]);
      return;
    }

    this.cotizacionesService.getQuotation(id).subscribe({
      next: (q) => {
        this.cotizacion.set(q);
        this.loading.set(false);
        this.error.set(null);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.message || "Error al cargar cotización");
      },
    });
  }

  getBranchName(id: string): string {
    return this.branches().find((b) => b.id === id)?.name ?? id;
  }

  getClientName(q: Quotation): string {
    const c = q.client;
    if (!c) return "—";
    if (c.companyName) return c.companyName;
    const parts = [c.firstName, c.lastName].filter(Boolean);
    return parts.join(" ") || c.phone || "—";
  }

  getStatusLabel(status: string): string {
    return this.cotizacionesService.getStatusLabel(status);
  }

  getTypeLabel(type: string): string {
    return this.cotizacionesService.getTypeLabel(type);
  }

  getPriceListLabel(pl: string): string {
    return this.cotizacionesService.getPriceListLabel(pl);
  }

  getItemDescription(item: QuotationItem): string {
    if (item.part) return item.part.name;
    if (item.catalogUnit)
      return `${item.catalogUnit.year} ${item.catalogUnit.brand} ${item.catalogUnit.model}`;
    return item.description;
  }

  canEdit(): boolean {
    const q = this.cotizacion();
    return !!q && q.status === QuotationStatus.DRAFT;
  }

  canApprove(): boolean {
    const q = this.cotizacion();
    return !!q && q.status === QuotationStatus.PENDING_APPROVAL;
  }

  canReject(): boolean {
    return this.canApprove();
  }

  canSend(): boolean {
    const q = this.cotizacion();
    return !!q && [QuotationStatus.DRAFT, QuotationStatus.APPROVED].includes(q.status as QuotationStatus);
  }

  canConvert(): boolean {
    const q = this.cotizacion();
    return !!q && [QuotationStatus.SENT, QuotationStatus.ACCEPTED, QuotationStatus.APPROVED].includes(q.status as QuotationStatus);
  }

  onApprove(): void {
    const q = this.cotizacion();
    if (!q || this.approving()) return;
    if (!confirm("¿Aprobar esta cotización?")) return;

    this.approving.set(true);
    this.cotizacionesService.approveQuotation(q.id).subscribe({
      next: (updated) => {
        this.cotizacion.set(updated);
        this.toastr.success("Cotización aprobada");
        this.approving.set(false);
      },
      error: (err) => {
        this.toastr.error(err?.error?.message || "Error al aprobar");
        this.approving.set(false);
      },
    });
  }

  onReject(): void {
    const q = this.cotizacion();
    if (!q || this.rejecting()) return;
    const reason = this.rejectReason().trim();
    if (!confirm("¿Rechazar esta cotización?")) return;

    this.rejecting.set(true);
    this.cotizacionesService.rejectQuotation(q.id, reason).subscribe({
      next: (updated) => {
        this.cotizacion.set(updated);
        this.rejectReason.set("");
        this.toastr.success("Cotización rechazada");
        this.rejecting.set(false);
      },
      error: (err) => {
        this.toastr.error(err?.error?.message || "Error al rechazar");
        this.rejecting.set(false);
      },
    });
  }

  onSend(): void {
    const q = this.cotizacion();
    if (!q || this.sending()) return;
    if (!confirm("¿Enviar esta cotización al cliente?")) return;

    this.sending.set(true);
    this.cotizacionesService.sendQuotation(q.id).subscribe({
      next: (updated) => {
        this.cotizacion.set(updated);
        this.toastr.success("Cotización enviada");
        this.sending.set(false);
      },
      error: (err) => {
        this.toastr.error(err?.error?.message || "Error al enviar");
        this.sending.set(false);
      },
    });
  }

  onConvert(): void {
    const q = this.cotizacion();
    if (!q || this.converting()) return;
    if (!confirm("¿Convertir esta cotización en orden de servicio/venta?")) return;

    this.converting.set(true);
    this.cotizacionesService.convertQuotation(q.id).subscribe({
      next: (result) => {
        this.cotizacion.update((prev) =>
          prev ? { ...prev, status: QuotationStatus.CONVERTED as QuotationStatus } : null
        );
        this.toastr.success(
          `Cotización convertida (${result.type === "unit_sale" ? "venta de unidad" : "orden de servicio"})`
        );
        this.converting.set(false);
      },
      error: (err) => {
        this.toastr.error(err?.error?.message || "Error al convertir");
        this.converting.set(false);
      },
    });
  }
}
