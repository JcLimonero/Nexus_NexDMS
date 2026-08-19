import { Component, inject, OnInit } from "@angular/core";
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from "@angular/forms";
import { CommonModule } from "@angular/common";
import { NgbActiveModal } from "@ng-bootstrap/ng-bootstrap";

import { ClientesService } from "../../../../clientes/clientes.service";
import { ClientTypesService } from "../../../../clientes/client-types.service";
import {
  DEFAULT_LADA,
  formatPhoneForApi,
  PHONE_LADAS,
} from "../../../../clientes/constants/phone-ladas";
import { ClientType, CreateClientDto } from "../../../../clientes/models/client.model";

@Component({
  selector: "app-cliente-quick-dialog",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: "./cliente-quick-dialog.html",
  styleUrls: ["./cliente-quick-dialog.scss"],
})
export class ClienteQuickDialog implements OnInit {
  private fb = inject(FormBuilder);
  private activeModal = inject(NgbActiveModal);
  private clientesService = inject(ClientesService);
  private clientTypesService = inject(ClientTypesService);

  form!: FormGroup;
  saving = false;
  error: string | null = null;

  readonly phoneLadas = PHONE_LADAS;

  clientTypes = this.clientTypesService.getAll();

  constructor() {
    this.form = this.fb.group({
      clientType: [ClientType.INDIVIDUAL, Validators.required],
      firstName: ["", [Validators.required, Validators.maxLength(200)]],
      lastName: ["", [Validators.maxLength(200)]],
      companyName: ["", [Validators.maxLength(300)]],
      phoneLada: [DEFAULT_LADA],
      phone: ["", [Validators.required, Validators.maxLength(15)]],
      email: ["", [Validators.email, Validators.maxLength(300)]],
    });
  }

  ngOnInit(): void {
    const updateValidators = () => {
      const t = this.form.get("clientType")?.value;
      const isBusiness = t === ClientType.BUSINESS;
      this.form.get("firstName")?.setValidators(isBusiness ? [] : [Validators.required, Validators.maxLength(200)]);
      this.form.get("companyName")?.setValidators(isBusiness ? [Validators.required, Validators.maxLength(300)] : [Validators.maxLength(300)]);
      this.form.get("firstName")?.updateValueAndValidity();
      this.form.get("companyName")?.updateValueAndValidity();
    };
    this.form.get("clientType")?.valueChanges.subscribe(updateValidators);
    updateValidators();
  }

  dismiss(): void {
    this.activeModal.dismiss();
  }

  submit(): void {
    if (this.form.invalid || this.saving) return;

    const raw = this.form.getRawValue();
    const isBusiness = raw.clientType === ClientType.BUSINESS;

    const dto: CreateClientDto = {
      clientType: raw.clientType,
      isCompany: isBusiness,
      phone: formatPhoneForApi(raw.phoneLada, raw.phone),
    };
    if (isBusiness) {
      dto.companyName = raw.companyName?.trim() || undefined;
    } else {
      dto.firstName = raw.firstName?.trim() || undefined;
      dto.lastName = raw.lastName?.trim() || undefined;
    }
    if (raw.email?.trim()) dto.email = raw.email.trim();

    this.saving = true;
    this.error = null;

    this.clientesService.create(dto).subscribe({
      next: (client) => {
        this.activeModal.close(client);
      },
      error: (err) => {
        this.saving = false;
        this.error = err?.error?.message || "Error al crear cliente";
      },
    });
  }
}
