import { Component, OnInit, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { ToastrService } from "ngx-toastr";

import {
  DevolucionesService,
  PartReturn,
  ReturnKind,
  RefundMethod,
} from "./devoluciones.service";
import { InventarioRefaccionesService } from "../../inventario-refacciones/inventario-refacciones.service";
import { Part } from "../../inventario-refacciones/models/part.model";
import { BranchesService } from "../../inventario-refacciones/services/branches.service";
import { ComprasService } from "../../compras/compras.service";
import { Supplier } from "../../compras/models/supplier.model";
import { ClientesService } from "../../clientes/clientes.service";
import { Client } from "../../clientes/models/client.model";

interface Linea {
  partId: string;
  sku: string;
  name: string;
  quantity: number;
  unitPrice: number;
  condition: "GOOD" | "DEFECTIVE";
}

@Component({
  selector: "app-devoluciones",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./devoluciones.html",
})
export class Devoluciones implements OnInit {
  private srv = inject(DevolucionesService);
  private partsSrv = inject(InventarioRefaccionesService);
  private branchesSrv = inject(BranchesService);
  private comprasSrv = inject(ComprasService);
  private clientesSrv = inject(ClientesService);
  private toastr = inject(ToastrService);

  cargando = signal(true);
  guardando = signal(false);
  devoluciones = signal<PartReturn[]>([]);
  branches = signal<{ id: string; name: string }[]>([]);
  suppliers = signal<Supplier[]>([]);
  clientResults = signal<Client[]>([]);

  // Formulario
  kind: ReturnKind = "CLIENT_RETURN";
  branchId = "";
  clientId = "";
  clientLabel = "";
  supplierId = "";
  isWarranty = false;
  restock = true;
  reason = "";
  refundMethod: RefundMethod = "CREDIT_NOTE";
  cfdiId = "";
  lineas = signal<Linea[]>([]);

  // Búsqueda de refacciones
  busqueda = "";
  resultados = signal<Part[]>([]);

  ngOnInit(): void {
    this.branchesSrv.getAll().subscribe({
      next: (res) => {
        const bs = res.data.map((b) => ({ id: b.id, name: b.name }));
        this.branches.set(bs);
        if (bs.length && !this.branchId) this.branchId = bs[0].id;
      },
    });
    this.comprasSrv.getSuppliers({ isActive: true, limit: 500 }).subscribe({
      next: (res) => this.suppliers.set(res.data),
    });
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.srv.getReturns().subscribe({
      next: (rows) => {
        this.devoluciones.set(rows);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false),
    });
  }

  etiquetaKind(k: ReturnKind): string {
    return k === "CLIENT_RETURN" ? "Devolución de cliente" : "Reclamo a proveedor";
  }

  etiquetaRefund(m: RefundMethod): string {
    return { CASH: "Efectivo", CREDIT_NOTE: "Nota de crédito", REPLACEMENT: "Reemplazo", NONE: "Sin reembolso" }[m];
  }

  buscarPartes(): void {
    const term = this.busqueda.trim();
    if (term.length < 2) {
      this.resultados.set([]);
      return;
    }
    this.partsSrv.getParts({ search: term, branchId: this.branchId }).subscribe({
      next: (res) => this.resultados.set(res.data),
    });
  }

  agregarLinea(p: Part): void {
    if (this.lineas().some((l) => l.partId === p.id)) return;
    this.lineas.update((ls) => [
      ...ls,
      {
        partId: p.id,
        sku: p.sku,
        name: p.name,
        quantity: 1,
        unitPrice:
          this.kind === "SUPPLIER_CLAIM" ? p.purchasePrice : p.publicPrice,
        condition: this.kind === "SUPPLIER_CLAIM" ? "DEFECTIVE" : "GOOD",
      },
    ]);
    this.busqueda = "";
    this.resultados.set([]);
  }

  quitarLinea(partId: string): void {
    this.lineas.update((ls) => ls.filter((l) => l.partId !== partId));
  }

  total(): number {
    return this.lineas().reduce((a, l) => a + l.quantity * l.unitPrice, 0);
  }

  buscarCliente(q: string): void {
    if (q.trim().length < 2) {
      this.clientResults.set([]);
      return;
    }
    this.clientesSrv.search(q).subscribe({
      next: (cs) => this.clientResults.set(cs),
    });
  }

  elegirCliente(c: Client): void {
    this.clientId = c.id;
    this.clientLabel = c.companyName || `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim();
    this.clientResults.set([]);
  }

  guardar(): void {
    if (!this.branchId) {
      this.toastr.warning("Elige sucursal");
      return;
    }
    if (!this.lineas().length) {
      this.toastr.warning("Agrega al menos una refacción");
      return;
    }
    this.guardando.set(true);
    this.srv
      .createReturn({
        branchId: this.branchId,
        kind: this.kind,
        clientId: this.kind === "CLIENT_RETURN" ? this.clientId || undefined : undefined,
        supplierId: this.kind === "SUPPLIER_CLAIM" ? this.supplierId || undefined : undefined,
        isWarranty: this.isWarranty,
        restock: this.restock,
        reason: this.reason || undefined,
        refundMethod: this.refundMethod,
        cfdiId:
          this.kind === "CLIENT_RETURN" && this.cfdiId
            ? this.cfdiId
            : undefined,
        lines: this.lineas().map((l) => ({
          partId: l.partId,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          condition: l.condition,
        })),
      })
      .subscribe({
        next: (r) => {
          this.guardando.set(false);
          this.toastr.success(`Devolución ${r.folio} registrada`);
          this.resetForm();
          this.cargar();
        },
        error: (err) => {
          this.guardando.set(false);
          this.toastr.error(err?.error?.message || "No se pudo registrar");
        },
      });
  }

  private resetForm(): void {
    this.clientId = "";
    this.clientLabel = "";
    this.supplierId = "";
    this.isWarranty = false;
    this.restock = true;
    this.reason = "";
    this.cfdiId = "";
    this.lineas.set([]);
    this.busqueda = "";
    this.resultados.set([]);
  }

  emitirNc(d: PartReturn): void {
    this.srv.emitNotaCredito(d.id).subscribe({
      next: (r) => {
        this.toastr.success(`Nota de crédito emitida (${r.folio})`);
        this.cargar();
      },
      error: (err) =>
        this.toastr.error(err?.error?.message || "No se pudo emitir la NC"),
    });
  }
}
