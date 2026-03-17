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

import { CajaVentasService } from "../../caja-ventas.service";
import { BranchesService } from "../../../inventario-refacciones/services/branches.service";
import { InventarioRefaccionesService } from "../../../inventario-refacciones/inventario-refacciones.service";
import { ClientesService } from "../../../clientes/clientes.service";
import {
  CreateSaleDto,
  CreateSaleLineDto,
  CreateSalePaymentDto,
  PriceList,
} from "../../models/sale.model";
import { Part } from "../../../inventario-refacciones/models/part.model";
import { ClientListItem } from "../../../clientes/models/client.model";

@Component({
  selector: "app-venta-form",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: "./venta-form.html",
  styleUrls: ["./venta-form.scss"],
})
export class VentaForm implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private cajaService = inject(CajaVentasService);
  private branchesService = inject(BranchesService);
  private inventarioService = inject(InventarioRefaccionesService);
  private clientesService = inject(ClientesService);
  private toastr = inject(ToastrService);

  form!: FormGroup;
  loading = signal(false);
  branches = signal<{ id: string; name: string }[]>([]);
  clients = signal<ClientListItem[]>([]);
  parts = signal<Part[]>([]);
  partsLoading = signal(false);

  readonly priceListOptions = [
    { value: PriceList.PUBLIC, label: "Público" },
    { value: PriceList.WHOLESALE, label: "Mayoreo" },
    { value: PriceList.BUSINESS, label: "Empresa" },
  ];

  readonly paymentMethods = [
    { value: "CASH" as const, label: "Efectivo" },
    { value: "CARD" as const, label: "Tarjeta" },
    { value: "TRANSFER" as const, label: "Transferencia" },
  ];

  getTotalCalculado(): { subtotal: number; tax: number; total: number } {
    const lines = this.form?.get("lines")?.value as Array<{ quantity: number; unitPrice: number; discount?: number }> | undefined;
    const discount = this.form?.get("discount")?.value ?? 0;
    if (!lines?.length) return { subtotal: 0, tax: 0, total: 0 };
    let subtotal = 0;
    for (const l of lines) {
      subtotal += (l.quantity * (l.unitPrice ?? 0)) - (l.discount ?? 0);
    }
    subtotal -= discount;
    const tax = Math.round(subtotal * 0.16 * 100) / 100;
    return { subtotal, tax, total: subtotal + tax };
  }

  ngOnInit(): void {
    this.form = this.fb.group({
      branchId: ["", Validators.required],
      clientId: [""],
      priceList: [PriceList.PUBLIC, Validators.required],
      discount: [0, [Validators.required, Validators.min(0)]],
      notes: [""],
      lines: this.fb.array([this.createLineGroup()]),
      payments: this.fb.array([this.createPaymentGroup()]),
    });

    this.branchesService.getAll().subscribe({
      next: (res) =>
        this.branches.set(res.data.map((b) => ({ id: b.id, name: b.name }))),
    });
    this.clientesService.getAll({ limit: 500 }).subscribe({
      next: (res) => this.clients.set(res.data),
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
      discount: [0, [Validators.required, Validators.min(0)]],
    });
  }

  private createPaymentGroup(): FormGroup {
    return this.fb.group({
      method: ["CASH" as const, Validators.required],
      amount: [0, [Validators.required, Validators.min(0.01)]],
      reference: [""],
    });
  }

  get lines(): FormArray {
    return this.form.get("lines") as FormArray;
  }

  get payments(): FormArray {
    return this.form.get("payments") as FormArray;
  }

  addLine(): void {
    this.lines.push(this.createLineGroup());
  }

  removeLine(index: number): void {
    if (this.lines.length > 1) this.lines.removeAt(index);
  }

  addPayment(): void {
    this.payments.push(this.createPaymentGroup());
  }

  removePayment(index: number): void {
    if (this.payments.length > 1) this.payments.removeAt(index);
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
    const priceList = this.form.get("priceList")?.value as PriceList;
    const part = this.parts().find((p) => p.id === partId);
    if (part) {
      let price = part.publicPrice;
      if (priceList === PriceList.WHOLESALE) price = part.wholesalePrice;
      else if (priceList === PriceList.BUSINESS) price = part.businessPrice;
      this.lines.at(index).patchValue({ unitPrice: price });
    }
  }

  submit(): void {
    if (this.form.invalid || this.loading()) return;

    const raw = this.form.getRawValue();
    const tot = this.getTotalCalculado();
    const paymentsSum = (raw.payments as CreateSalePaymentDto[]).reduce(
      (s: number, p: CreateSalePaymentDto) => s + p.amount,
      0
    );

    if (Math.abs(paymentsSum - tot.total) > 0.01) {
      this.toastr.error(
        `Los pagos ($${paymentsSum.toFixed(2)}) deben sumar el total ($${tot.total.toFixed(2)})`
      );
      return;
    }

    const lines: CreateSaleLineDto[] = raw.lines
      .filter((l: { partId: string }) => l.partId)
      .map((l: { partId: string; quantity: number; unitPrice: number; discount?: number }) => ({
        partId: l.partId,
        quantity: Number(l.quantity),
        unitPrice: Number(l.unitPrice),
        discount: Number(l.discount) || 0,
      }));

    if (lines.length === 0) {
      this.toastr.error("Debe incluir al menos una línea");
      return;
    }

    const payments: CreateSalePaymentDto[] = raw.payments
      .filter((p: CreateSalePaymentDto) => p.amount > 0)
      .map((p: CreateSalePaymentDto) => ({
        method: p.method,
        amount: Number(p.amount),
        reference: p.reference || undefined,
      }));

    if (payments.length === 0) {
      this.toastr.error("Debe incluir al menos un pago");
      return;
    }

    const dto: CreateSaleDto = {
      branchId: raw.branchId,
      clientId: raw.clientId || undefined,
      priceList: raw.priceList as PriceList,
      discount: Number(raw.discount) || 0,
      notes: raw.notes || undefined,
      lines,
      payments,
    };

    this.loading.set(true);
    this.cajaService.createSale(dto).subscribe({
      next: (sale) => {
        this.toastr.success("Venta registrada");
        this.router.navigate(["/cash-register/ventas", sale.id]);
      },
      error: (err) => {
        this.loading.set(false);
        this.toastr.error(err?.error?.message || "Error al registrar venta");
      },
    });
  }

  getPartLabel(part: Part): string {
    return `${part.sku} — ${part.name} (${part.unitOfMeasure})`;
  }

  getClientLabel(c: ClientListItem): string {
    return this.clientesService.getDisplayName(c);
  }

  updatePaymentsTotal(): void {
    const tot = this.getTotalCalculado();
    this.payments.at(0).patchValue({ amount: tot.total });
  }
}
