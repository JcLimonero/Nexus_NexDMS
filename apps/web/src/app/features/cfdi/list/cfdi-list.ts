import { Component, OnInit, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { RouterModule } from "@angular/router";
import { Subject } from "rxjs";
import { debounceTime, switchMap } from "rxjs/operators";

import { CfdiService } from "../cfdi.service";
import { BranchesService } from "../../inventario-refacciones/services/branches.service";
import { CfdiLog, CfdiType, CfdiStatus } from "../models/cfdi-log.model";
import { FeatherIcons } from "../../../shared/components/feather-icons/feather-icons";

@Component({
  selector: "app-cfdi-list",
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, FeatherIcons],
  templateUrl: "./cfdi-list.html",
  styleUrls: ["./cfdi-list.scss"],
})
export class CfdiList implements OnInit {
  private cfdiService = inject(CfdiService);
  private branchesService = inject(BranchesService);

  cfdis = signal<CfdiLog[]>([]);
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
  tipoFilter = signal<string>("");
  branchFilter = signal<string>("");
  fechaDesde = signal<string>("");
  fechaHasta = signal<string>("");

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
          this.cfdiService.getCfdis({
            status: this.statusFilter() as CfdiStatus | undefined,
            tipo: this.tipoFilter() as CfdiType | undefined,
            branchId: this.branchFilter() || undefined,
            fechaDesde: this.fechaDesde() || undefined,
            fechaHasta: this.fechaHasta() || undefined,
            page: this.meta()?.page ?? 1,
            limit: 20,
          })
        )
      )
      .subscribe({
        next: (res) => {
          this.cfdis.set(res.data);
          this.meta.set(res.meta);
          this.loading.set(false);
          this.error.set(null);
        },
        error: (err) => {
          this.loading.set(false);
          this.error.set(err?.error?.message || "Error al cargar CFDIs");
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
