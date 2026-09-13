import { Component, effect, inject, input, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { SaasService } from "../saas.data.service";
import { PaletaMarca, Branding } from "../models";
import { NotificacionService } from "../../../shared/services/notificacion.service";

/**
 * Tab de la ficha: la marca de la empresa (logotipo, isotipo y paleta), que se
 * aplica en todo su NexQSystem y en lo que imprime. Autocontenido: recibe el id de
 * la empresa y carga su branding y las paletas disponibles.
 */
@Component({
  selector: "app-ficha-marca",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./ficha-marca.html",
  styleUrls: ["./ficha-marca.scss"],
})
export class FichaMarca {
  private saas = inject(SaasService);
  private noti = inject(NotificacionService);

  tenantId = input.required<string>();

  paletas = signal<PaletaMarca[]>([]);
  branding = signal<Branding | null>(null);
  paletaElegida = signal<string>("nexus");
  subiendoLogo = signal(false);
  subiendoIcono = signal(false);
  guardando = signal(false);

  constructor() {
    // Las paletas no dependen de la empresa: se traen una vez.
    this.saas.paletas().subscribe({ next: (p) => this.paletas.set(p) });
    // El branding sí: recarga si cambia la empresa.
    effect(() => {
      const id = this.tenantId();
      if (id) this.cargar(id);
    });
  }

  private cargar(tenantId: string): void {
    this.saas.branding(tenantId).subscribe({
      next: (b) => {
        this.branding.set(b);
        this.paletaElegida.set(b.paletaId);
      },
    });
  }

  guardarPaleta(): void {
    this.guardando.set(true);
    this.saas
      .guardarBranding(this.tenantId(), { paletaId: this.paletaElegida() })
      .subscribe({
        next: (b) => {
          this.branding.set(b);
          this.guardando.set(false);
          this.noti.ok("Paleta guardada");
        },
        error: () => {
          this.guardando.set(false);
          this.noti.error("No se pudo guardar la paleta");
        },
      });
  }

  subirLogo(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.subiendoLogo.set(true);
    this.saas.subirLogo(this.tenantId(), file).subscribe({
      next: (b) => {
        this.branding.set(b);
        this.subiendoLogo.set(false);
        this.noti.ok("Logotipo actualizado");
      },
      error: (e) => {
        this.subiendoLogo.set(false);
        this.noti.error(e?.error?.message || "No se pudo subir el logotipo");
      },
    });
    input.value = "";
  }

  quitarLogo(): void {
    this.saas.guardarBranding(this.tenantId(), { logoKey: null }).subscribe({
      next: (b) => {
        this.branding.set(b);
        this.noti.ok("Logotipo quitado");
      },
    });
  }

  subirIcono(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.subiendoIcono.set(true);
    this.saas.subirIcono(this.tenantId(), file).subscribe({
      next: (b) => {
        this.branding.set(b);
        this.subiendoIcono.set(false);
        this.noti.ok("Isotipo actualizado");
      },
      error: (e) => {
        this.subiendoIcono.set(false);
        this.noti.error(e?.error?.message || "No se pudo subir el isotipo");
      },
    });
    input.value = "";
  }

  quitarIcono(): void {
    this.saas.guardarBranding(this.tenantId(), { iconKey: null }).subscribe({
      next: (b) => {
        this.branding.set(b);
        this.noti.ok("Isotipo quitado");
      },
    });
  }
}
