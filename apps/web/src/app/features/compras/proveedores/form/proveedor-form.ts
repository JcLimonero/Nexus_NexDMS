import { Component, OnInit, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from "@angular/forms";
import { Router, ActivatedRoute, RouterModule } from "@angular/router";
import { ToastrService } from "ngx-toastr";

import { ComprasService } from "../../compras.service";
import { CreateSupplierDto, SupplierCredit } from "../../models/supplier.model";

@Component({
  selector: "app-proveedor-form",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: "./proveedor-form.html",
  styleUrls: ["./proveedor-form.scss"],
})
export class ProveedorForm implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private comprasService = inject(ComprasService);
  private toastr = inject(ToastrService);

  form!: FormGroup;
  loading = signal(false);
  isEdit = signal(false);
  proveedorId = signal<string | null>(null);
  credito = signal<SupplierCredit | null>(null);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get("id");
    this.isEdit.set(!!id);
    this.proveedorId.set(id);

    this.form = this.fb.group({
      name: ["", [Validators.required, Validators.maxLength(300)]],
      contactName: ["", [Validators.maxLength(200)]],
      phone: ["", [Validators.maxLength(20)]],
      email: ["", [Validators.email, Validators.maxLength(300)]],
      rfc: ["", [Validators.maxLength(13)]],
      address: ["", [Validators.maxLength(500)]],
      paymentTerms: ["", [Validators.maxLength(200)]],
      creditDays: [0, [Validators.min(0)]],
      creditLimit: [0, [Validators.min(0)]],
      notes: [""],
      isActive: [true],
    });

    if (id) {
      this.loadProveedor(id);
      this.comprasService.getSupplierCredit(id).subscribe({
        next: (c) => this.credito.set(c),
      });
    }
  }

  money(n: number): string {
    return (Number(n) || 0).toLocaleString("es-MX", {
      style: "currency",
      currency: "MXN",
    });
  }

  private loadProveedor(id: string): void {
    this.loading.set(true);
    this.comprasService.getSupplier(id).subscribe({
      next: (p) => {
        this.form.patchValue({
          name: p.name,
          contactName: p.contactName ?? "",
          phone: p.phone ?? "",
          email: p.email ?? "",
          rfc: p.rfc ?? "",
          address: p.address ?? "",
          paymentTerms: p.paymentTerms ?? "",
          creditDays: p.creditDays ?? 0,
          creditLimit: p.creditLimit ?? 0,
          notes: p.notes ?? "",
          isActive: p.isActive,
        });
        this.loading.set(false);
      },
      error: (err) => {
        this.toastr.error(err?.error?.message || "Error al cargar proveedor");
        this.router.navigate(["/purchases/proveedores"]);
      },
    });
  }

  submit(): void {
    if (this.form.invalid || this.loading()) return;

    const raw = this.form.getRawValue();
    const dto: CreateSupplierDto = {
      name: raw.name,
      contactName: raw.contactName || undefined,
      phone: raw.phone || undefined,
      email: raw.email || undefined,
      rfc: raw.rfc || undefined,
      address: raw.address || undefined,
      paymentTerms: raw.paymentTerms || undefined,
      creditDays: Number(raw.creditDays) || 0,
      creditLimit: Number(raw.creditLimit) || 0,
      notes: raw.notes || undefined,
      isActive: raw.isActive,
    };

    this.loading.set(true);
    const id = this.proveedorId();

    if (id) {
      this.comprasService.updateSupplier(id, dto).subscribe({
        next: () => {
          this.toastr.success("Proveedor actualizado");
          this.router.navigate(["/purchases/proveedores"]);
        },
        error: (err) => {
          this.loading.set(false);
          this.toastr.error(err?.error?.message || "Error al actualizar");
        },
      });
    } else {
      this.comprasService.createSupplier(dto).subscribe({
        next: () => {
          this.toastr.success("Proveedor creado");
          this.router.navigate(["/purchases/proveedores"]);
        },
        error: (err) => {
          this.loading.set(false);
          this.toastr.error(err?.error?.message || "Error al crear");
        },
      });
    }
  }
}
