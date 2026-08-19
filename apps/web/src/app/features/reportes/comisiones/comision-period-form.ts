import { Component, OnInit, inject, signal } from "@angular/core";
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from "@angular/forms";
import { CommonModule } from "@angular/common";
import { Router, RouterModule } from "@angular/router";
import { ToastrService } from "ngx-toastr";

import { ReportesService } from "../reportes.service";
import { BranchesService } from "../../inventario-refacciones/services/branches.service";
import {
  CreateCommissionPeriodDto,
  CommissionPeriodType,
} from "../models/commission.model";

@Component({
  selector: "app-comision-period-form",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: "./comision-period-form.html",
  styleUrls: ["./comision-period-form.scss"],
})
export class ComisionPeriodForm implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private reportesService = inject(ReportesService);
  private branchesService = inject(BranchesService);
  private toastr = inject(ToastrService);

  form!: FormGroup;
  loading = signal(false);
  branches = signal<{ id: string; name: string }[]>([]);

  readonly typeOptions = [
    { value: CommissionPeriodType.BIWEEKLY, label: "Quincenal" },
    { value: CommissionPeriodType.MONTHLY, label: "Mensual" },
  ];

  ngOnInit(): void {
    this.form = this.fb.group({
      branchId: ["", Validators.required],
      periodDate: ["", Validators.required],
      type: [CommissionPeriodType.MONTHLY, Validators.required],
    });

    this.branchesService.getAll().subscribe({
      next: (res) =>
        this.branches.set(res.data.map((b) => ({ id: b.id, name: b.name }))),
    });
  }

  submit(): void {
    if (this.form.invalid || this.loading()) return;

    const raw = this.form.getRawValue();
    const dto: CreateCommissionPeriodDto = {
      branchId: raw.branchId,
      periodDate: raw.periodDate,
      type: raw.type as CommissionPeriodType,
    };

    this.loading.set(true);
    this.reportesService.createCommissionPeriod(dto).subscribe({
      next: (period) => {
        this.toastr.success("Período creado");
        this.router.navigate(["/reports/comisiones", period.id]);
      },
      error: (err) => {
        this.loading.set(false);
        this.toastr.error(err?.error?.message || "Error al crear período");
      },
    });
  }
}
