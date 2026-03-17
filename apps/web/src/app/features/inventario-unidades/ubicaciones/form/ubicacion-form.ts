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

import { InventarioUnidadesService } from "../../inventario-unidades.service";
import { BranchesService } from "../../../inventario-refacciones/services/branches.service";
import {
  CreateUnitLocationDto,
  UnitLocationZone,
} from "../../models/unit-location.model";

@Component({
  selector: "app-unidades-ubicacion-form",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: "./ubicacion-form.html",
  styleUrls: ["./ubicacion-form.scss"],
})
export class UbicacionForm implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private inventarioService = inject(InventarioUnidadesService);
  private branchesService = inject(BranchesService);
  private toastr = inject(ToastrService);

  form!: FormGroup;
  loading = signal(false);
  isEdit = signal(false);
  ubicacionId = signal<string | null>(null);
  branches = signal<{ id: string; name: string }[]>([]);

  readonly zoneOptions = [
    { value: UnitLocationZone.LOT, label: "Patio" },
    { value: UnitLocationZone.EXHIBITION, label: "Exhibición" },
    { value: UnitLocationZone.WAREHOUSE, label: "Almacén" },
  ];

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get("id");
    this.isEdit.set(!!id);
    this.ubicacionId.set(id);

    this.branchesService.getAll().subscribe({
      next: (res) => this.branches.set(res.data.map((b) => ({ id: b.id, name: b.name }))),
    });

    this.form = this.fb.group({
      branchId: ["", Validators.required],
      code: ["", [Validators.required, Validators.maxLength(20)]],
      zone: [UnitLocationZone.LOT, Validators.required],
      space: ["", [Validators.required, Validators.maxLength(20)]],
      description: ["", [Validators.maxLength(200)]],
    });

    if (id) {
      this.loadUbicacion(id);
    }
  }

  private loadUbicacion(id: string): void {
    this.loading.set(true);
    this.inventarioService.getLocation(id).subscribe({
      next: (loc) => {
        this.form.patchValue({
          branchId: loc.branchId,
          code: loc.code,
          zone: loc.zone,
          space: loc.space,
          description: loc.description ?? "",
        });
        this.form.get("branchId")?.disable();
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.toastr.error(err?.error?.message || "Error al cargar ubicación");
        this.router.navigate(["/inventario-unidades/ubicaciones"]);
      },
    });
  }

  submit(): void {
    if (this.form.invalid || this.loading()) return;

    const raw = this.form.getRawValue();
    const dto: CreateUnitLocationDto = {
      branchId: raw.branchId,
      code: raw.code,
      zone: raw.zone as UnitLocationZone,
      space: raw.space,
      description: raw.description || undefined,
    };

    this.loading.set(true);
    const id = this.ubicacionId();

    if (id) {
      this.inventarioService.updateLocation(id, dto).subscribe({
        next: () => {
          this.toastr.success("Ubicación actualizada");
          this.router.navigate(["/inventario-unidades/ubicaciones"]);
        },
        error: (err) => {
          this.loading.set(false);
          this.toastr.error(err?.error?.message || "Error al actualizar");
        },
      });
    } else {
      this.inventarioService.createLocation(dto).subscribe({
        next: () => {
          this.toastr.success("Ubicación creada");
          this.router.navigate(["/inventario-unidades/ubicaciones"]);
        },
        error: (err) => {
          this.loading.set(false);
          this.toastr.error(err?.error?.message || "Error al crear");
        },
      });
    }
  }
}
