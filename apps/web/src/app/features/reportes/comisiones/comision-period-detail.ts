import { Component, OnInit, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { Router, ActivatedRoute, RouterModule } from "@angular/router";
import { ToastrService } from "ngx-toastr";

import { ReportesService } from "../reportes.service";
import { BranchesService } from "../../inventario-refacciones/services/branches.service";
import {
  CommissionPeriod,
  CommissionPeriodStatus,
} from "../models/commission.model";

@Component({
  selector: "app-comision-period-detail",
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: "./comision-period-detail.html",
  styleUrls: ["./comision-period-detail.scss"],
})
export class ComisionPeriodDetail implements OnInit {
  private reportesService = inject(ReportesService);
  private branchesService = inject(BranchesService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private toastr = inject(ToastrService);

  period = signal<CommissionPeriod | null>(null);
  branches = signal<{ id: string; name: string }[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  submitting = signal(false);
  approving = signal(false);
  markingPaid = signal(false);

  ngOnInit(): void {
    this.branchesService.getAll().subscribe({
      next: (res) =>
        this.branches.set(res.data.map((b) => ({ id: b.id, name: b.name }))),
    });

    const id = this.route.snapshot.paramMap.get("id");
    if (!id) {
      this.router.navigate(["/reportes/comisiones"]);
      return;
    }

    this.reportesService.getCommissionPeriod(id).subscribe({
      next: (p) => {
        this.period.set(p);
        this.loading.set(false);
        this.error.set(null);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.message || "Error al cargar período");
      },
    });
  }

  getBranchName(id: string): string {
    return this.branches().find((b) => b.id === id)?.name ?? id;
  }

  getStatusLabel(status: string): string {
    return this.reportesService.getPeriodStatusLabel(status);
  }

  getTypeLabel(type: string): string {
    return this.reportesService.getPeriodTypeLabel(type);
  }

  getUserName(d: { user?: { firstName: string; lastName: string } }): string {
    const u = d.user;
    return u ? `${u.firstName} ${u.lastName}` : "—";
  }

  canSubmitForReview(): boolean {
    const p = this.period();
    return !!p && p.status === CommissionPeriodStatus.OPEN;
  }

  canApprove(): boolean {
    const p = this.period();
    return !!p && p.status === CommissionPeriodStatus.UNDER_REVIEW;
  }

  canMarkAsPaid(): boolean {
    const p = this.period();
    return !!p && p.status === CommissionPeriodStatus.APPROVED;
  }

  onSubmitForReview(): void {
    const p = this.period();
    if (!p || this.submitting()) return;
    if (!confirm("¿Enviar este período a revisión?")) return;

    this.submitting.set(true);
    this.reportesService.submitForReview(p.id).subscribe({
      next: (updated) => {
        this.period.set(updated);
        this.toastr.success("Período enviado a revisión");
        this.submitting.set(false);
      },
      error: (err) => {
        this.toastr.error(err?.error?.message || "Error al enviar");
        this.submitting.set(false);
      },
    });
  }

  onApprove(): void {
    const p = this.period();
    if (!p || this.approving()) return;
    if (!confirm("¿Aprobar este período de comisiones?")) return;

    this.approving.set(true);
    this.reportesService.approvePeriod(p.id).subscribe({
      next: (updated) => {
        this.period.set(updated);
        this.toastr.success("Período aprobado");
        this.approving.set(false);
      },
      error: (err) => {
        this.toastr.error(err?.error?.message || "Error al aprobar");
        this.approving.set(false);
      },
    });
  }

  onMarkAsPaid(): void {
    const p = this.period();
    if (!p || this.markingPaid()) return;
    if (!confirm("¿Marcar este período como pagado?")) return;

    this.markingPaid.set(true);
    this.reportesService.markAsPaid(p.id).subscribe({
      next: (updated) => {
        this.period.set(updated);
        this.toastr.success("Período marcado como pagado");
        this.markingPaid.set(false);
      },
      error: (err) => {
        this.toastr.error(err?.error?.message || "Error al marcar como pagado");
        this.markingPaid.set(false);
      },
    });
  }
}
