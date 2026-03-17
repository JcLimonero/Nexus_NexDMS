import { Component, OnInit, inject, signal } from "@angular/core";
import {
  FormBuilder,
  FormGroup,
  FormArray,
  ReactiveFormsModule,
  Validators,
} from "@angular/forms";
import { CommonModule } from "@angular/common";
import { Router, RouterModule } from "@angular/router";
import { ToastrService } from "ngx-toastr";

import { AlmacenService } from "../../almacen.service";
import { BranchesService } from "../../../inventario-refacciones/services/branches.service";
import { InventarioRefaccionesService } from "../../../inventario-refacciones/inventario-refacciones.service";
import {
  CreateWarehouseTransferDto,
  CreateWarehouseTransferLineDto,
  WarehouseTransferType,
} from "../../models/warehouse-transfer.model";
import { Part } from "../../../inventario-refacciones/models/part.model";

@Component({
  selector: "app-transferencia-form",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: "./transferencia-form.html",
  styleUrls: ["./transferencia-form.scss"],
})
export class TransferenciaForm implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private almacenService = inject(AlmacenService);
  private branchesService = inject(BranchesService);
  private inventarioService = inject(InventarioRefaccionesService);
  private toastr = inject(ToastrService);

  form!: FormGroup;
  loading = signal(false);
  branches = signal<{ id: string; name: string }[]>([]);
  parts = signal<Part[]>([]);
  partsLoading = signal(false);

  readonly types = [
    { value: WarehouseTransferType.INTRA_BRAND, label: "Misma marca" },
    { value: WarehouseTransferType.INTER_BRAND, label: "Otra marca" },
  ];

  ngOnInit(): void {
    this.form = this.fb.group({
      originBranchId: ["", Validators.required],
      destinationBranchId: ["", Validators.required],
      type: [WarehouseTransferType.INTRA_BRAND, Validators.required],
      notes: [""],
      lines: this.fb.array([this.createLineGroup()]),
    });

    this.branchesService.getAll().subscribe({
      next: (res) =>
        this.branches.set(res.data.map((b) => ({ id: b.id, name: b.name }))),
    });

    this.form.get("originBranchId")?.valueChanges.subscribe((branchId) => {
      if (branchId) this.loadParts(branchId);
      else this.parts.set([]);
    });
  }

  private createLineGroup(): FormGroup {
    return this.fb.group({
      partId: ["", Validators.required],
      quantity: [1, [Validators.required, Validators.min(1)]],
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

  submit(): void {
    if (this.form.invalid || this.loading()) return;

    const raw = this.form.getRawValue();
    const originId = raw.originBranchId;
    const destId = raw.destinationBranchId;

    if (originId === destId) {
      this.toastr.error("Origen y destino deben ser diferentes");
      return;
    }

    const lines: CreateWarehouseTransferLineDto[] = raw.lines
      .filter((l: { partId: string }) => l.partId)
      .map((l: { partId: string; quantity: number }) => ({
        partId: l.partId,
        quantity: Number(l.quantity),
      }));

    if (lines.length === 0) {
      this.toastr.error("Debe incluir al menos una línea");
      return;
    }

    const dto: CreateWarehouseTransferDto = {
      originBranchId: originId,
      destinationBranchId: destId,
      type: raw.type as WarehouseTransferType,
      notes: raw.notes || undefined,
      lines,
    };

    this.loading.set(true);
    this.almacenService.createWarehouseTransfer(dto).subscribe({
      next: (transfer) => {
        this.toastr.success("Transferencia creada");
        this.router.navigate(["/warehouse/transferencias", transfer.id]);
      },
      error: (err) => {
        this.loading.set(false);
        this.toastr.error(
          err?.error?.message || "Error al crear transferencia"
        );
      },
    });
  }

  getPartLabel(part: Part): string {
    return `${part.sku} — ${part.name} (${part.unitOfMeasure})`;
  }
}
