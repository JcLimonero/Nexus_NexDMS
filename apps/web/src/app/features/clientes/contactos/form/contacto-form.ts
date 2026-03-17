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

import { ContactosService } from "../contactos.service";
import {
  DEFAULT_LADA,
  formatPhoneForApi,
  parsePhone,
  PHONE_LADAS,
} from "../../constants/phone-ladas";
import type { CreateContactDto } from "../contactos.service";

@Component({
  selector: "app-contacto-form",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: "./contacto-form.html",
  styleUrls: ["./contacto-form.scss"],
})
export class ContactoForm implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private contactosService = inject(ContactosService);
  private toastr = inject(ToastrService);

  form!: FormGroup;
  loading = signal(false);
  isEdit = signal(false);
  clientId = signal<string | null>(null);
  contactId = signal<string | null>(null);

  readonly phoneLadas = PHONE_LADAS;

  ngOnInit(): void {
    const clientId = this.route.snapshot.paramMap.get("id");
    const contactId = this.route.snapshot.paramMap.get("contactId");
    if (!clientId) {
      this.router.navigate(["/clientes"]);
      return;
    }

    this.clientId.set(clientId);
    this.isEdit.set(!!contactId);
    this.contactId.set(contactId ?? null);

    this.form = this.fb.group({
      firstName: ["", [Validators.required, Validators.maxLength(200)]],
      lastName: ["", [Validators.maxLength(200)]],
      phoneLada: [DEFAULT_LADA],
      phone: ["", [Validators.required, Validators.maxLength(15)]],
      email: ["", [Validators.email, Validators.maxLength(300)]],
      position: ["", [Validators.maxLength(200)]],
      department: ["", [Validators.maxLength(200)]],
      isAuthorized: [true],
      notes: [""],
    });

    if (contactId) {
      this.contactosService.getById(clientId, contactId).subscribe({
        next: (c) => {
          const { lada, number } = parsePhone(c.phone);
          this.form.patchValue({
            firstName: c.firstName,
            lastName: c.lastName ?? "",
            phoneLada: lada,
            phone: number,
            email: c.email ?? "",
            position: c.position ?? "",
            department: c.department ?? "",
            isAuthorized: c.isAuthorized ?? true,
            notes: c.notes ?? "",
          });
        },
        error: (err) => {
          this.toastr.error(err?.error?.message || "Error al cargar contacto");
          this.router.navigate(["/clientes", clientId, "contactos"]);
        },
      });
    }
  }

  submit(): void {
    if (this.form.invalid || this.loading()) return;

    const clientId = this.clientId();
    const contactId = this.contactId();
    if (!clientId) return;

    const raw = this.form.getRawValue();
    const dto: CreateContactDto = {
      firstName: raw.firstName.trim(),
      lastName: raw.lastName?.trim() || undefined,
      phone: formatPhoneForApi(raw.phoneLada, raw.phone),
      email: raw.email?.trim() || undefined,
      position: raw.position?.trim() || undefined,
      department: raw.department?.trim() || undefined,
      isAuthorized: raw.isAuthorized,
      notes: raw.notes?.trim() || undefined,
    };

    this.loading.set(true);

    if (contactId) {
      this.contactosService.update(clientId, contactId, dto).subscribe({
        next: () => {
          this.toastr.success("Contacto actualizado");
          this.router.navigate(["/clientes", clientId, "contactos"]);
        },
        error: (err) => {
          this.loading.set(false);
          this.toastr.error(err?.error?.message || "Error al actualizar");
        },
      });
    } else {
      this.contactosService.create(clientId, dto).subscribe({
        next: () => {
          this.toastr.success("Contacto creado");
          this.router.navigate(["/clientes", clientId, "contactos"]);
        },
        error: (err) => {
          this.loading.set(false);
          this.toastr.error(err?.error?.message || "Error al crear");
        },
      });
    }
  }
}
