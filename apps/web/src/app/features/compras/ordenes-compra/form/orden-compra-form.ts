import { Component, OnInit, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import {
  FormBuilder,
  FormGroup,
  FormArray,
  ReactiveFormsModule,
  Validators,
} from "@angular/forms";
import { Router, RouterModule } from "@angular/router";
import { ToastrService } from "ngx-toastr";

import { ComprasService } from "../../compras.service";
import { InventarioRefaccionesService } from "../../../inventario-refacciones/inventario-refacciones.service";
import { BranchesService } from "../../../inventario-refacciones/services/branches.service";
import { CreatePurchaseOrderDto, CreatePurchaseOrderLineDto } from "../../models/purchase-order.model";
import { Part } from "../../../inventario-refacciones/models/part.model";

@Component({
  selector: "app-orden-compra-form",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: "./orden-compra-form.html",
  styleUrls: ["./orden-compra-form.scss"],
})
export class OrdenCompraForm implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private comprasService = inject(ComprasService);
  private inventarioService = inject(InventarioRefaccionesService);
  private branchesService = inject(BranchesService);
  private toastr = inject(ToastrService);

  form!: FormGroup;
  loading = signal(false);
  branches = signal<{ id: string; name: string }[]>([]);
  suppliers = signal<{ id: string; name: string }[]>([]);
  parts = signal<Part[]>([]);
  partsLoading = signal(false);

  ngOnInit(): void {
    this.form = this.fb.group({
      branchId: ["", Validators.required],
      supplierId: ["", Validators.required],
      orderedAt: [new Date().toISOString().split("T")[0], Validators.required],
      expectedAt: [""],
      notes: [""],
      lines: this.fb.array([this.createLineGroup()]),
    });

    this.branchesService.getAll().subscribe({
      next: (res) =>
        this.branches.set(res.data.map((b) => ({ id: b.id, name: b.name }))),
    });
    this.comprasService.getSuppliers({ limit: 500, isActive: true }).subscribe({
      next: (res) =>
        this.suppliers.set(res.data.map((s) => ({ id: s.id, name: s.name }))),
    });

    this.form.get("branchId")?.valueChanges.subscribe((branchId) => {
      if (branchId) this.loadParts(branchId);
      else this.parts.set([]);
    });
  }

  private createLineGroup(): FormGroup {
    return this.fb.group({
      partId: ["", Validators.required],
      quantity: [1, [Validators.required, Validators.min(1)]],
      unitPrice: [0, [Validators.required, Validators.min(0)]],
    });
  }

  get lines(): FormArray {
    return this.form.get("lines") as FormArray;
  }

  addLine(): void {
    this.lines.push(this.createLineGroup());
  }

  removeLine(index: number): void {
    if (this.lines.length > 1) this.lines.removeAt(index);
  }

  private loadParts(branchId: string): void {
    this.partsLoading.set(true);
    this.inventarioService
      .getParts({ branchId, limit: 500, searchScope: "local" })
      .subscribe({
        next: (res) => {
          this.parts.set(res.data);
          this.partsLoading.set(false);
        },
        error: () => this.partsLoading.set(false),
      });
  }

  onPartSelect(index: number): void {
    const partId = this.lines.at(index).get("partId")?.value;
    const part = this.parts().find((p) => p.id === partId);
    if (part) {
      this.lines.at(index).patchValue({ unitPrice: part.purchasePrice });
    }
  }

  submit(): void {
    if (this.form.invalid || this.loading()) return;

    const raw = this.form.getRawValue();
    const lines: CreatePurchaseOrderLineDto[] = raw.lines
      .filter((l: { partId: string }) => l.partId)
      .map((l: { partId: string; quantity: number; unitPrice: number }) => ({
        partId: l.partId,
        quantity: Number(l.quantity),
        unitPrice: Number(l.unitPrice),
      }));

    if (lines.length === 0) {
      this.toastr.error("Debe incluir al menos una línea");
      return;
    }

    const dto: CreatePurchaseOrderDto = {
      branchId: raw.branchId,
      supplierId: raw.supplierId,
      orderedAt: raw.orderedAt,
      expectedAt: raw.expectedAt || undefined,
      notes: raw.notes || undefined,
      lines,
    };

    this.loading.set(true);
    this.comprasService.createPurchaseOrder(dto).subscribe({
      next: (order) => {
        this.toastr.success("Orden de compra creada");
        this.router.navigate(["/purchases/purchase-orders", order.id]);
      },
      error: (err) => {
        this.loading.set(false);
        this.toastr.error(err?.error?.message || "Error al crear orden");
      },
    });
  }

  getPartLabel(part: Part): string {
    return `${part.sku} — ${part.name} (${part.unitOfMeasure})`;
  }
}
