import { Component, OnInit, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { RouterModule } from "@angular/router";
import { Subject } from "rxjs";
import { debounceTime, switchMap } from "rxjs/operators";

import { CajaVentasService } from "../../caja-ventas.service";
import { BranchesService } from "../../../inventario-refacciones/services/branches.service";
import { Sale, SaleStatus } from "../../models/sale.model";
import { FeatherIcons } from "../../../../shared/components/feather-icons/feather-icons";

@Component({
  selector: "app-ventas-list",
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, FeatherIcons],
  templateUrl: "./ventas-list.html",
  styleUrls: ["./ventas-list.scss"],
})
export class VentasList implements OnInit {
  private cajaService = inject(CajaVentasService);
  private branchesService = inject(BranchesService);

  ventas = signal<Sale[]>([]);
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
          this.cajaService.getSales({
            status: this.statusFilter() as SaleStatus | undefined,
            branchId: this.branchFilter() || undefined,
            page: this.meta()?.page ?? 1,
            limit: 20,
          })
        )
      )
      .subscribe({
        next: (res) => {
          this.ventas.set(res.data);
          this.meta.set(res.meta);
          this.loading.set(false);
          this.error.set(null);
        },
        error: (err) => {
          this.loading.set(false);
          this.error.set(err?.error?.message || "Error al cargar ventas");
        },
      });

    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.loadSubject.next();
  }

  onStatusFilterChange(value: string): void {
    this.statusFilter.set(value);
    this.meta.update((m) => (m ? { ...m, page: 1 } : null));
    this.load();
  }

  onBranchFilterChange(value: string): void {
    this.branchFilter.set(value);
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

  getClientName(s: Sale): string {
    const c = s.client;
    if (!c) return "—";
    if (c.companyName) return c.companyName;
    const parts = [c.firstName, c.lastName].filter(Boolean);
    return parts.join(" ") || "—";
  }

  getStatusLabel(status: string): string {
    return this.cajaService.getSaleStatusLabel(status);
  }
}
