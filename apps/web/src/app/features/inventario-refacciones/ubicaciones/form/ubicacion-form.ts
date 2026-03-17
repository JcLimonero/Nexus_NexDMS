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
import { CreateStockLocationDto } from "../../models/stock-location.model";

@Component({
  selector: "app-ubicacion-form",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: "./ubicacion-form.html",
  styleUrls: ["./ubicacion-form.scss"],
})
export class UbicacionForm implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private inventarioService = inject(InventarioRefaccionesService);
  private branchesService = inject(BranchesService);
  private toastr = inject(ToastrService);

  form!: FormGroup;
  loading = signal(false);
  isEdit = signal(false);
  ubicacionId = signal<string | null>(null);
  branches = signal<{ id: string; name: string }[]>([]);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get("id");
    this.isEdit.set(!!id);
    this.ubicacionId.set(id);

    this.branchesService.getAll().subscribe({
      next: (res) => this.branches.set(res.data.map((b) => ({ id: b.id, name: b.name }))),
    });

    this.form = this.fb.group({
      branchId: ["", Validators.required],
      code: ["", [Validators.maxLength(50)]],
      zone: ["", [Validators.required, Validators.maxLength(50)]],
      aisle: ["", [Validators.maxLength(50)]],
      shelf: ["", [Validators.maxLength(50)]],
      level: ["", [Validators.maxLength(50)]],
      description: ["", [Validators.maxLength(500)]],
      isActive: [true],
    });

    if (id) {
      this.loadUbicacion(id);
    }
  }

  private loadUbicacion(id: string): void {
    this.loading.set(true);
    this.inventarioService.getLocations(undefined).subscribe({
      next: (locations) => {
        const loc = locations.find((l) => l.id === id);
        if (loc) {
          this.form.patchValue({
            branchId: loc.branchId,
            code: loc.code,
            zone: loc.zone,
            aisle: loc.aisle ?? "",
            shelf: loc.shelf ?? "",
            level: loc.level ?? "",
            description: loc.description ?? "",
            isActive: loc.isActive,
          });
          this.form.get("branchId")?.disable();
        } else {
          this.toastr.error("Ubicación no encontrada");
          this.router.navigate(["/inventario-refacciones/ubicaciones"]);
        }
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.toastr.error(err?.error?.message || "Error al cargar ubicación");
        this.router.navigate(["/inventario-refacciones/ubicaciones"]);
      },
    });
  }

  submit(): void {
    if (this.form.invalid || this.loading()) return;

    const raw = this.form.getRawValue();
    const dto: CreateStockLocationDto = {
      branchId: raw.branchId,
      code: raw.code || undefined,
      zone: raw.zone,
      aisle: raw.aisle || undefined,
      shelf: raw.shelf || undefined,
      level: raw.level || undefined,
      description: raw.description || undefined,
      isActive: raw.isActive,
    };

    this.loading.set(true);
    const id = this.ubicacionId();

    if (id) {
      this.inventarioService.updateLocation(id, dto).subscribe({
        next: () => {
          this.toastr.success("Ubicación actualizada");
          this.router.navigate(["/inventario-refacciones/ubicaciones"]);
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
          this.router.navigate(["/inventario-refacciones/ubicaciones"]);
        },
        error: (err) => {
          this.loading.set(false);
          this.toastr.error(err?.error?.message || "Error al crear");
        },
      });
    }
  }
}
