import { Component, OnInit, computed, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";

import { Router } from "@angular/router";

import { AuthService } from "../../core/auth.service";
import { BrandingService } from "../../core/branding.service";
import {
  CitaDelDia,
  RecepcionApiService,
  Sucursal,
} from "../../core/recepcion-api.service";

/**
 * Las recepciones del asesor.
 *
 * Es la pantalla con la que empieza su jornada: las unidades que le tocan hoy,
 * en orden de llegada. Las citas sin asesor asignado también aparecen —marcadas
 * como libres— porque alguien tiene que recibirlas y esconderlas dejaría
 * unidades esperando en el patio.
 */
@Component({
  selector: "app-mis-recepciones",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./mis-recepciones.page.html",
  styleUrls: ["./mis-recepciones.page.scss"],
})
export class MisRecepcionesPage implements OnInit {
  private api = inject(RecepcionApiService);
  private router = inject(Router);
  readonly auth = inject(AuthService);
  private brandingSrv = inject(BrandingService);

  /** Logotipo del cliente para la cabecera. */
  readonly logoUrl = computed(
    () => this.brandingSrv.branding()?.logoUrl ?? null,
  );

  cargando = signal(true);
  error = signal<string | null>(null);
  citas = signal<CitaDelDia[]>([]);
  sucursales = signal<Sucursal[]>([]);
  branchId = signal("");
  fecha = signal(new Date().toISOString().slice(0, 10));
  /** Alternar entre lo mío y todo el mostrador. */
  soloMias = signal(true);

  ngOnInit(): void {
    this.api.sucursales().subscribe({
      next: (r) => {
        this.sucursales.set(r.data ?? []);
        if (r.data?.length && !this.branchId()) {
          this.branchId.set(r.data[0].id);
          this.cargar();
        } else {
          this.cargando.set(false);
        }
      },
      error: () => {
        this.cargando.set(false);
        this.error.set("No se pudieron cargar las sucursales");
      },
    });
  }

  cargar(): void {
    if (!this.branchId()) return;
    this.cargando.set(true);
    this.error.set(null);
    this.api.agenda(this.branchId(), this.fecha(), this.soloMias()).subscribe({
      next: (c) => {
        this.citas.set(c);
        this.cargando.set(false);
      },
      error: (e) => {
        this.cargando.set(false);
        this.error.set(e?.error?.message || "No se pudo cargar la agenda");
      },
    });
  }

  alternarAlcance(): void {
    this.soloMias.update((v) => !v);
    this.cargar();
  }

  moverDia(dias: number): void {
    const d = new Date(`${this.fecha()}T12:00:00`);
    d.setDate(d.getDate() + dias);
    this.fecha.set(d.toISOString().slice(0, 10));
    this.cargar();
  }

  /** Sin asesor asignado: cualquiera del mostrador puede tomarla. */
  esLibre(c: CitaDelDia): boolean {
    return !c.advisorId;
  }

  mia(c: CitaDelDia): boolean {
    return !!c.advisorId && c.advisorId === this.auth.user()?.id;
  }

  hora(iso: string): string {
    return new Date(iso).toLocaleTimeString("es-MX", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  unidad(c: CitaDelDia): string {
    if (!c.vehicle) return "Unidad por capturar";
    return c.vehicle.plate
      ? `${c.vehicle.label} · ${c.vehicle.plate}`
      : c.vehicle.label;
  }

  /** El flujo completo vive en este mismo portal. */
  abrir(c: CitaDelDia): void {
    if (c.serviceOrderId) {
      void this.router.navigate(["/recibir", c.serviceOrderId]);
    } else {
      void this.router.navigate(["/recibir"], { queryParams: { cita: c.id } });
    }
  }

  pendientes(): number {
    return this.citas().filter((c) => !c.recibida).length;
  }

  // ── Recepción sin cita (walk-in) ──
  walkinAbierto = signal(false);
  guardandoWalkin = signal(false);
  readonly tiposUnidad = [
    { v: "MOTORCYCLE", n: "Motocicleta" },
    { v: "CAR", n: "Automóvil" },
    { v: "SUV", n: "SUV" },
    { v: "MINIVAN", n: "Minivan" },
    { v: "TRUCK", n: "Camioneta / Pick-up" },
    { v: "VAN", n: "Van" },
  ];
  walkin = this.walkinVacio();

  private walkinVacio() {
    return {
      firstName: "",
      lastName: "",
      phone: "",
      vehicleType: "CAR",
      make: "",
      model: "",
      year: null as number | null,
      plate: "",
      reportedFault: "",
      kmIn: null as number | null,
    };
  }

  abrirWalkin(): void {
    this.walkin = this.walkinVacio();
    this.walkinAbierto.set(true);
  }

  crearWalkin(): void {
    if (this.guardandoWalkin()) return;
    const w = this.walkin;
    if (!w.firstName.trim() || !w.phone.trim()) {
      this.error.set("El cliente necesita nombre y teléfono");
      return;
    }
    if (!w.make.trim() || !w.model.trim()) {
      this.error.set("La unidad necesita marca y modelo");
      return;
    }
    this.error.set(null);
    this.guardandoWalkin.set(true);
    this.api
      .recibirSinCita({
        branchId: this.branchId(),
        cliente: {
          firstName: w.firstName.trim(),
          lastName: w.lastName.trim() || undefined,
          phone: w.phone.trim(),
        },
        vehiculo: {
          vehicleType: w.vehicleType,
          make: w.make.trim(),
          model: w.model.trim(),
          year: w.year || undefined,
          plate: w.plate.trim() || undefined,
        },
        reportedFault: w.reportedFault.trim() || undefined,
        kmIn: w.kmIn || undefined,
      })
      .subscribe({
        next: (orden) => {
          this.guardandoWalkin.set(false);
          this.walkinAbierto.set(false);
          // Entra al mismo walk-around (fotos y daños) que una cita.
          void this.router.navigate(["/recibir", orden.id]);
        },
        error: (e) => {
          this.guardandoWalkin.set(false);
          this.error.set(e?.error?.message || "No se pudo abrir la recepción");
        },
      });
  }
}
