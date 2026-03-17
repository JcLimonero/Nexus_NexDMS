import { Component, OnInit, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Router, ActivatedRoute, RouterModule } from "@angular/router";
import { ToastrService } from "ngx-toastr";

import { GarantiasService } from "../garantias.service";
import { BranchesService } from "../../inventario-refacciones/services/branches.service";
import { Warranty, WarrantyStatus } from "../models/warranty.model";

@Component({
  selector: "app-garantia-detail",
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: "./garantia-detail.html",
  styleUrls: ["./garantia-detail.scss"],
})
export class GarantiaDetail implements OnInit {
  private garantiasService = inject(GarantiasService);
  private branchesService = inject(BranchesService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private toastr = inject(ToastrService);

  garantia = signal<Warranty | null>(null);
  branches = signal<{ id: string; name: string }[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  authorizing = signal(false);
  resolving = signal(false);
  rejecting = signal(false);
  resolution = signal("");
  rejectReason = signal("");

  ngOnInit(): void {
    this.branchesService.getAll().subscribe({
      next: (res) =>
        this.branches.set(res.data.map((b) => ({ id: b.id, name: b.name }))),
    });

    const id = this.route.snapshot.paramMap.get("id");
    if (!id) {
      this.router.navigate(["/garantias"]);
      return;
    }

    this.garantiasService.getWarranty(id).subscribe({
      next: (w) => {
        this.garantia.set(w);
        this.loading.set(false);
        this.error.set(null);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.message || "Error al cargar garantía");
      },
    });
  }

  getBranchName(id: string): string {
    return this.branches().find((b) => b.id === id)?.name ?? id;
  }

  getClientName(w: Warranty): string {
    const c = w.client;
    if (!c) return "—";
    if (c.companyName) return c.companyName;
    const parts = [c.firstName, c.lastName].filter(Boolean);
    return parts.join(" ") || c.phone || "—";
  }

  getVehicleLabel(w: Warranty): string {
    const v = w.vehicle;
    if (!v) return "—";
    return `${v.year} ${v.make} ${v.model}` + (v.plate ? ` (${v.plate})` : "");
  }

  getStatusLabel(status: string): string {
    return this.garantiasService.getStatusLabel(status);
  }

  getTypeLabel(type: string): string {
    return this.garantiasService.getTypeLabel(type);
  }

  canAuthorize(): boolean {
    const w = this.garantia();
    return !!w && w.status === WarrantyStatus.OPEN;
  }

  canResolve(): boolean {
    const w = this.garantia();
    return !!w && [WarrantyStatus.OPEN, WarrantyStatus.IN_PROGRESS].includes(w.status);
  }

  canReject(): boolean {
    return this.canAuthorize();
  }

  onAuthorize(): void {
    const w = this.garantia();
    if (!w || this.authorizing()) return;
    if (!confirm("¿Autorizar esta garantía? Se procederá con el trámite.")) return;

    this.authorizing.set(true);
    this.garantiasService.authorize(w.id, {}).subscribe({
      next: (updated) => {
        this.garantia.set(updated);
        this.toastr.success("Garantía autorizada");
        this.authorizing.set(false);
      },
      error: (err) => {
        this.toastr.error(err?.error?.message || "Error al autorizar");
        this.authorizing.set(false);
      },
    });
  }

  onResolve(): void {
    const w = this.garantia();
    const resolution = this.resolution().trim();
    if (!w || this.resolving()) return;
    if (!resolution) {
      this.toastr.warning("Ingrese la resolución");
      return;
    }
    if (!confirm("¿Marcar esta garantía como resuelta?")) return;

    this.resolving.set(true);
    this.garantiasService.resolve(w.id, resolution).subscribe({
      next: (updated) => {
        this.garantia.set(updated);
        this.resolution.set("");
        this.toastr.success("Garantía resuelta");
        this.resolving.set(false);
      },
      error: (err) => {
        this.toastr.error(err?.error?.message || "Error al resolver");
        this.resolving.set(false);
      },
    });
  }

  onReject(): void {
    const w = this.garantia();
    if (!w || this.rejecting()) return;
    if (!confirm("¿Rechazar esta garantía?")) return;

    this.rejecting.set(true);
    this.garantiasService.reject(w.id, this.rejectReason().trim()).subscribe({
      next: (updated) => {
        this.garantia.set(updated);
        this.rejectReason.set("");
        this.toastr.success("Garantía rechazada");
        this.rejecting.set(false);
      },
      error: (err) => {
        this.toastr.error(err?.error?.message || "Error al rechazar");
        this.rejecting.set(false);
      },
    });
  }
}
