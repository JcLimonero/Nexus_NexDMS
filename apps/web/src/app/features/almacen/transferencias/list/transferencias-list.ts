import { Component, OnInit, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { RouterModule } from "@angular/router";
import { Subject } from "rxjs";
import { debounceTime, switchMap } from "rxjs/operators";

import { AlmacenService } from "../../almacen.service";
import { BranchesService } from "../../../inventario-refacciones/services/branches.service";
import {
  WarehouseTransfer,
  WarehouseTransferStatus,
} from "../../models/warehouse-transfer.model";
import { FeatherIcons } from "../../../../shared/components/feather-icons/feather-icons";

@Component({
  selector: "app-transferencias-list",
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, FeatherIcons],
  templateUrl: "./transferencias-list.html",
  styleUrls: ["./transferencias-list.scss"],
})
export class TransferenciasList implements OnInit {
  private almacenService = inject(AlmacenService);
  private branchesService = inject(BranchesService);

  transferencias = signal<WarehouseTransfer[]>([]);
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
  originFilter = signal<string>("");
  destinationFilter = signal<string>("");

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
          this.almacenService.getWarehouseTransfers({
            status: this.statusFilter() as WarehouseTransferStatus | undefined,
            originBranchId: this.originFilter() || undefined,
            destinationBranchId: this.destinationFilter() || undefined,
            page: this.meta()?.page ?? 1,
            limit: 20,
          })
        )
      )
      .subscribe({
        next: (res) => {
          this.transferencias.set(res.data);
          this.meta.set(res.meta);
          this.loading.set(false);
          this.error.set(null);
        },
        error: (err) => {
          this.loading.set(false);
          this.error.set(err?.error?.message || "Error al cargar transferencias");
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

  onOriginFilterChange(value: string): void {
    this.originFilter.set(value);
    this.meta.update((m) => (m ? { ...m, page: 1 } : null));
    this.load();
  }

  onDestinationFilterChange(value: string): void {
    this.destinationFilter.set(value);
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

  getStatusLabel(status: string): string {
    return this.almacenService.getTransferStatusLabel(status);
  }

  getTypeLabel(type: string): string {
    return this.almacenService.getTransferTypeLabel(type);
  }
}
