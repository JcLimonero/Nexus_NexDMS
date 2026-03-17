import { Component, inject, Input } from "@angular/core";
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";
import { CommonModule } from "@angular/common";
import { NgbActiveModal } from "@ng-bootstrap/ng-bootstrap";

import { VehicleColorsService } from "../../../../catalogo/vehicle-colors.service";

@Component({
  selector: "app-color-quick-dialog",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="modal-header">
      <h5 class="modal-title">Nuevo color {{ colorType === 'EXTERIOR' ? 'exterior' : 'interior' }}</h5>
      <button type="button" class="btn-close" (click)="dismiss()"></button>
    </div>
    <form [formGroup]="form" (ngSubmit)="submit()">
      <div class="modal-body">
        <div class="mb-3">
          <label class="form-label">Nombre <span class="text-danger">*</span></label>
          <input type="text" class="form-control" formControlName="name" placeholder="Ej: Negro, Blanco" />
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
export class ColorQuickDialog {
  private fb = inject(FormBuilder);
  private activeModal = inject(NgbActiveModal);
  private vehicleColorsService = inject(VehicleColorsService);

  @Input() brandId!: string;
  @Input() modelId!: string;
  @Input() versionId!: string;
  @Input() colorType!: "INTERIOR" | "EXTERIOR";

  form!: FormGroup;
  saving = false;
  error: string | null = null;

  constructor() {
    this.form = this.fb.group({
      name: ["", [Validators.required, Validators.maxLength(100)]],
    });
  }

  dismiss(): void {
    this.activeModal.dismiss();
  }

  submit(): void {
    if (this.form.invalid || this.saving || !this.versionId) return;

    this.saving = true;
    this.error = null;

    this.vehicleColorsService
      .create({
        brandId: this.brandId,
        modelId: this.modelId,
        versionId: this.versionId,
        name: this.form.get("name")?.value?.trim() ?? "",
        colorType: this.colorType,
      })
      .subscribe({
        next: (c) => this.activeModal.close(c),
        error: (err) => {
          this.saving = false;
          this.error = err?.error?.message || "Error al crear color";
        },
      });
  }
}
