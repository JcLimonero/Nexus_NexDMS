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

import { GlobalBrandsService } from "../../global-brands.service";
import { CreateGlobalBrandDto } from "../../models/global-brand.model";

@Component({
  selector: "app-marca-global-form",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: "./marca-global-form.html",
  styleUrls: ["./marca-global-form.scss"],
})
export class MarcaGlobalForm implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private globalBrandsService = inject(GlobalBrandsService);
  private toastr = inject(ToastrService);

  form!: FormGroup;
  loading = signal(false);
  isEdit = signal(false);
  brandId = signal<string | null>(null);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get("id");
    this.isEdit.set(!!id);
    this.brandId.set(id ?? null);

    this.form = this.fb.group({
      name: ["", [Validators.required, Validators.maxLength(100)]],
      isActive: [true],
    });

    if (id) {
      this.globalBrandsService.getById(id).subscribe({
        next: (b) => {
          this.form.patchValue({
            name: b.name,
            isActive: b.isActive,
          });
        },
        error: (err) => {
          this.toastr.error(err?.error?.message || "Error al cargar marca");
          this.router.navigate(["/catalog/marcas"]);
        },
      });
    }
  }

  submit(): void {
    if (this.form.invalid || this.loading()) return;

    const raw = this.form.getRawValue();
    const dto: CreateGlobalBrandDto = {
      name: raw.name.trim(),
      isActive: raw.isActive,
    };

    this.loading.set(true);
    const id = this.brandId();

    if (id) {
      this.globalBrandsService.update(id, dto).subscribe({
        next: () => {
          this.toastr.success("Marca actualizada");
          this.router.navigate(["/catalog/marcas"]);
        },
        error: (err) => {
          this.loading.set(false);
          this.toastr.error(err?.error?.message || "Error al actualizar");
        },
      });
    } else {
      this.globalBrandsService.create(dto).subscribe({
        next: () => {
          this.toastr.success("Marca creada");
          this.router.navigate(["/catalog/marcas"]);
        },
        error: (err) => {
          this.loading.set(false);
          this.toastr.error(err?.error?.message || "Error al crear");
        },
      });
    }
  }
}
