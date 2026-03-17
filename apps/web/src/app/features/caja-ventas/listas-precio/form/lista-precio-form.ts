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

import { CajaVentasService } from "../../caja-ventas.service";
import { BranchesService } from "../../../inventario-refacciones/services/branches.service";
import {
  CreatePriceListDto,
  PriceListType,
} from "../../models/price-list.model";

@Component({
  selector: "app-lista-precio-form",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: "./lista-precio-form.html",
  styleUrls: ["./lista-precio-form.scss"],
})
export class ListaPrecioForm implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private cajaService = inject(CajaVentasService);
  private branchesService = inject(BranchesService);
  private toastr = inject(ToastrService);

  form!: FormGroup;
  loading = signal(false);
  branches = signal<{ id: string; name: string }[]>([]);
  isEdit = signal(false);
  id = signal<string | null>(null);

  readonly typeOptions = [
    { value: PriceListType.PUBLIC, label: "Público" },
    { value: PriceListType.WHOLESALE, label: "Mayoreo" },
    { value: PriceListType.BUSINESS, label: "Empresa" },
  ];

  ngOnInit(): void {
    this.form = this.fb.group({
      branchId: ["", Validators.required],
      name: ["", [Validators.required, Validators.maxLength(200)]],
      type: [PriceListType.PUBLIC, Validators.required],
      discountPct: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
      isActive: [true],
    });

    this.branchesService.getAll().subscribe({
      next: (res) =>
        this.branches.set(res.data.map((b) => ({ id: b.id, name: b.name }))),
    });

    const id = this.route.snapshot.paramMap.get("id");
    if (id) {
      this.isEdit.set(true);
      this.id.set(id);
      this.cajaService.getPriceList(id).subscribe({
        next: (list) => {
          this.form.patchValue({
            branchId: list.branchId,
            name: list.name,
            type: list.type,
            discountPct: list.discountPct,
            isActive: list.isActive,
          });
        },
        error: () => this.router.navigate(["/cash-register/listas-precio"]),
      });
    }
  }

  submit(): void {
    if (this.form.invalid || this.loading()) return;

    const raw = this.form.getRawValue();
    const dto: CreatePriceListDto = {
      branchId: raw.branchId,
      name: raw.name,
      type: raw.type as PriceListType,
      discountPct: Number(raw.discountPct) || 0,
      isActive: raw.isActive ?? true,
    };

    const editId = this.id();
    this.loading.set(true);

    if (editId) {
      this.cajaService.updatePriceList(editId, dto).subscribe({
        next: () => {
          this.toastr.success("Lista actualizada");
          this.router.navigate(["/cash-register/listas-precio"]);
        },
        error: (err) => {
          this.loading.set(false);
          this.toastr.error(err?.error?.message || "Error al actualizar");
        },
      });
    } else {
      this.cajaService.createPriceList(dto).subscribe({
        next: () => {
          this.toastr.success("Lista creada");
          this.router.navigate(["/cash-register/listas-precio"]);
        },
        error: (err) => {
          this.loading.set(false);
          this.toastr.error(err?.error?.message || "Error al crear");
        },
      });
    }
  }
}
