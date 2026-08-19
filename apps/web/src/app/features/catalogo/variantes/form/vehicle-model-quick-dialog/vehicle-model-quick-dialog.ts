import { Component, inject, Input } from "@angular/core";
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from "@angular/forms";
import { CommonModule } from "@angular/common";
import { NgbActiveModal } from "@ng-bootstrap/ng-bootstrap";

import { VehicleModelsService } from "../../../vehicle-models.service";

@Component({
  selector: "app-vehicle-model-quick-dialog",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="modal-header">
      <h5 class="modal-title">Nuevo modelo de vehículo</h5>
      <button type="button" class="btn-close" (click)="dismiss()"></button>
    </div>
    <form [formGroup]="form" (ngSubmit)="submit()">
      <div class="modal-body">
        <div class="mb-3">
          <label class="form-label">Nombre <span class="text-danger">*</span></label>
          <input type="text" class="form-control" formControlName="name" placeholder="Ej: Civic, Corolla" />
          @if (form.get('name')?.invalid && form.get('name')?.touched) {
            <div class="text-danger small mt-1">El nombre es obligatorio</div>
          }
        </div>
        @if (error) {
          <div class="alert alert-danger py-2">{{ error }}</div>
        }
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-outline-secondary" (click)="dismiss()">Cancelar</button>
        <button type="submit" class="btn btn-primary" [disabled]="form.invalid || saving">
          @if (saving) {
            <span class="spinner-border spinner-border-sm me-1"></span>
          }
          Crear
        </button>
      </div>
    </form>
  `,
})
export class VehicleModelQuickDialog {
  private fb = inject(FormBuilder);
  private activeModal = inject(NgbActiveModal);
  private vehicleModelsService = inject(VehicleModelsService);

  @Input() brandId!: string;

  form!: FormGroup;
  saving = false;
  error: string | null = null;

  constructor() {
    this.form = this.fb.group({
      name: ["", [Validators.required, Validators.maxLength(200)]],
    });
  }

  dismiss(): void {
    this.activeModal.dismiss();
  }

  submit(): void {
    if (this.form.invalid || this.saving || !this.brandId) return;

    this.saving = true;
    this.error = null;

    this.vehicleModelsService
      .create({
        brandId: this.brandId,
        name: this.form.get("name")?.value?.trim() ?? "",
      })
      .subscribe({
        next: (v) => this.activeModal.close(v),
        error: (err) => {
          this.saving = false;
          this.error = err?.error?.message || "Error al crear modelo";
        },
      });
  }
}
