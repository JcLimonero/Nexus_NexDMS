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

import { InventarioRefaccionesService } from "../../inventario-refacciones.service";
import { BranchesService } from "../../services/branches.service";
import {
  CreatePartDto,
  PartVehicleType,
} from "../../models/part.model";
import { PartCategory } from "../../models/part-category.model";
import { StockLocation } from "../../models/stock-location.model";

@Component({
  selector: "app-parte-form",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: "./parte-form.html",
  styleUrls: ["./parte-form.scss"],
})
export class ParteForm implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private inventarioService = inject(InventarioRefaccionesService);
  private branchesService = inject(BranchesService);
  private toastr = inject(ToastrService);

  form!: FormGroup;
  loading = signal(false);
  isEdit = signal(false);
  parteId = signal<string | null>(null);
  branches = signal<{ id: string; name: string }[]>([]);
  categorias = signal<PartCategory[]>([]);
  ubicaciones = signal<StockLocation[]>([]);

  readonly vehicleTypes = [
    { value: PartVehicleType.MOTORCYCLE, label: "Moto" },
    { value: PartVehicleType.CAR, label: "Auto" },
    { value: PartVehicleType.BOTH, label: "Ambos" },
  ];

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get("id");
    this.isEdit.set(!!id);
    this.parteId.set(id);

    this.branchesService.getAll().subscribe({
      next: (res) => this.branches.set(res.data.map((b) => ({ id: b.id, name: b.name }))),
    });
    this.inventarioService.getCategories({ limit: 200 }).subscribe({
      next: (res) => this.categorias.set(res.data),
    });

    this.form = this.fb.group({
      branchId: ["", Validators.required],
      categoryId: [null as string | null],
      locationId: [null as string | null],
      sku: ["", [Validators.maxLength(50)]],
      barcode: ["", [Validators.maxLength(100)]],
      name: ["", [Validators.required, Validators.maxLength(200)]],
      description: ["", [Validators.maxLength(1000)]],
      vehicleType: [PartVehicleType.BOTH, Validators.required],
      compatibleMakes: ["", [Validators.maxLength(500)]],
      unitOfMeasure: ["PZA", [Validators.maxLength(20)]],
      purchasePrice: [0, [Validators.required, Validators.min(0)]],
      publicPrice: [0, [Validators.required, Validators.min(0)]],
      wholesalePrice: [0, [Validators.required, Validators.min(0)]],
      businessPrice: [0, [Validators.required, Validators.min(0)]],
      maxDiscountPct: [0, [Validators.min(0), Validators.max(100)]],
      minStock: [0, [Validators.min(0)]],
      maxStock: [null as number | null, [Validators.min(0)]],
      isActive: [true],
    });

    this.form.get("branchId")?.valueChanges.subscribe((branchId) => {
      if (branchId) {
        this.inventarioService.getLocations(branchId).subscribe({
          next: (locs) => this.ubicaciones.set(locs),
        });
      } else {
        this.ubicaciones.set([]);
      }
    });

    if (id) {
      this.loadParte(id);
    }
  }

  private loadParte(id: string): void {
    this.loading.set(true);
    this.inventarioService.getPart(id).subscribe({
      next: (p) => {
        this.form.patchValue({
          branchId: p.branchId,
          categoryId: p.categoryId,
          locationId: p.locationId,
          sku: p.sku ?? "",
          barcode: p.barcode ?? "",
          name: p.name,
          description: p.description ?? "",
          vehicleType: p.vehicleType,
          compatibleMakes: p.compatibleMakes ?? "",
          unitOfMeasure: p.unitOfMeasure ?? "PZA",
          purchasePrice: p.purchasePrice,
          publicPrice: p.publicPrice,
          wholesalePrice: p.wholesalePrice,
          businessPrice: p.businessPrice,
          maxDiscountPct: p.maxDiscountPct ?? 0,
          minStock: p.minStock ?? 0,
          maxStock: p.maxStock,
          isActive: p.isActive,
        });
        this.form.get("branchId")?.disable();
        this.inventarioService.getLocations(p.branchId).subscribe({
          next: (locs) => this.ubicaciones.set(locs),
        });
        this.loading.set(false);
      },
      error: (err) => {
        this.toastr.error(err?.error?.message || "Error al cargar parte");
        this.router.navigate(["/inventario-refacciones"]);
      },
    });
  }

  submit(): void {
    if (this.form.invalid || this.loading()) return;

    const raw = this.form.getRawValue();
    const dto: CreatePartDto = {
      branchId: raw.branchId,
      categoryId: raw.categoryId || undefined,
      locationId: raw.locationId || undefined,
      sku: raw.sku || undefined,
      barcode: raw.barcode || undefined,
      name: raw.name,
      description: raw.description || undefined,
      vehicleType: raw.vehicleType as PartVehicleType,
      compatibleMakes: raw.compatibleMakes || undefined,
      unitOfMeasure: raw.unitOfMeasure || undefined,
      purchasePrice: Number(raw.purchasePrice),
      publicPrice: Number(raw.publicPrice),
      wholesalePrice: Number(raw.wholesalePrice),
      businessPrice: Number(raw.businessPrice),
      maxDiscountPct: Number(raw.maxDiscountPct) || 0,
      minStock: Number(raw.minStock) || 0,
      maxStock: raw.maxStock != null ? Number(raw.maxStock) : undefined,
      isActive: raw.isActive,
    };

    this.loading.set(true);
    const id = this.parteId();

    if (id) {
      this.inventarioService.updatePart(id, dto).subscribe({
        next: () => {
          this.toastr.success("Parte actualizada");
          this.router.navigate(["/inventario-refacciones", id]);
        },
        error: (err) => {
          this.loading.set(false);
          this.toastr.error(err?.error?.message || "Error al actualizar");
        },
      });
    } else {
      this.inventarioService.createPart(dto).subscribe({
        next: (parte) => {
          this.toastr.success("Parte creada");
          this.router.navigate(["/inventario-refacciones", parte.id]);
        },
        error: (err) => {
          this.loading.set(false);
          this.toastr.error(err?.error?.message || "Error al crear");
        },
      });
    }
  }
}
