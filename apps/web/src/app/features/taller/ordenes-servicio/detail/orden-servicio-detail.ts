import { Component, OnInit, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Router, ActivatedRoute, RouterModule } from "@angular/router";
import { ToastrService } from "ngx-toastr";

import { TallerService } from "../../taller.service";
import { PanelServicio } from "./panel-servicio";
import { BranchesService } from "../../../inventario-refacciones/services/branches.service";
import {
  ServiceOrder,
  ServiceOrderStatus,
} from "../../models/service-order.model";

const NEXT_STATUS: Partial<Record<ServiceOrderStatus, ServiceOrderStatus[]>> = {
  [ServiceOrderStatus.RECEIVED]: [ServiceOrderStatus.DIAGNOSIS, ServiceOrderStatus.CANCELLED],
  [ServiceOrderStatus.DIAGNOSIS]: [ServiceOrderStatus.IN_PROGRESS, ServiceOrderStatus.CANCELLED],
  [ServiceOrderStatus.IN_PROGRESS]: [
    ServiceOrderStatus.WAITING_PARTS,
    ServiceOrderStatus.READY,
    ServiceOrderStatus.CANCELLED,
  ],
  [ServiceOrderStatus.WAITING_PARTS]: [ServiceOrderStatus.IN_PROGRESS, ServiceOrderStatus.CANCELLED],
  [ServiceOrderStatus.READY]: [ServiceOrderStatus.DELIVERED, ServiceOrderStatus.CANCELLED],
};

@Component({
  selector: "app-orden-servicio-detail",
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, PanelServicio],
  templateUrl: "./orden-servicio-detail.html",
  styleUrls: ["./orden-servicio-detail.scss"],
})
export class OrdenServicioDetail implements OnInit {
  private tallerService = inject(TallerService);
  private branchesService = inject(BranchesService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private toastr = inject(ToastrService);

  orden = signal<ServiceOrder | null>(null);
  branches = signal<{ id: string; name: string }[]>([]);
  mechanics = signal<{ id: string; firstName: string; lastName: string }[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  changingStatus = signal(false);
  assigningMechanic = signal(false);
  cancelling = signal(false);
  selectedStatus = signal<ServiceOrderStatus | "">("");
  selectedMechanicId = signal<string>("");

  ngOnInit(): void {
    this.branchesService.getAll().subscribe({
      next: (res) =>
        this.branches.set(res.data.map((b) => ({ id: b.id, name: b.name }))),
    });

    const id = this.route.snapshot.paramMap.get("id");
    if (!id) {
      this.router.navigate(["/workshop/service-orders"]);
      return;
    }

    this.tallerService.getServiceOrder(id).subscribe({
      next: (o) => {
        this.orden.set(o);
        this.loading.set(false);
        this.error.set(null);
        if (o.branchId) {
          this.tallerService.getMechanicsForBranch(o.branchId).subscribe({
            next: (m) => this.mechanics.set(m),
          });
        }
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.message || "Error al cargar orden");
      },
    });
  }

  getBranchName(id: string): string {
    return this.branches().find((b) => b.id === id)?.name ?? id;
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

  getMechanicLabel(o: ServiceOrder): string {
    const m = o.mechanic;
    return m ? `${m.firstName} ${m.lastName}` : "—";
  }

  getStatusLabel(status: string): string {
    return this.tallerService.getStatusLabel(status);
  }

  getNextStatuses(): ServiceOrderStatus[] {
    const o = this.orden();
    if (!o) return [];
    return NEXT_STATUS[o.status as ServiceOrderStatus] ?? [];
  }

  canAssignMechanic(): boolean {
    const o = this.orden();
    if (!o || o.status === ServiceOrderStatus.CANCELLED || o.status === ServiceOrderStatus.DELIVERED) return false;
    return true;
  }

  canCancel(): boolean {
    const o = this.orden();
    return !!o && o.status !== ServiceOrderStatus.CANCELLED && o.status !== ServiceOrderStatus.DELIVERED;
  }

  onStatusChange(): void {
    const o = this.orden();
    const status = this.selectedStatus();
    if (!o || !status || this.changingStatus()) return;
    if (!confirm(`¿Cambiar estado a ${this.getStatusLabel(status)}?`)) return;

    this.changingStatus.set(true);
    this.tallerService.changeStatus(o.id, status).subscribe({
      next: (updated) => {
        this.orden.set(updated);
        this.selectedStatus.set("");
        this.toastr.success("Estado actualizado");
        this.changingStatus.set(false);
      },
      error: (err) => {
        this.toastr.error(err?.error?.message || "Error al cambiar estado");
        this.changingStatus.set(false);
      },
    });
  }

  onAssignMechanic(): void {
    const o = this.orden();
    const mechanicId = this.selectedMechanicId();
    if (!o || !mechanicId || this.assigningMechanic()) return;

    this.assigningMechanic.set(true);
    this.tallerService.assignMechanic(o.id, mechanicId).subscribe({
      next: (updated) => {
        this.orden.set(updated);
        this.selectedMechanicId.set("");
        this.toastr.success("Técnico asignado");
        this.assigningMechanic.set(false);
      },
      error: (err) => {
        this.toastr.error(err?.error?.message || "Error al asignar técnico");
        this.assigningMechanic.set(false);
      },
    });
  }

  onCancel(): void {
    const o = this.orden();
    if (!o || this.cancelling()) return;
    if (!confirm("¿Cancelar esta orden de servicio?")) return;

    this.cancelling.set(true);
    this.tallerService.cancelServiceOrder(o.id).subscribe({
      next: (updated) => {
        this.orden.set(updated);
        this.toastr.success("Orden cancelada");
        this.cancelling.set(false);
      },
      error: (err) => {
        this.toastr.error(err?.error?.message || "Error al cancelar");
        this.cancelling.set(false);
      },
    });
  }
}
