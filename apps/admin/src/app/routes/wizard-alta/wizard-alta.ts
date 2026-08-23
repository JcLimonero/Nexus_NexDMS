import { Component, OnInit, computed, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";
import {
  ModuloCatalogo,
  PALETAS,
  ProvisionTenantDto,
  ResultadoProvisioning,
  WizardAltaService,
} from "./wizard-alta.service";

/**
 * Wizard de alta de una empresa nueva (Fase 2). Recorre empresa, plan y módulos,
 * fiscal + sucursal, y primer usuario admin; al confirmar llama al provisioning
 * transaccional y muestra la liga de invitación.
 */
@Component({
  selector: "app-wizard-alta",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./wizard-alta.html",
  styleUrls: ["./wizard-alta.scss"],
})
export class WizardAlta implements OnInit {
  private srv = inject(WizardAltaService);
  private router = inject(Router);

  readonly paletas = PALETAS;
  readonly pasos = ["Empresa", "Plan y módulos", "Fiscal y sucursal", "Usuario admin", "Resumen"];
  paso = signal(0);
  guardando = signal(false);
  error = signal<string | null>(null);
  resultado = signal<ResultadoProvisioning | null>(null);

  modulos = signal<ModuloCatalogo[]>([]);
  modulosSel = signal<Set<string>>(new Set());
  private prefijoTocado = false;

  form = signal<ProvisionTenantDto>({
    name: "",
    slug: "",
    codePrefix: "",
    plan: "BASIC",
    enabledModules: null,
    palette: "nexus",
    razonSocial: "",
    giro: "AUTO",
    rfc: "",
    taxRegime: "",
    taxPostalCode: "",
    branchName: "Matriz",
    branchSlug: "",
    branchAddress: "",
    branchCity: "",
    branchState: "",
    branchPhone: "",
    branchEmail: "",
    adminFirstName: "",
    adminLastName: "",
    adminEmail: "",
  });

  esUltimo = computed(() => this.paso() === this.pasos.length - 1);

  ngOnInit(): void {
    this.srv.modulos().subscribe({
      next: (r) => this.modulos.set(r.modules ?? []),
      error: () => undefined,
    });
  }

  set<K extends keyof ProvisionTenantDto>(
    campo: K,
    valor: ProvisionTenantDto[K],
  ): void {
    this.form.set({ ...this.form(), [campo]: valor });
  }

  alEscribirNombre(v: string): void {
    const slug = v
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    const f = { ...this.form(), name: v, slug };
    if (!this.prefijoTocado) f.codePrefix = this.sugerirPrefijo(v);
    if (!f.razonSocial) f.razonSocial = v;
    this.form.set(f);
  }

  alEscribirPrefijo(v: string): void {
    this.prefijoTocado = true;
    this.set(
      "codePrefix",
      v
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toUpperCase()
        .replace(/[^A-Z]/g, "")
        .slice(0, 3),
    );
  }

  private sugerirPrefijo(nombre: string): string {
    const limpio = (s: string) =>
      s
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toUpperCase()
        .replace(/[^A-Z]/g, "");
    const conectores = new Set([
      "DE", "DEL", "LA", "LAS", "EL", "LOS", "Y", "SA", "CV", "SAPI", "SC", "SRL",
    ]);
    const palabras = (nombre ?? "").split(/\s+/).map(limpio).filter((p) => p.length > 0);
    const sig = palabras.filter((p) => !conectores.has(p));
    const ini = sig.map((p) => p[0]).join("");
    const base = ini.length >= 3 ? ini : palabras.join("");
    const pref = base.slice(0, 3);
    return pref.length ? pref.padEnd(3, "X") : "";
  }

  toggleModulo(key: string): void {
    const s = new Set(this.modulosSel());
    if (s.has(key)) s.delete(key);
    else s.add(key);
    this.modulosSel.set(s);
  }

  siguiente(): void {
    this.error.set(null);
    const err = this.validarPaso();
    if (err) {
      this.error.set(err);
      return;
    }
    if (!this.esUltimo()) this.paso.set(this.paso() + 1);
  }

  atras(): void {
    this.error.set(null);
    if (this.paso() > 0) this.paso.set(this.paso() - 1);
  }

  private validarPaso(): string | null {
    const f = this.form();
    if (this.paso() === 0) {
      if (!f.name.trim()) return "Escribe el nombre de la empresa";
      if (!f.slug.trim()) return "Falta el identificador";
      if ((f.codePrefix ?? "").length !== 3) return "El prefijo debe tener 3 letras";
    }
    if (this.paso() === 2) {
      if (!f.branchName.trim()) return "Falta el nombre de la sucursal";
      for (const [c, l] of [
        ["branchAddress", "dirección"],
        ["branchCity", "ciudad"],
        ["branchState", "estado"],
        ["branchPhone", "teléfono"],
        ["branchEmail", "correo"],
      ] as const) {
        if (!String(f[c] ?? "").trim()) return `Falta la ${l} de la sucursal`;
      }
    }
    if (this.paso() === 3) {
      if (!f.adminFirstName.trim() || !f.adminLastName.trim())
        return "Falta el nombre del administrador";
      if (!f.adminEmail.trim()) return "Falta el correo del administrador";
    }
    return null;
  }

  crear(): void {
    const dto: ProvisionTenantDto = {
      ...this.form(),
      enabledModules: this.modulosSel().size
        ? [...this.modulosSel()]
        : null,
    };
    this.guardando.set(true);
    this.error.set(null);
    this.srv.provision(dto).subscribe({
      next: (r) => {
        this.guardando.set(false);
        this.resultado.set(r);
      },
      error: (e) => {
        this.guardando.set(false);
        this.error.set(e?.error?.message || "No se pudo dar de alta la empresa");
      },
    });
  }

  copiarLiga(): void {
    const url = this.resultado()?.inviteUrl;
    if (url) void navigator.clipboard?.writeText(url);
  }

  irATenants(): void {
    void this.router.navigate(["/tenants"]);
  }
}
