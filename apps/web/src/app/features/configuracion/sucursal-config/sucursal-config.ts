import { Component, OnInit, inject, signal } from "@angular/core";
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from "@angular/forms";
import { CommonModule } from "@angular/common";
import { Router, ActivatedRoute, RouterModule } from "@angular/router";
import { ToastrService } from "ngx-toastr";

import { ConfiguracionService } from "../configuracion.service";
import {
  UpdateBranchConfigDto,
  SENSITIVE_PLACEHOLDER,
} from "../configuracion.service";
import { BranchesService } from "../../inventario-refacciones/services/branches.service";

@Component({
  selector: "app-sucursal-config",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: "./sucursal-config.html",
  styleUrls: ["./sucursal-config.scss"],
})
export class SucursalConfig implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private configuracionService = inject(ConfiguracionService);
  private branchesService = inject(BranchesService);
  private toastr = inject(ToastrService);

  form!: FormGroup;
  branchId = signal<string | null>(null);
  branchName = signal<string>("");
  loading = signal(true);
  saving = signal(false);
  error = signal<string | null>(null);
  branches = signal<{ id: string; name: string }[]>([]);

  readonly SENSITIVE_PLACEHOLDER = SENSITIVE_PLACEHOLDER;

  ngOnInit(): void {
    this.form = this.fb.group({
      facturaapiApiKey: [""],
      whatsappPhoneId: [""],
      whatsappToken: [""],
      bankName: ["", [Validators.maxLength(100)]],
      bankClabe: ["", [Validators.maxLength(18)]],
      bankAccount: ["", [Validators.maxLength(20)]],
      bankHolder: ["", [Validators.maxLength(300)]],
      cfdiLastFolio: [0, [Validators.min(0)]],
    });

    const id = this.route.snapshot.paramMap.get("id");
    if (!id) {
      this.router.navigate(["/settings/sucursales"]);
      return;
    }
    this.branchId.set(id);

    this.branchesService.getAll().subscribe({
      next: (res) => {
        const list = res.data.map((b) => ({ id: b.id, name: b.name }));
        this.branches.set(list);
        const branch = list.find((b) => b.id === id);
        if (branch) this.branchName.set(branch.name);
      },
    });

    this.configuracionService.getBranchConfig(id).subscribe({
      next: (config) => {
        this.form.patchValue({
          facturaapiApiKey: config.facturaapiApiKey ?? "",
          whatsappPhoneId: config.whatsappPhoneId ?? "",
          whatsappToken: config.whatsappToken ?? "",
          bankName: config.bankName ?? "",
          bankClabe: config.bankClabe ?? "",
          bankAccount: config.bankAccount ?? "",
          bankHolder: config.bankHolder ?? "",
          cfdiLastFolio: config.cfdiLastFolio ?? 0,
        });
        this.loading.set(false);
        this.error.set(null);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.message || "Error al cargar configuración");
      },
    });
  }

  submit(): void {
    if (this.form.invalid || this.saving()) return;

    const id = this.branchId();
    if (!id) return;

    const raw = this.form.getRawValue();
    const dto: UpdateBranchConfigDto = {};

    if (raw.facturaapiApiKey !== undefined && raw.facturaapiApiKey !== "")
      dto.facturaapiApiKey = raw.facturaapiApiKey;
    if (raw.whatsappPhoneId !== undefined && raw.whatsappPhoneId !== "")
      dto.whatsappPhoneId = raw.whatsappPhoneId;
    if (raw.whatsappToken !== undefined && raw.whatsappToken !== "")
      dto.whatsappToken = raw.whatsappToken;
    if (raw.bankName !== undefined) dto.bankName = raw.bankName;
    if (raw.bankClabe !== undefined) dto.bankClabe = raw.bankClabe;
    if (raw.bankAccount !== undefined) dto.bankAccount = raw.bankAccount;
    if (raw.bankHolder !== undefined) dto.bankHolder = raw.bankHolder;
    if (raw.cfdiLastFolio !== undefined)
      dto.cfdiLastFolio = Number(raw.cfdiLastFolio) || 0;

    this.saving.set(true);
    this.configuracionService.updateBranchConfig(id, dto).subscribe({
      next: (config) => {
        this.form.patchValue({
          facturaapiApiKey: config.facturaapiApiKey ?? "",
          whatsappPhoneId: config.whatsappPhoneId ?? "",
          whatsappToken: config.whatsappToken ?? "",
        });
        this.toastr.success("Configuración guardada");
        this.saving.set(false);
      },
      error: (err) => {
        this.toastr.error(err?.error?.message || "Error al guardar");
        this.saving.set(false);
      },
    });
  }
}
