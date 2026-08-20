import { Component, OnInit, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Router, ActivatedRoute, RouterModule } from "@angular/router";
import { ToastrService } from "ngx-toastr";

import { ComprasService } from "../../compras.service";
import { BranchesService } from "../../../inventario-refacciones/services/branches.service";
import {
  PurchaseOrder,
  PurchaseOrderItem,
  PurchaseOrderStatus,
  ReceiveLineDto,
} from "../../models/purchase-order.model";
import { Supplier } from "../../models/supplier.model";

@Component({
  selector: "app-orden-compra-detail",
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: "./orden-compra-detail.html",
  styleUrls: ["./orden-compra-detail.scss"],
})
export class OrdenCompraDetail implements OnInit {
  private comprasService = inject(ComprasService);
  private branchesService = inject(BranchesService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private toastr = inject(ToastrService);

  orden = signal<PurchaseOrder | null>(null);
  supplier = signal<Supplier | null>(null);
  branchName = signal("");
  loading = signal(true);
  error = signal<string | null>(null);
  sending = signal(false);
  receiving = signal(false);
  cancelling = signal(false);
  receiveQuantities = signal<Record<string, number>>({});
  // Órdenes de taller de las que salió esta compra (vía requisiciones).
  ordenesServicio = signal<{ id: string; folio: string; status: string }[]>([]);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get("id");
    if (!id) {
      this.router.navigate(["/purchases/purchase-orders"]);
      return;
    }

    this.comprasService.getPurchaseOrder(id).subscribe({
      next: (order) => {
        this.orden.set(order);
        this.initReceiveQuantities(order.items ?? []);
        this.loadSupplier(order.supplierId);
        this.loadBranch(order.branchId);
        this.comprasService.getServiceOrdersDeLaOrden(order.id).subscribe({
          next: (os) => this.ordenesServicio.set(os),
        });
        this.loading.set(false);
        this.error.set(null);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.message || "Error al cargar orden");
      },
    });
  }

  private initReceiveQuantities(items: PurchaseOrderItem[]): void {
    const qty: Record<string, number> = {};
    items.forEach((i) => {
      const pending = i.quantity - i.quantityReceived;
      qty[i.id] = pending > 0 ? pending : 0;
    });
    this.receiveQuantities.set(qty);
  }

  private loadSupplier(id: string): void {
    this.comprasService.getSupplier(id).subscribe({
      next: (s) => this.supplier.set(s),
    });
  }

  private loadBranch(id: string): void {
    this.branchesService.getAll().subscribe({
      next: (res) => {
        const b = res.data.find((x) => x.id === id);
        this.branchName.set(b?.name ?? id);
      },
    });
  }

  onSend(): void {
    const o = this.orden();
    if (!o || this.sending()) return;
    if (o.status !== PurchaseOrderStatus.DRAFT) return;

    this.sending.set(true);
    this.comprasService.sendPurchaseOrder(o.id).subscribe({
      next: (updated) => {
        this.orden.set(updated);
        this.toastr.success("Orden enviada al proveedor");
        this.sending.set(false);
      },
      error: (err) => {
        this.toastr.error(err?.error?.message || "Error al enviar");
        this.sending.set(false);
      },
    });
  }

  setReceiveQty(itemId: string, value: number | string): void {
    const n = typeof value === "string" ? parseInt(value, 10) || 0 : value;
    this.receiveQuantities.update((q) => ({ ...q, [itemId]: Math.max(0, n) }));
  }

  onReceive(): void {
    const o = this.orden();
    if (!o || this.receiving()) return;
    if (o.status !== PurchaseOrderStatus.SENT && o.status !== PurchaseOrderStatus.PARTIAL) return;

    const items = o.items ?? [];
    const lines: ReceiveLineDto[] = [];
    const received = this.receiveQuantities();

    items.forEach((item) => {
      const qty = received[item.id] ?? 0;
      if (qty > 0) {
        lines.push({ itemId: item.id, quantityReceived: qty });
      }
    });

    if (lines.length === 0) {
      this.toastr.warning("Indique las cantidades a recibir");
      return;
    }

    this.receiving.set(true);
    this.comprasService.receivePurchaseOrder(o.id, { lines }).subscribe({
      next: (updated) => {
        this.orden.set(updated);
        this.initReceiveQuantities(updated.items ?? []);
        this.toastr.success("Mercancía recibida");
        this.receiving.set(false);
      },
      error: (err) => {
        this.toastr.error(err?.error?.message || "Error al recibir");
        this.receiving.set(false);
      },
    });
  }

  onCancel(): void {
    const o = this.orden();
    if (!o || this.cancelling()) return;
    if (o.status === PurchaseOrderStatus.CANCELLED) return;
    if (!confirm("¿Cancelar esta orden de compra?")) return;

    this.cancelling.set(true);
    this.comprasService.cancelPurchaseOrder(o.id).subscribe({
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

  canSend(): boolean {
    const o = this.orden();
    return !!o && o.status === PurchaseOrderStatus.DRAFT;
  }

  canReceive(): boolean {
    const o = this.orden();
    return (
      !!o &&
      (o.status === PurchaseOrderStatus.SENT ||
        o.status === PurchaseOrderStatus.PARTIAL)
    );
  }

  canCancel(): boolean {
    const o = this.orden();
    return (
      !!o &&
      o.status !== PurchaseOrderStatus.RECEIVED &&
      o.status !== PurchaseOrderStatus.CANCELLED
    );
  }

  pagando = signal(false);

  /** Solo se paga lo ya recibido (total o parcialmente). */
  puedePagar(): boolean {
    const o = this.orden();
    return (
      !!o &&
      !o.paidAt &&
      (o.status === PurchaseOrderStatus.RECEIVED ||
        o.status === PurchaseOrderStatus.PARTIAL)
    );
  }

  marcarPagada(pagada: boolean): void {
    const o = this.orden();
    if (!o || this.pagando()) return;
    this.pagando.set(true);
    this.comprasService.markPurchaseOrderPaid(o.id, pagada).subscribe({
      next: (upd) => {
        this.orden.set(upd);
        this.pagando.set(false);
        this.toastr.success(pagada ? "Orden marcada como pagada" : "Pago revertido");
      },
      error: (err) => {
        this.pagando.set(false);
        this.toastr.error(err?.error?.message || "No se pudo actualizar");
      },
    });
  }

  getStatusLabel(status: string): string {
    return this.comprasService.getStatusLabel(status);
  }

  getItemPartName(item: PurchaseOrderItem): string {
    return item.part?.name ?? item.partId;
  }
}
