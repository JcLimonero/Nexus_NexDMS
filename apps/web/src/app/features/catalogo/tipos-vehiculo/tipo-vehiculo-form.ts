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

import {
  VehicleTypesService,
  CreateVehicleTypeDto,
} from "../vehicle-types.service";
import { VehicleCategoriesService } from "../vehicle-categories.service";
import type { VehicleCategory } from "../models/modelo-global.model";

@Component({
  selector: "app-tipo-vehiculo-form",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: "./tipo-vehiculo-form.html",
})
export class TipoVehiculoForm implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private vehicleTypesService = inject(VehicleTypesService);
  private vehicleCategoriesService = inject(VehicleCategoriesService);
  private toastr = inject(ToastrService);

  form!: FormGroup;
  vehicleCategories = signal<VehicleCategory[]>([]);
  loading = signal(false);
  isEdit = signal(false);
  typeId = signal<string | null>(null);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get("id");
    this.isEdit.set(!!id);
    this.typeId.set(id ?? null);

    this.vehicleCategoriesService.getAll().subscribe({
      next: (cats) => this.vehicleCategories.set(cats),
    });

    this.form = this.fb.group({
      categoryId: ["", Validators.required],
      code: ["", [Validators.required, Validators.maxLength(50)]],
      label: ["", [Validators.required, Validators.maxLength(100)]],
    });

    if (id) {
      this.vehicleTypesService.getById(id).subscribe({
        next: (t) => {
          const vehicleType = t as { categoryId?: string; code: string; label: string };
          this.form.patchValue({
            categoryId: vehicleType.categoryId ?? "",
            code: vehicleType.code,
            label: vehicleType.label,
          });
          this.form.get("code")?.disable();
        },
        error: (err) => {
          this.toastr.error(err?.error?.message || "Error al cargar tipo");
          this.router.navigate(["/catalog/vehicle-types"]);
        },
      });
    }
  }

  submit(): void {
    if (this.form.invalid || this.loading()) return;

    const raw = this.form.getRawValue();
    const dto: CreateVehicleTypeDto = {
      categoryId: raw.categoryId,
      code: (raw.code ?? "").trim().toUpperCase(),
      label: raw.label.trim(),
    };

    this.loading.set(true);
    const id = this.typeId();

    if (id) {
      this.vehicleTypesService.update(id, { label: raw.label.trim() }).subscribe({
        next: () => {
          this.toastr.success("Tipo actualizado");
          this.router.navigate(["/catalog/vehicle-types"]);
        },
        error: (err) => {
          this.loading.set(false);
          this.toastr.error(err?.error?.message || "Error al actualizar");
        },
      });
    } else {
      this.vehicleTypesService.create(dto).subscribe({
        next: () => {
          this.toastr.success("Tipo creado");
          this.router.navigate(["/catalog/vehicle-types"]);
        },
        error: (err) => {
          this.loading.set(false);
          this.toastr.error(err?.error?.message || "Error al crear");
        },
      });
    }
  }
}
