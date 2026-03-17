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
import { CatalogoService } from "../../../../catalogo/catalogo.service";
import { VehicleTypesService } from "../../../../catalogo/vehicle-types.service";

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
  private catalogoService = inject(CatalogoService);
  private vehicleTypesService = inject(VehicleTypesService);

  @Input() clientId!: string;

  form!: FormGroup;
  saving = false;
  error: string | null = null;
  brands: string[] = [];
  models: string[] = [];
  vehicleTypes: { value: string; label: string }[] = [];

  constructor() {
    this.form = this.fb.group({
      vehicleType: ["CAR", Validators.required],
      make: ["", [Validators.required, Validators.maxLength(100)]],
      model: ["", [Validators.required, Validators.maxLength(200)]],
      year: [
        new Date().getFullYear(),
        [Validators.required, Validators.min(1900), Validators.max(2100)],
      ],
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
    this.loadBrands();

    this.form.get("vehicleType")?.valueChanges.subscribe(() => {
      this.form.patchValue({ make: "", model: "" });
      this.models = [];
      this.loadBrands();
    });

    this.form.get("make")?.valueChanges.subscribe((make) => {
      this.form.patchValue({ model: "" });
      if (make) {
        this.catalogoService
          .getModels(this.form.get("vehicleType")?.value || "CAR", make)
          .subscribe({ next: (m) => (this.models = m) });
      } else {
        this.models = [];
      }
    });
  }

  private loadBrands(): void {
    const vt = this.form.get("vehicleType")?.value || "CAR";
    this.catalogoService.getBrands(vt).subscribe({ next: (b) => (this.brands = b) });
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
