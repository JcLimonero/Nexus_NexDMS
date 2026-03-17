import { Component, OnInit, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { RouterModule } from "@angular/router";

import { AlmacenService } from "../../almacen.service";
import { BranchesService } from "../../../inventario-refacciones/services/branches.service";
import {
  UnitReservation,
  UnitReservationStatus,
} from "../../models/unit-reservation.model";
import { FeatherIcons } from "../../../../shared/components/feather-icons/feather-icons";

@Component({
  selector: "app-apartados-list",
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, FeatherIcons],
  templateUrl: "./apartados-list.html",
  styleUrls: ["./apartados-list.scss"],
})
export class ApartadosList implements OnInit {
  private almacenService = inject(AlmacenService);
  private branchesService = inject(BranchesService);

  apartados = signal<UnitReservation[]>([]);
  branches = signal<{ id: string; name: string }[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  statusFilter = signal<string>("");

  ngOnInit(): void {
    this.branchesService.getAll().subscribe({
      next: (res) =>
        this.branches.set(res.data.map((b) => ({ id: b.id, name: b.name }))),
    });
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.almacenService
      .getUnitReservations({
        status: this.statusFilter() as UnitReservationStatus | undefined,
      })
      .subscribe({
        next: (res) => {
          this.apartados.set(res);
          this.loading.set(false);
          this.error.set(null);
        },
        error: (err) => {
          this.loading.set(false);
          this.error.set(err?.error?.message || "Error al cargar apartados");
        },
      });
  }

  onStatusFilterChange(value: string): void {
    this.statusFilter.set(value);
    this.load();
  }

  getStatusLabel(status: string): string {
    return this.almacenService.getReservationStatusLabel(status);
  }

  getUnitLabel(r: UnitReservation): string {
    const cu = r.catalogUnit;
    if (cu) {
      return `${cu.year} ${cu.brand} ${cu.model}`.trim() || cu.serialNumber || r.catalogUnitId;
    }
    return r.catalogUnitId;
  }

  getClientName(r: UnitReservation): string {
    const c = r.client;
    if (c) {
      if (c.companyName) return c.companyName;
      const parts = [c.firstName, c.lastName].filter(Boolean);
      return parts.join(" ") || c.phone || r.clientId;
    }
    return r.clientId;
  }
}
