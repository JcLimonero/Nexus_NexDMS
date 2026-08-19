import { Component, inject, Input, OnInit } from "@angular/core";
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from "@angular/forms";
import { CommonModule } from "@angular/common";
import { NgbActiveModal } from "@ng-bootstrap/ng-bootstrap";

import { CatalogoService } from "../../../../catalogo/catalogo.service";
import { GlobalBrandsService } from "../../../../catalogo/global-brands.service";
import { VehicleTypesService } from "../../../../catalogo/vehicle-types.service";
import type { GlobalModel } from "../../../../catalogo/models/modelo-global.model";

@Component({
  selector: "app-modelo-quick-dialog",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: "./modelo-quick-dialog.html",
  styleUrls: ["./modelo-quick-dialog.scss"],
})
export class ModeloQuickDialog implements OnInit {
  private fb = inject(FormBuilder);
  private activeModal = inject(NgbActiveModal);
  private catalogoService = inject(CatalogoService);
  private globalBrandsService = inject(GlobalBrandsService);
  private vehicleTypesService = inject(VehicleTypesService);

  @Input() brandId = "";
  @Input() vehicleTypeId = "";
  @Input() brandName = "";

  form!: FormGroup;
  saving = false;
  error: string | null = null;
  brands: { id: string; name: string }[] = [];
  vehicleTypes: { id: string; code: string; label: string }[] = [];

  constructor() {
    this.form = this.fb.group({
      brandId: ["", Validators.required],
      vehicleTypeId: ["", Validators.required],
      model: ["", [Validators.required, Validators.maxLength(200)]],
      version: ["", [Validators.required, Validators.maxLength(100)]],
      year: [
        new Date().getFullYear(),
        [Validators.required, Validators.min(1900), Validators.max(2100)],
      ],
    });
  }

  ngOnInit(): void {
    this.globalBrandsService.getAll().subscribe({
      next: (list) =>
        (this.brands = list
          .filter((b) => b.isActive)
          .map((b) => ({ id: b.id, name: b.name }))),
    });
    this.vehicleTypesService.getAll().subscribe({
      next: (list) =>
        (this.vehicleTypes = list.map((t) => ({
          id: t.id,
          code: t.code,
          label: t.label,
        }))),
    });
    this.form.patchValue({
      brandId: this.brandId || undefined,
      vehicleTypeId: this.vehicleTypeId || undefined,
    });
  }

  dismiss(): void {
    this.activeModal.dismiss();
  }

  submit(): void {
    if (this.form.invalid || this.saving) return;

    const raw = this.form.getRawValue();
    const dto = {
      brandId: raw.brandId,
      vehicleTypeId: raw.vehicleTypeId,
      model: raw.model.trim(),
      version: raw.version?.trim(),
      year: Number(raw.year),
    };

    this.saving = true;
    this.error = null;

    this.catalogoService.create(dto).subscribe({
      next: (created: GlobalModel) => {
        this.activeModal.close(created);
      },
      error: (err) => {
        this.saving = false;
        this.error = err?.error?.message || "Error al crear variante";
      },
    });
  }
}
