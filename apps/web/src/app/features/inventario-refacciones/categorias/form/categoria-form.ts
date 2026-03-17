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
import { CreatePartCategoryDto } from "../../models/part-category.model";

@Component({
  selector: "app-categoria-form",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: "./categoria-form.html",
  styleUrls: ["./categoria-form.scss"],
})
export class CategoriaForm implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private inventarioService = inject(InventarioRefaccionesService);
  private toastr = inject(ToastrService);

  form!: FormGroup;
  loading = signal(false);
  isEdit = signal(false);
  categoriaId = signal<string | null>(null);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get("id");
    this.isEdit.set(!!id);
    this.categoriaId.set(id);

    this.form = this.fb.group({
      name: ["", [Validators.required, Validators.maxLength(100)]],
      description: ["", [Validators.maxLength(500)]],
      isActive: [true],
    });

    if (id) {
      this.loadCategoria(id);
    }
  }

  private loadCategoria(id: string): void {
    this.loading.set(true);
    this.inventarioService.getCategory(id).subscribe({
      next: (cat) => {
        this.form.patchValue({
          name: cat.name,
          description: cat.description ?? "",
          isActive: cat.isActive,
        });
        this.loading.set(false);
      },
      error: (err) => {
        this.toastr.error(err?.error?.message || "Error al cargar categoría");
        this.router.navigate(["/parts-inventory/categories"]);
      },
    });
  }

  submit(): void {
    if (this.form.invalid || this.loading()) return;

    const raw = this.form.getRawValue();
    const dto: CreatePartCategoryDto = {
      name: raw.name,
      description: raw.description || undefined,
      isActive: raw.isActive,
    };

    this.loading.set(true);
    const id = this.categoriaId();

    if (id) {
      this.inventarioService.updateCategory(id, dto).subscribe({
        next: () => {
          this.toastr.success("Categoría actualizada");
          this.router.navigate(["/parts-inventory/categories"]);
        },
        error: (err) => {
          this.loading.set(false);
          this.toastr.error(err?.error?.message || "Error al actualizar");
        },
      });
    } else {
      this.inventarioService.createCategory(dto).subscribe({
        next: () => {
          this.toastr.success("Categoría creada");
          this.router.navigate(["/parts-inventory/categories"]);
        },
        error: (err) => {
          this.loading.set(false);
          this.toastr.error(err?.error?.message || "Error al crear");
        },
      });
    }
  }
}
