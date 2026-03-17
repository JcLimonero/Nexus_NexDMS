import { Component, OnInit, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { RouterModule } from "@angular/router";
import { Subject } from "rxjs";
import { debounceTime, switchMap } from "rxjs/operators";

import { CotizacionesService } from "../cotizaciones.service";
import { BranchesService } from "../../inventario-refacciones/services/branches.service";
import { Quotation, QuotationStatus, QuotationType } from "../models/quotation.model";
import { FeatherIcons } from "../../../shared/components/feather-icons/feather-icons";

@Component({
  selector: "app-cotizaciones-list",
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, FeatherIcons],
  templateUrl: "./cotizaciones-list.html",
  styleUrls: ["./cotizaciones-list.scss"],
})
export class CotizacionesList implements OnInit {
  private cotizacionesService = inject(CotizacionesService);
  private branchesService = inject(BranchesService);

  cotizaciones = signal<Quotation[]>([]);
  branches = signal<{ id: string; name: string }[]>([]);
  meta = signal<{
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  } | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);
  statusFilter = signal<string>("");
  typeFilter = signal<string>("");
  branchFilter = signal<string>("");

  private loadSubject = new Subject<void>();

  ngOnInit(): void {
    this.branchesService.getAll().subscribe({
      next: (res) =>
        this.branches.set(res.data.map((b) => ({ id: b.id, name: b.name }))),
    });

    this.loadSubject
      .pipe(
        debounceTime(100),
        switchMap(() =>
          this.cotizacionesService.getQuotations({
            status: this.statusFilter() as QuotationStatus | undefined,
            type: this.typeFilter() as QuotationType | undefined,
            branchId: this.branchFilter() || undefined,
            page: this.meta()?.page ?? 1,
            limit: 20,
          })
        )
      )
      .subscribe({
        next: (res) => {
          this.cotizaciones.set(res.data);
          this.meta.set(res.meta);
          this.loading.set(false);
          this.error.set(null);
        },
        error: (err) => {
          this.loading.set(false);
          this.error.set(err?.error?.message || "Error al cargar cotizaciones");
        },
      });

    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.loadSubject.next();
  }

  onFilterChange(): void {
    this.meta.update((m) => (m ? { ...m, page: 1 } : null));
    this.load();
  }

  goToPage(page: number): void {
    const m = this.meta();
    if (!m || page < 1 || page > m.totalPages) return;
    this.meta.update((prev) => (prev ? { ...prev, page } : null));
    this.load();
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

  getTypeLabel(type: string): string {
    return this.cotizacionesService.getTypeLabel(type);
  }

  getStatusLabel(status: string): string {
    return this.cotizacionesService.getStatusLabel(status);
  }
}
