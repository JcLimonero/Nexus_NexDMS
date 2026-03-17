import { Component, OnInit, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { Router, ActivatedRoute, RouterModule } from "@angular/router";
import { ToastrService } from "ngx-toastr";

import { AlmacenService } from "../../almacen.service";
import {
  WarehouseTransfer,
  WarehouseTransferItem,
  WarehouseTransferStatus,
} from "../../models/warehouse-transfer.model";

@Component({
  selector: "app-transferencia-detail",
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: "./transferencia-detail.html",
  styleUrls: ["./transferencia-detail.scss"],
})
export class TransferenciaDetail implements OnInit {
  private almacenService = inject(AlmacenService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private toastr = inject(ToastrService);

  transferencia = signal<WarehouseTransfer | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);
  approving = signal(false);
  sending = signal(false);
  receiving = signal(false);
  cancelling = signal(false);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get("id");
    if (!id) {
      this.router.navigate(["/warehouse/transferencias"]);
      return;
    }

    this.almacenService.getWarehouseTransfer(id).subscribe({
      next: (t) => {
        this.transferencia.set(t);
        this.loading.set(false);
        this.error.set(null);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.message || "Error al cargar transferencia");
      },
    });
  }

  onApprove(): void {
    const t = this.transferencia();
    if (!t || this.approving()) return;
    if (t.status !== WarehouseTransferStatus.PENDING) return;

    this.approving.set(true);
    this.almacenService.approveWarehouseTransfer(t.id).subscribe({
      next: (updated) => {
        this.transferencia.set(updated);
        this.toastr.success("Transferencia aprobada");
        this.approving.set(false);
      },
      error: (err) => {
        this.toastr.error(err?.error?.message || "Error al aprobar");
        this.approving.set(false);
      },
    });
  }

  onSend(): void {
    const t = this.transferencia();
    if (!t || this.sending()) return;
    if (t.status !== WarehouseTransferStatus.APPROVED) return;

    this.sending.set(true);
    this.almacenService.sendWarehouseTransfer(t.id).subscribe({
      next: (updated) => {
        this.transferencia.set(updated);
        this.toastr.success("Transferencia enviada");
        this.sending.set(false);
      },
      error: (err) => {
        this.toastr.error(err?.error?.message || "Error al enviar");
        this.sending.set(false);
      },
    });
  }

  onReceive(): void {
    const t = this.transferencia();
    if (!t || this.receiving()) return;
    if (t.status !== WarehouseTransferStatus.IN_TRANSIT) return;

    this.receiving.set(true);
    this.almacenService.receiveWarehouseTransfer(t.id).subscribe({
      next: (updated) => {
        this.transferencia.set(updated);
        this.toastr.success("Transferencia recibida");
        this.receiving.set(false);
      },
      error: (err) => {
        this.toastr.error(err?.error?.message || "Error al recibir");
        this.receiving.set(false);
      },
    });
  }

  onCancel(): void {
    const t = this.transferencia();
    if (!t || this.cancelling()) return;
    if (t.status === WarehouseTransferStatus.CANCELLED) return;
    if (!confirm("¿Cancelar esta transferencia?")) return;

    this.cancelling.set(true);
    this.almacenService.cancelWarehouseTransfer(t.id).subscribe({
      next: (updated) => {
        this.transferencia.set(updated);
        this.toastr.success("Transferencia cancelada");
        this.cancelling.set(false);
      },
      error: (err) => {
        this.toastr.error(err?.error?.message || "Error al cancelar");
        this.cancelling.set(false);
      },
    });
  }

  canApprove(): boolean {
    const t = this.transferencia();
    return !!t && t.status === WarehouseTransferStatus.PENDING;
  }

  canSend(): boolean {
    const t = this.transferencia();
    return !!t && t.status === WarehouseTransferStatus.APPROVED;
  }

  canReceive(): boolean {
    const t = this.transferencia();
    return !!t && t.status === WarehouseTransferStatus.IN_TRANSIT;
  }

  canCancel(): boolean {
    const t = this.transferencia();
    return (
      !!t &&
      t.status !== WarehouseTransferStatus.RECEIVED &&
      t.status !== WarehouseTransferStatus.CANCELLED
    );
  }

  getStatusLabel(status: string): string {
    return this.almacenService.getTransferStatusLabel(status);
  }

  getTypeLabel(type: string): string {
    return this.almacenService.getTransferTypeLabel(type);
  }

  getItemPartName(item: WarehouseTransferItem): string {
    return item.part?.name ?? item.partId;
  }
}
