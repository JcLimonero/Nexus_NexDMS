import { Component, OnInit, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { RouterModule } from "@angular/router";
import { Subject } from "rxjs";
import { debounceTime, switchMap } from "rxjs/operators";

import { TallerService } from "../../taller.service";
import { BranchesService } from "../../../inventario-refacciones/services/branches.service";
import {
  ServiceOrder,
  ServiceOrderStatus,
} from "../../models/service-order.model";
import { FeatherIcons } from "../../../../shared/components/feather-icons/feather-icons";

@Component({
  selector: "app-ordenes-servicio-list",
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, FeatherIcons],
  templateUrl: "./ordenes-servicio-list.html",
  styleUrls: ["./ordenes-servicio-list.scss"],
})
export class OrdenesServicioList implements OnInit {
  private tallerService = inject(TallerService);
  private branchesService = inject(BranchesService);

  ordenes = signal<ServiceOrder[]>([]);
  branches = signal<{ id: string; name: string }[]>([]);
  mechanics = signal<{ id: string; firstName: string; lastName: string }[]>([]);
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
  mechanicFilter = signal<string>("");

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
          this.tallerService.getServiceOrders({
            status: this.statusFilter() as ServiceOrderStatus | undefined,
            branchId: this.branchFilter() || undefined,
            mechanicId: this.mechanicFilter() || undefined,
            page: this.meta()?.page ?? 1,
            limit: 20,
          })
        )
      )
      .subscribe({
        next: (res) => {
          this.ordenes.set(res.data);
          this.meta.set(res.meta);
          this.loading.set(false);
          this.error.set(null);
        },
        error: (err) => {
          this.loading.set(false);
          this.error.set(err?.error?.message || "Error al cargar órdenes");
        },
      });

    this.load();
  }

  onBranchChange(branchId: string): void {
    this.branchFilter.set(branchId);
    this.mechanicFilter.set("");
    if (branchId) {
      this.tallerService.getMechanicsForBranch(branchId).subscribe({
        next: (m) => this.mechanics.set(m),
      });
    } else {
      this.mechanics.set([]);
    }
    this.onFilterChange();
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

  getMechanicName(id: string): string {
    const m = this.mechanics().find((mech) => mech.id === id);
    return m ? `${m.firstName} ${m.lastName}` : id;
  }

  getMechanicLabel(o: ServiceOrder): string {
    const m = o.mechanic;
    return m ? `${m.firstName} ${m.lastName}` : "—";
  }

  getOwnerName(o: ServiceOrder): string {
    const owner = o.owner;
    if (!owner) return "—";
    if (owner.companyName) return owner.companyName;
    const parts = [owner.firstName, owner.lastName].filter(Boolean);
    return parts.join(" ") || owner.phone || "—";
  }

  getVehicleLabel(o: ServiceOrder): string {
    const v = o.vehicle;
    if (!v) return "—";
    return `${v.year} ${v.make} ${v.model}` + (v.plate ? ` (${v.plate})` : "");
  }

  getStatusLabel(status: string): string {
    return this.tallerService.getStatusLabel(status);
  }
}
