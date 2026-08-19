import { Component, inject, Input, OnInit } from "@angular/core";
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from "@angular/forms";
import { CommonModule } from "@angular/common";
import { NgbActiveModal } from "@ng-bootstrap/ng-bootstrap";

import { TallerService } from "../../../taller.service";
import { VehicleTypesService } from "../../../../catalogo/vehicle-types.service";
import { GlobalBrandsService } from "../../../../catalogo/global-brands.service";
import { VehicleModelsService } from "../../../../catalogo/vehicle-models.service";
import { VehicleColorsService } from "../../../../catalogo/vehicle-colors.service";

@Component({
  selector: "app-vehiculo-quick-dialog",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: "./vehiculo-quick-dialog.html",
  styleUrls: ["./vehiculo-quick-dialog.scss"],
})
export class VehiculoQuickDialog implements OnInit {
  private fb = inject(FormBuilder);
  private activeModal = inject(NgbActiveModal);
  private tallerService = inject(TallerService);
  private vehicleTypesService = inject(VehicleTypesService);
  private globalBrandsService = inject(GlobalBrandsService);
  private vehicleModelsService = inject(VehicleModelsService);
  private vehicleColorsService = inject(VehicleColorsService);

  @Input() clientId!: string;

  form!: FormGroup;
  saving = false;
  error: string | null = null;
  brands: { id: string; name: string }[] = [];
  vehicleModels: { id: string; name: string }[] = [];
  colors: string[] = [];
  vehicleTypes: { value: string; label: string }[] = [];
  colorOther = false;

  constructor() {
    this.form = this.fb.group({
      vehicleType: ["CAR", Validators.required],
      brandId: [""],
      make: ["", [Validators.required, Validators.maxLength(100)]],
      modelId: [""],
      model: ["", [Validators.required, Validators.maxLength(200)]],
      year: [
        new Date().getFullYear(),
        [Validators.required, Validators.min(1900), Validators.max(2100)],
      ],
      colorSelect: [""],
      color: ["", [Validators.maxLength(100)]],
      plate: ["", [Validators.maxLength(20)]],
      vin: ["", [Validators.maxLength(100)]],
      mileage: [0, [Validators.min(0)]],
    });
  }

  ngOnInit(): void {
    this.vehicleTypesService.getAll().subscribe({
      next: (types) =>
        (this.vehicleTypes = types.map((t) => ({ value: t.code, label: t.label }))),
    });
    this.globalBrandsService.getAll().subscribe({
      next: (list) =>
        (this.brands = list
          .filter((b) => b.isActive)
          .map((b) => ({ id: b.id, name: b.name }))),
    });
    this.vehicleColorsService.findDistinctExteriorNames().subscribe({
      next: (names) => (this.colors = names),
    });

    this.form.get("colorSelect")?.valueChanges.subscribe((val) => {
      this.colorOther = val === "__other__";
      if (val && val !== "__other__") {
        this.form.patchValue({ color: val }, { emitEvent: false });
      } else if (val !== "__other__") {
        this.form.patchValue({ color: "" }, { emitEvent: false });
      }
    });
  }

  private loadModels(brandId: string): void {
    this.form.patchValue({ modelId: "", model: "" }, { emitEvent: false });
    this.vehicleModelsService.findByBrandId(brandId).subscribe({
      next: (models) =>
        (this.vehicleModels = models.map((m) => ({ id: m.id, name: m.name }))),
    });
  }

  onBrandSelected(value: string): void {
    if (!value) return;
    const brand = this.brands.find((b) => b.id === value);
    if (brand) {
      this.form.patchValue({ make: brand.name, brandId: brand.id });
      this.loadModels(brand.id);
    }
  }

  onModelSelected(value: string): void {
    if (!value) return;
    const model = this.vehicleModels.find((m) => m.id === value);
    if (model) {
      this.form.patchValue({ model: model.name });
    }
  }

  dismiss(): void {
    this.activeModal.dismiss();
  }

  submit(): void {
    if (this.form.invalid || this.saving || !this.clientId) return;

    const raw = this.form.getRawValue();
    const dto = {
      vehicleType: raw.vehicleType,
      make: raw.make.trim(),
      model: raw.model.trim(),
      year: Number(raw.year),
      color: raw.color?.trim() || undefined,
      plate: raw.plate?.trim() || undefined,
      vin: raw.vin?.trim() || undefined,
      mileage: raw.mileage ? Number(raw.mileage) : undefined,
    };

    this.saving = true;
    this.error = null;

    this.tallerService.createVehicle(this.clientId, dto).subscribe({
      next: (vehicle) => {
        this.activeModal.close(vehicle);
      },
      error: (err) => {
        this.saving = false;
        this.error = err?.error?.message || "Error al crear vehículo";
      },
    });
  }
}
