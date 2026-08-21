import { Component, OnInit, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { RouterModule } from "@angular/router";
import { Subject } from "rxjs";
import { debounceTime, switchMap } from "rxjs/operators";

import { Router } from "@angular/router";
import { ToastrService } from "ngx-toastr";

import { ComprasService } from "../../compras.service";
import { BranchesService } from "../../../inventario-refacciones/services/branches.service";
import {
  PurchaseOrder,
  PurchaseOrderStatus,
  ImportCfdiResult,
} from "../../models/purchase-order.model";
import { Supplier } from "../../models/supplier.model";
import { FeatherIcons } from "../../../../shared/components/feather-icons/feather-icons";

@Component({
  selector: "app-ordenes-compra-list",
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, FeatherIcons],
  templateUrl: "./ordenes-compra-list.html",
  styleUrls: ["./ordenes-compra-list.scss"],
})
export class OrdenesCompraList implements OnInit {
  private comprasService = inject(ComprasService);
  private branchesService = inject(BranchesService);
  private router = inject(Router);
  private toastr = inject(ToastrService);

  // Import de factura de compra (CFDI XML).
  importOpen = signal(false);
  importing = signal(false);
  importBranchId = "";
  importXml = "";
  importFileName = signal<string>("");
  importResult = signal<ImportCfdiResult | null>(null);

  ordenes = signal<PurchaseOrder[]>([]);
  suppliers = signal<Record<string, Supplier>>({});
  branches = signal<{ id: string; name: string }[]>([]);
  meta = signal<{ total: number; page: number; limit: number; totalPages: number } | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);
  searchFilter = signal<string>("");
  statusFilter = signal<string>("");
  branchFilter = signal<string>("");
  supplierFilter = signal<string>("");

  private loadSubject = new Subject<void>();

  ngOnInit(): void {
    this.branchesService.getAll().subscribe({
      next: (res) =>
        this.branches.set(res.data.map((b) => ({ id: b.id, name: b.name }))),
    });
    this.comprasService.getSuppliers({ limit: 500 }).subscribe({
      next: (res) => {
        const map: Record<string, Supplier> = {};
        res.data.forEach((s) => (map[s.id] = s));
        this.suppliers.set(map);
      },
    });

    this.loadSubject
      .pipe(
        debounceTime(100),
        switchMap(() =>
          this.comprasService.getPurchaseOrders({
            search: this.searchFilter().trim() || undefined,
            status: this.statusFilter() as PurchaseOrderStatus | undefined,
            branchId: this.branchFilter() || undefined,
            supplierId: this.supplierFilter() || undefined,
            page: this.meta()?.page ?? 1,
            limit: 20,
          }),
        ),
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

  load(): void {
    this.loading.set(true);
    this.loadSubject.next();
  }

  onSearchFilterChange(value: string): void {
    this.searchFilter.set(value);
    this.meta.update((m) => (m ? { ...m, page: 1 } : null));
    this.load();
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

  onSupplierFilterChange(value: string): void {
    this.supplierFilter.set(value);
    this.meta.update((m) => (m ? { ...m, page: 1 } : null));
    this.load();
  }

  goToPage(page: number): void {
    const m = this.meta();
    if (!m || page < 1 || page > m.totalPages) return;
    this.meta.update((prev) => (prev ? { ...prev, page } : null));
    this.load();
  }

  getSupplierName(id: string): string {
    return this.suppliers()[id]?.name ?? id;
  }

  getBranchName(id: string): string {
    return this.branches().find((b) => b.id === id)?.name ?? id;
  }

  getStatusLabel(status: string): string {
    return this.comprasService.getStatusLabel(status);
  }

  // ─── Importar CFDI XML ──────────────────────────────────────

  abrirImport(): void {
    this.importOpen.set(true);
    this.importResult.set(null);
    this.importXml = "";
    this.importFileName.set("");
    this.importBranchId = this.branches()[0]?.id ?? "";
  }

  cerrarImport(): void {
    this.importOpen.set(false);
  }

  onXmlFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.importFileName.set(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      this.importXml = String(reader.result ?? "");
    };
    reader.readAsText(file);
  }

  importar(): void {
    if (!this.importBranchId || !this.importXml.trim()) {
      this.toastr.warning("Elige sucursal y archivo XML");
      return;
    }
    this.importing.set(true);
    this.comprasService
      .importCfdiXml(this.importBranchId, this.importXml)
      .subscribe({
        next: (res) => {
          this.importing.set(false);
          this.importResult.set(res);
          this.toastr.success(`Orden ${res.order.folio} creada en borrador`);
          this.load();
        },
        error: (err) => {
          this.importing.set(false);
          this.toastr.error(err?.error?.message || "No se pudo importar el XML");
        },
      });
  }

  irAOrden(id: string): void {
    this.cerrarImport();
    this.router.navigate(["/purchases/purchase-orders", id]);
  }
}
