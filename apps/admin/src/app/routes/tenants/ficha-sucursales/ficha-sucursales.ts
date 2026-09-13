import { Component, effect, inject, input, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { SaasService } from "../saas.data.service";
import { NuevaSucursal, RazonSocial, Sucursal } from "../models";
import { NotificacionService } from "../../../shared/services/notificacion.service";
import { EscDirective } from "../../../shared/directives/esc.directive";

/**
 * Tab de la ficha: las sucursales (puntos de atención) de la empresa. Se pueden
 * ver, dar de alta, editar y activar/desactivar sin entrar a su DMS. La razón
 * social (datos fiscales) y la configuración fina de cada sucursal las ajusta el
 * cliente desde su propio sistema. Autocontenido: recibe el id de la empresa.
 */
@Component({
  selector: "app-ficha-sucursales",
  standalone: true,
  imports: [CommonModule, FormsModule, EscDirective],
  templateUrl: "./ficha-sucursales.html",
  styleUrls: ["./ficha-sucursales.scss"],
})
export class FichaSucursales {
  private saas = inject(SaasService);
  private noti = inject(NotificacionService);

  tenantId = input.required<string>();

  sucursales = signal<Sucursal[]>([]);
  razones = signal<RazonSocial[]>([]);
  cargando = signal(false);

  /** Diálogo de alta/edición. `null` = cerrado. */
  editandoId = signal<string | null>(null);
  formAbierto = signal(false);
  guardando = signal(false);
  form = signal<NuevaSucursal>(this.formVacio());

  /** Logotipo de la sucursal que se está editando (opcional). */
  logoUrl = signal<string | null>(null);
  subiendoLogo = signal(false);

  constructor() {
    effect(() => {
      const id = this.tenantId();
      if (id) this.cargar(id);
    });
  }

  private formVacio(): NuevaSucursal {
    return {
      legalEntityId: "",
      name: "",
      slug: "",
      address: "",
      city: "",
      state: "",
      counterPhone: "",
      partsPhone: "",
      appointmentsPhone: "",
      aftersalesPhone: "",
      email: "",
      isPrimary: false,
    };
  }

  cargar(tenantId: string): void {
    this.cargando.set(true);
    this.saas.sucursales(tenantId).subscribe({
      next: (s) => {
        this.sucursales.set(s);
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.noti.error("No se pudieron cargar las sucursales");
      },
    });
    this.saas.razonesSociales(tenantId).subscribe({
      next: (r) => this.razones.set(r),
    });
  }

  nueva(): void {
    if (this.razones().length === 0) {
      this.noti.error(
        "La empresa no tiene una razón social; créala en su DMS antes de dar sucursales de alta.",
      );
      return;
    }
    const f = this.formVacio();
    // Con una sola razón social, se preselecciona: es el caso común.
    if (this.razones().length === 1) f.legalEntityId = this.razones()[0].id;
    f.isPrimary = this.sucursales().length === 0;
    this.form.set(f);
    this.editandoId.set(null);
    this.logoUrl.set(null);
    this.formAbierto.set(true);
  }

  /** Sube el logotipo de la sucursal en edición (solo existe con id). */
  subirLogo(input: HTMLInputElement): void {
    const file = input.files?.[0];
    const id = this.editandoId();
    if (!file || !id) return;
    this.subiendoLogo.set(true);
    this.saas.subirLogoSucursal(this.tenantId(), id, file).subscribe({
      next: (r) => {
        this.subiendoLogo.set(false);
        this.logoUrl.set(r.logoUrl);
        input.value = "";
        this.noti.ok("Logotipo de la sucursal actualizado");
        this.cargar(this.tenantId());
      },
      error: (e) => {
        this.subiendoLogo.set(false);
        this.noti.error(e?.error?.message || "No se pudo subir el logotipo");
      },
    });
  }

  /** Quita el logotipo propio: la sucursal vuelve a imprimir con el del tenant. */
  quitarLogo(): void {
    const id = this.editandoId();
    if (!id) return;
    this.saas.quitarLogoSucursal(this.tenantId(), id).subscribe({
      next: () => {
        this.logoUrl.set(null);
        this.noti.ok("Se quitó el logotipo de la sucursal");
        this.cargar(this.tenantId());
      },
      error: (e) =>
        this.noti.error(e?.error?.message || "No se pudo quitar el logotipo"),
    });
  }

  editar(s: Sucursal): void {
    this.form.set({
      legalEntityId: s.legalEntityId,
      name: s.name,
      slug: s.slug,
      address: s.address,
      city: s.city,
      state: s.state,
      counterPhone: s.counterPhone,
      partsPhone: s.partsPhone ?? "",
      appointmentsPhone: s.appointmentsPhone ?? "",
      aftersalesPhone: s.aftersalesPhone ?? "",
      email: s.email,
      isPrimary: s.isPrimary,
    });
    this.editandoId.set(s.id);
    this.logoUrl.set(s.logoUrl ?? null);
    this.formAbierto.set(true);
  }

  cerrar(): void {
    this.formAbierto.set(false);
    this.editandoId.set(null);
  }

  /** Actualiza un campo del formulario conservando el resto. */
  campo<K extends keyof NuevaSucursal>(k: K, v: NuevaSucursal[K]): void {
    this.form.set({ ...this.form(), [k]: v });
  }

  guardar(): void {
    const f = this.form();
    if (!f.legalEntityId) {
      this.noti.error("Elige la razón social de la sucursal");
      return;
    }
    if (!f.name.trim() || !f.city.trim() || !f.state.trim()) {
      this.noti.error("Nombre, ciudad y estado son obligatorios");
      return;
    }
    if (!this.editandoId() && !f.slug.trim()) {
      this.noti.error("El identificador (slug) es obligatorio");
      return;
    }
    if (!f.address.trim() || !f.counterPhone.trim() || !f.email.trim()) {
      this.noti.error("Dirección, teléfono de mostrador y correo son obligatorios");
      return;
    }
    this.guardando.set(true);
    const id = this.editandoId();
    const obs = id
      ? this.saas.actualizarSucursal(this.tenantId(), id, this.limpiar(f))
      : this.saas.crearSucursal(this.tenantId(), this.limpiar(f));
    obs.subscribe({
      next: () => {
        this.guardando.set(false);
        this.noti.ok(id ? "Sucursal actualizada" : "Sucursal creada");
        this.cerrar();
        this.cargar(this.tenantId());
      },
      error: (e) => {
        this.guardando.set(false);
        this.noti.error(e?.error?.message || "No se pudo guardar la sucursal");
      },
    });
  }

  /** Recorta y quita vacíos opcionales antes de enviar. */
  private limpiar(f: NuevaSucursal): NuevaSucursal {
    return {
      ...f,
      name: f.name.trim(),
      slug: f.slug.trim(),
      address: f.address.trim(),
      city: f.city.trim(),
      state: f.state.trim(),
      counterPhone: f.counterPhone.trim(),
      email: f.email.trim(),
      partsPhone: f.partsPhone?.trim() || undefined,
      appointmentsPhone: f.appointmentsPhone?.trim() || undefined,
      aftersalesPhone: f.aftersalesPhone?.trim() || undefined,
    };
  }

  alternar(s: Sucursal): void {
    this.saas.alternarSucursal(this.tenantId(), s.id).subscribe({
      next: () => this.cargar(this.tenantId()),
      error: (e) =>
        this.noti.error(e?.error?.message || "No se pudo cambiar el estado"),
    });
  }
}
