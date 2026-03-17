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

import { CatalogoService } from "../../catalogo.service";
import { GlobalBrandsService } from "../../global-brands.service";
import { VehicleTypesService } from "../../vehicle-types.service";
import { CombustionTypesService } from "../../combustion-types.service";
import {
  VehicleType,
  CombustionType,
  CreateGlobalModelDto,
} from "../../models/modelo-global.model";

@Component({
  selector: "app-modelo-global-form",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: "./modelo-global-form.html",
  styleUrls: ["./modelo-global-form.scss"],
})
export class ModeloGlobalForm implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private catalogoService = inject(CatalogoService);
  private globalBrandsService = inject(GlobalBrandsService);
  private vehicleTypesService = inject(VehicleTypesService);
  private combustionTypesService = inject(CombustionTypesService);
  private toastr = inject(ToastrService);

  form!: FormGroup;
  loading = signal(false);
  isEdit = signal(false);
  modelId = signal<string | null>(null);
  brands = signal<{ id: string; name: string }[]>([]);
  vehicleTypes = signal<VehicleType[]>([]);
  combustionTypes = signal<CombustionType[]>([]);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get("id");
    this.isEdit.set(!!id);
    this.modelId.set(id ?? null);

    this.vehicleTypesService.getAll().subscribe({
      next: (types) => {
        this.vehicleTypes.set(types);
        if (!id && types.length && !this.form?.get("vehicleTypeId")?.value) {
          this.form?.patchValue({ vehicleTypeId: types[0].id });
        }
      },
    });
    this.combustionTypesService.getAll().subscribe({
      next: (types) => this.combustionTypes.set(types),
    });
    this.globalBrandsService.getAll().subscribe({
      next: (brands) =>
        this.brands.set(
          brands
            .filter((b) => b.isActive)
            .map((b) => ({ id: b.id, name: b.name })),
        ),
    });

    this.form = this.fb.group({
      brandId: ["", Validators.required],
      vehicleTypeId: ["", Validators.required],
      model: ["", [Validators.required, Validators.maxLength(200)]],
      version: ["", [Validators.maxLength(100)]],
      year: [new Date().getFullYear(), [Validators.required, Validators.min(1900)]],
      combustionTypeId: [null as string | null],
      displacement: [null as number | null, [Validators.min(1)]],
      doorCount: [null as number | null, [Validators.min(1)]],
      isActive: [true],
    });

    if (id) {
      this.catalogoService.getById(id).subscribe({
        next: (m) => {
          this.form.patchValue({
            brandId: m.brandId,
            vehicleTypeId: m.vehicleTypeId,
            model: m.model,
            version: m.version ?? "",
            year: m.year,
            combustionTypeId: m.combustionTypeId,
            displacement: m.displacement,
            doorCount: m.doorCount,
            isActive: m.isActive,
          });
        },
        error: (err) => {
          this.toastr.error(err?.error?.message || "Error al cargar modelo");
          this.router.navigate(["/catalog"]);
        },
      });
    }
  }

  submit(): void {
    if (this.form.invalid || this.loading()) return;

    const raw = this.form.getRawValue();
    const dto: CreateGlobalModelDto = {
      brandId: raw.brandId,
      vehicleTypeId: raw.vehicleTypeId,
      model: raw.model.trim(),
      version: raw.version?.trim() || undefined,
      year: Number(raw.year),
      combustionTypeId: raw.combustionTypeId || undefined,
      displacement: raw.displacement ? Number(raw.displacement) : undefined,
      doorCount: raw.doorCount ? Number(raw.doorCount) : undefined,
      isActive: raw.isActive,
    };

    this.loading.set(true);
    const id = this.modelId();

    if (id) {
      this.catalogoService.update(id, dto).subscribe({
        next: () => {
          this.toastr.success("Modelo actualizado");
          this.router.navigate(["/catalog"]);
        },
        error: (err) => {
          this.loading.set(false);
          this.toastr.error(err?.error?.message || "Error al actualizar");
        },
      });
    } else {
      this.catalogoService.create(dto).subscribe({
        next: () => {
          this.toastr.success("Modelo creado");
          this.router.navigate(["/catalog"]);
        },
        error: (err) => {
          this.loading.set(false);
          this.toastr.error(err?.error?.message || "Error al crear");
        },
      });
    }
  }
}
