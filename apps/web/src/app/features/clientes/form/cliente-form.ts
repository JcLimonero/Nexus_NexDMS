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

import { ClientesService } from "../clientes.service";
import { ClientTypesService } from "../client-types.service";
import { CajaVentasService } from "../../caja-ventas/caja-ventas.service";
import {
  DEFAULT_LADA,
  formatPhoneForApi,
  parsePhone,
  PHONE_LADAS,
} from "../constants/phone-ladas";
import { ClientTypeOption } from "../models/client-type.model";
import { ClientType, CreateClientDto } from "../models/client.model";

@Component({
  selector: "app-cliente-form",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: "./cliente-form.html",
  styleUrls: ["./cliente-form.scss"],
})
export class ClienteForm implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private clientesService = inject(ClientesService);
  private clientTypesService = inject(ClientTypesService);
  private cajaService = inject(CajaVentasService);
  private toastr = inject(ToastrService);

  form!: FormGroup;
  loading = signal(false);
  isEdit = signal(false);
  clientId = signal<string | null>(null);
  clientTypes = signal<ClientTypeOption[]>([]);
  priceLists = signal<{ id: string; name: string }[]>([]);

  readonly phoneLadas = PHONE_LADAS;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get("id");
    this.isEdit.set(!!id);
    this.clientId.set(id);

    this.clientTypesService.getAll().subscribe({
      next: (types) => this.clientTypes.set(types),
    });

    this.cajaService.getPriceLists({ isActive: true }).subscribe({
      next: (lists) =>
        this.priceLists.set(lists.map((l) => ({ id: l.id, name: l.name }))),
    });

    this.form = this.fb.group({
      clientType: [ClientType.INDIVIDUAL, Validators.required],
      isCompany: [false],
      firstName: ["", [Validators.maxLength(200)]],
      lastName: ["", [Validators.maxLength(200)]],
      companyName: ["", [Validators.maxLength(300)]],
      phoneLada: [DEFAULT_LADA],
      phone: ["", [Validators.required, Validators.maxLength(15)]],
      phoneAltLada: [DEFAULT_LADA],
      phoneAlt: ["", [Validators.maxLength(15)]],
      email: ["", [Validators.email, Validators.maxLength(300)]],
      rfc: ["", [Validators.maxLength(13)]],
      curp: ["", [Validators.maxLength(18)]],
      taxRegime: ["", [Validators.maxLength(10)]],
      taxPostalCode: ["", [Validators.maxLength(10)]],
      address: ["", [Validators.maxLength(500)]],
      city: ["", [Validators.maxLength(100)]],
      state: ["", [Validators.maxLength(100)]],
      fixedDiscount: [0, [Validators.min(0)]],
      creditLimit: [null as number | null, [Validators.min(0)]],
      priceListId: [null as string | null],
      notes: [""],
    });

    this.form.get("clientType")?.valueChanges.subscribe((t) => {
      this.form.patchValue({ isCompany: t === ClientType.BUSINESS });
      this.updateValidators();
    });
    this.updateValidators();

    if (id) {
      this.loadClient(id);
    }
  }

  private updateValidators(): void {
    const isBusiness = this.form.get("clientType")?.value === ClientType.BUSINESS;
    const companyName = this.form.get("companyName");
    const firstName = this.form.get("firstName");
    const lastName = this.form.get("lastName");

    if (isBusiness) {
      companyName?.setValidators([Validators.required, Validators.maxLength(300)]);
      firstName?.clearValidators();
      lastName?.clearValidators();
    } else {
      companyName?.clearValidators();
      companyName?.setValidators([Validators.maxLength(300)]);
      firstName?.setValidators([Validators.required, Validators.maxLength(200)]);
      lastName?.setValidators([Validators.maxLength(200)]);
    }
    companyName?.updateValueAndValidity();
    firstName?.updateValueAndValidity();
    lastName?.updateValueAndValidity();
  }

  private loadClient(id: string): void {
    this.loading.set(true);
    this.clientesService.getById(id).subscribe({
      next: (client) => {
        const phoneParsed = parsePhone(client.phone);
        const phoneAltParsed = parsePhone(client.phoneAlt ?? "");
        this.form.patchValue({
          clientType: client.clientType,
          isCompany: client.isCompany,
          firstName: client.firstName ?? "",
          lastName: client.lastName ?? "",
          companyName: client.companyName ?? "",
          phoneLada: phoneParsed.lada,
          phone: phoneParsed.number,
          phoneAltLada: phoneAltParsed.lada,
          phoneAlt: phoneAltParsed.number,
          email: client.email ?? "",
          rfc: client.rfc ?? "",
          curp: client.curp ?? "",
          taxRegime: client.taxRegime ?? "",
          taxPostalCode: client.taxPostalCode ?? "",
          address: client.address ?? "",
          city: client.city ?? "",
          state: client.state ?? "",
          fixedDiscount: client.fixedDiscount ?? 0,
          creditLimit: client.creditLimit ?? null,
          priceListId: client.priceListId ?? null,
          notes: client.notes ?? "",
        });
        this.loading.set(false);
      },
      error: (err) => {
        this.toastr.error(err?.error?.message || "Error al cargar cliente");
        this.router.navigate(["/clientes"]);
      },
    });
  }

  submit(): void {
    if (this.form.invalid || this.loading()) return;

    const raw = this.form.getRawValue();
    const fullPhone = formatPhoneForApi(raw.phoneLada, raw.phone);
    const fullPhoneAlt = formatPhoneForApi(raw.phoneAltLada, raw.phoneAlt);
    const dto: CreateClientDto = {
      clientType: raw.clientType,
      isCompany: raw.isCompany,
      phone: fullPhone,
      firstName: raw.firstName || undefined,
      lastName: raw.lastName || undefined,
      companyName: raw.companyName || undefined,
      phoneAlt: fullPhoneAlt || undefined,
      email: raw.email || undefined,
      rfc: raw.rfc || undefined,
      curp: raw.curp || undefined,
      taxRegime: raw.taxRegime || undefined,
      taxPostalCode: raw.taxPostalCode || undefined,
      address: raw.address || undefined,
      city: raw.city || undefined,
      state: raw.state || undefined,
      fixedDiscount: raw.fixedDiscount,
      creditLimit:
        raw.creditLimit === null || raw.creditLimit === ""
          ? null
          : Number(raw.creditLimit),
      priceListId: raw.priceListId || null,
      notes: raw.notes || undefined,
    };

    this.loading.set(true);
    const id = this.clientId();

    if (id) {
      this.clientesService.update(id, dto).subscribe({
        next: () => {
          this.toastr.success("Cliente actualizado");
          this.router.navigate(["/clientes", id]);
        },
        error: (err) => {
          this.loading.set(false);
          this.toastr.error(err?.error?.message || "Error al actualizar");
        },
      });
    } else {
      this.clientesService.create(dto).subscribe({
        next: (client) => {
          this.toastr.success("Cliente creado");
          this.router.navigate(["/clientes", client.id]);
        },
        error: (err) => {
          this.loading.set(false);
          this.toastr.error(err?.error?.message || "Error al crear");
        },
      });
    }
  }
}
