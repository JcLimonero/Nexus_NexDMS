import { Component, OnInit, computed, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { RouterModule } from "@angular/router";
import { ToastrService } from "ngx-toastr";

import {
  CitaAgenda,
  DatosUnidad,
  KitResuelto,
  MARK_TYPES,
  TIPOS_UNIDAD,
  Reception,
  ReceptionPhoto,
  RecepcionService,
  ServicioPredefinido,
} from "./recepcion.service";
import { BranchesService } from "../../inventario-refacciones/services/branches.service";
import { FeatherIcons } from "../../../shared/components/feather-icons/feather-icons";

interface LineaCotizacion {
  description: string;
  quantity: number;
  unitPrice: number;
}

/**
 * ⚠️ Existe una segunda implementación de este mismo flujo en el portal
 * independiente: `apps/recepcion/src/app/pages/recibir/recibir.page.ts`.
 * Son dos pantallas deliberadas —una embebida en el DMS y otra para el iPad
 * del mostrador—, así que un cambio de comportamiento aquí hay que llevarlo
 * también allá o las dos empezarán a contar historias distintas.
 */
/**
 * Recepción de unidades a servicio.
 *
 * Flujo: cita del día → recibir la unidad (km, combustible, inventario) →
 * fotos guiadas por el catálogo con marcado de daños → servicios a realizar
 * → cotización que se envía al cliente para que la autorice.
 */
@Component({
  selector: "app-recepcion-page",
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, FeatherIcons],
  templateUrl: "./recepcion-page.html",
  styleUrls: ["./recepcion-page.scss"],
})
export class RecepcionPage implements OnInit {
  private srv = inject(RecepcionService);
  private branchesService = inject(BranchesService);
  private toastr = inject(ToastrService);

  readonly markTypes = MARK_TYPES;
  readonly tiposUnidad = TIPOS_UNIDAD;

  /** Cita del bot en proceso de alta de unidad; null = nadie pendiente. */
  citaSinUnidad = signal<CitaAgenda | null>(null);
  unidad: DatosUnidad = {
    vehicleType: "MOTORCYCLE",
    make: "",
    model: "",
    year: new Date().getFullYear(),
    plate: "",
    vin: "",
    mileage: 0,
    color: "",
  };

  branches = signal<{ id: string; name: string }[]>([]);
  branchId = signal<string>("");
  date = signal<string>(new Date().toISOString().slice(0, 10));

  citas = signal<CitaAgenda[]>([]);
  loading = signal(true);

  /** Orden que se está recibiendo; null = vista de agenda. */
  recepcion = signal<Reception | null>(null);
  guardando = signal(false);

  checklist = {
    kmIn: 0,
    fuelLevel: 50,
    hasSpareTire: false,
    hasTools: false,
    hasDocuments: false,
    hasMats: false,
    observations: "",
    damageDescription: "",
  };

  // Marcado sobre la foto
  fotoActiva = signal<ReceptionPhoto | null>(null);
  marcaPendiente = signal<{ x: number; y: number } | null>(null);
  marcaTipo = "SCRATCH";
  marcaNota = "";

  // Cotización
  servicios = signal<ServicioPredefinido[]>([]);
  kits = signal<KitResuelto[]>([]);
  lineas = signal<LineaCotizacion[]>([]);
  condiciones = "";

  pendientes = computed(() => this.recepcion()?.pendientes ?? []);
  listaParaCotizar = computed(
    () => this.pendientes().length === 0 && !!this.recepcion()?.checklist,
  );
  totalCotizacion = computed(() =>
    this.lineas().reduce((a, l) => a + l.quantity * l.unitPrice, 0),
  );

  ngOnInit(): void {
    this.branchesService.getAll().subscribe({
      next: (res) => {
        this.branches.set(res.data.map((b) => ({ id: b.id, name: b.name })));
        if (res.data.length && !this.branchId()) {
          this.branchId.set(res.data[0].id);
          this.load();
          this.srv.serviciosPredefinidos(res.data[0].id).subscribe({
            next: (s) => this.servicios.set(s),
          });
          this.srv.kits(res.data[0].id).subscribe({
            next: (k) => this.kits.set(k),
          });
        }
      },
    });
  }

  load(): void {
    if (!this.branchId()) return;
    this.loading.set(true);
    this.srv.agenda(this.branchId(), this.date()).subscribe({
      next: (c) => {
        this.citas.set(c);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  shiftDate(days: number): void {
    const d = new Date(this.date() + "T12:00:00");
    d.setDate(d.getDate() + days);
    this.date.set(d.toISOString().slice(0, 10));
    this.load();
  }

  // ─── Recepción ───────────────────────────────────

  recibir(cita: CitaAgenda): void {
    // Las citas del bot llegan sin unidad: primero se dan de alta sus datos
    if (!cita.vehicle) {
      this.citaSinUnidad.set(cita);
      return;
    }
    this.srv.recibirCita(cita.id).subscribe({
      next: (orden) => this.abrirRecepcion(orden.id),
      error: (err) =>
        this.toastr.error(err?.error?.message || "No se pudo abrir la recepción"),
    });
  }

  cancelarAltaUnidad(): void {
    this.citaSinUnidad.set(null);
  }

  /** Da de alta la unidad y abre la recepción de esa cita. */
  altaUnidadYRecibir(): void {
    const cita = this.citaSinUnidad();
    if (!cita) return;
    if (!this.unidad.make.trim() || !this.unidad.model.trim()) {
      this.toastr.warning("Captura al menos marca y modelo de la unidad");
      return;
    }
    this.guardando.set(true);
    this.srv.recibirCita(cita.id, { vehiculo: this.unidad }).subscribe({
      next: (orden) => {
        this.guardando.set(false);
        this.citaSinUnidad.set(null);
        this.toastr.success("Unidad dada de alta");
        this.abrirRecepcion(orden.id);
      },
      error: (err) => {
        this.guardando.set(false);
        this.toastr.error(err?.error?.message || "No se pudo dar de alta la unidad");
      },
    });
  }

  abrirRecepcion(serviceOrderId: string): void {
    this.srv.get(serviceOrderId).subscribe({
      next: (r) => {
        this.recepcion.set(r);
        this.checklist = {
          kmIn: r.checklist?.kmIn ?? r.serviceOrder.kmIn ?? 0,
          fuelLevel: r.checklist?.fuelLevel ?? 50,
          hasSpareTire: r.checklist?.hasSpareTire ?? false,
          hasTools: r.checklist?.hasTools ?? false,
          hasDocuments: r.checklist?.hasDocuments ?? false,
          hasMats: r.checklist?.hasMats ?? false,
          observations: r.checklist?.observations ?? "",
          damageDescription: r.checklist?.damageDescription ?? "",
        };
      },
      error: (err) => this.toastr.error(err?.error?.message || "Error"),
    });
  }

  cerrarRecepcion(): void {
    this.recepcion.set(null);
    this.fotoActiva.set(null);
    this.lineas.set([]);
    this.load();
  }

  guardarChecklist(): void {
    const r = this.recepcion();
    if (!r) return;
    this.guardando.set(true);
    this.srv.saveChecklist(r.serviceOrder.id, this.checklist).subscribe({
      next: () => {
        this.guardando.set(false);
        this.toastr.success("Datos de recepción guardados");
        this.abrirRecepcion(r.serviceOrder.id);
      },
      error: (err) => {
        this.guardando.set(false);
        this.toastr.error(err?.error?.message || "Error al guardar");
      },
    });
  }

  // ─── Fotos ───────────────────────────────────────

  fotoDe(code: string): ReceptionPhoto | undefined {
    return this.recepcion()?.fotos.find((f) => f.specCode === code);
  }

  onArchivo(event: Event, specCode: string): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const r = this.recepcion();
    if (!r) return;
    this.srv.uploadMedia(r.serviceOrder.id, specCode, file).subscribe({
      next: () => {
        this.toastr.success("Archivo capturado");
        this.abrirRecepcion(r.serviceOrder.id);
      },
      error: (err) =>
        this.toastr.error(err?.error?.message || "No se pudo subir el archivo"),
    });
    input.value = "";
  }

  abrirMarcado(foto: ReceptionPhoto): void {
    this.fotoActiva.set(foto);
    this.marcaPendiente.set(null);
  }

  /** Convierte el clic en coordenadas relativas a la imagen. */
  onClickFoto(event: MouseEvent): void {
    // Sobre un video no se marca: la posición no significa nada si la imagen
    // se mueve, y el clic sería el de darle play.
    if (this.fotoActiva()?.mediaType === "VIDEO") return;
    const img = event.currentTarget as HTMLElement;
    const r = img.getBoundingClientRect();
    this.marcaPendiente.set({
      x: Math.min(1, Math.max(0, (event.clientX - r.left) / r.width)),
      y: Math.min(1, Math.max(0, (event.clientY - r.top) / r.height)),
    });
    this.marcaNota = "";
  }

  confirmarMarca(): void {
    const foto = this.fotoActiva();
    const pos = this.marcaPendiente();
    const r = this.recepcion();
    if (!foto || !pos || !r) return;
    this.srv
      .addMark(foto.id, {
        type: this.marcaTipo,
        note: this.marcaNota || undefined,
        x: pos.x,
        y: pos.y,
      })
      .subscribe({
        next: () => {
          this.marcaPendiente.set(null);
          this.marcaNota = "";
          this.srv.get(r.serviceOrder.id).subscribe({
            next: (nueva) => {
              this.recepcion.set(nueva);
              this.fotoActiva.set(
                nueva.fotos.find((f) => f.id === foto.id) ?? null,
              );
            },
          });
        },
        error: (err) => this.toastr.error(err?.error?.message || "Error"),
      });
  }

  quitarMarca(markId: string): void {
    const foto = this.fotoActiva();
    const r = this.recepcion();
    if (!foto || !r) return;
    this.srv.removeMark(markId).subscribe({
      next: () =>
        this.srv.get(r.serviceOrder.id).subscribe({
          next: (nueva) => {
            this.recepcion.set(nueva);
            this.fotoActiva.set(
              nueva.fotos.find((f) => f.id === foto.id) ?? null,
            );
          },
        }),
    });
  }

  etiquetaMarca(tipo: string): string {
    return MARK_TYPES.find((m) => m.value === tipo)?.label ?? tipo;
  }

  // ─── Servicios y cotización ──────────────────────

  agregarServicio(s: ServicioPredefinido): void {
    this.lineas.update((l) => [
      ...l,
      { description: s.name, quantity: 1, unitPrice: s.price ?? 0 },
    ]);
  }

  /**
   * Un kit entra como varias líneas: la mano de obra y cada refacción por
   * separado. El cliente tiene derecho a ver de qué se compone el precio, y
   * el asesor puede quitar una pieza sin rehacer todo.
   */
  agregarKit(k: KitResuelto): void {
    const nuevas: LineaCotizacion[] = [];
    if (k.laborPrice > 0) {
      nuevas.push({
        description: `${k.name} — mano de obra`,
        quantity: 1,
        unitPrice: k.laborPrice,
      });
    }
    for (const i of k.items) {
      nuevas.push({
        description: i.description,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
      });
    }
    this.lineas.update((l) => [...l, ...nuevas]);
  }

  /** Texto del semáforo, para no repetirlo en la plantilla. */
  stockTexto(k: KitResuelto): string {
    if (k.stock === "VERDE") return "Hay existencias";
    if (k.stock === "AMBAR") return `Falta: ${k.faltantes.join(", ")}`;
    return "Sin existencias";
  }

  agregarExtra(): void {
    this.lineas.update((l) => [
      ...l,
      { description: "", quantity: 1, unitPrice: 0 },
    ]);
  }

  quitarLinea(i: number): void {
    this.lineas.update((l) => l.filter((_, idx) => idx !== i));
  }

  enviarCotizacion(): void {
    const r = this.recepcion();
    const lineas = this.lineas().filter(
      (l) => l.description.trim() && l.unitPrice >= 0,
    );
    if (!r || !lineas.length) {
      this.toastr.warning("Agrega al menos un servicio");
      return;
    }
    this.guardando.set(true);
    this.srv.cotizar(r.serviceOrder.id, lineas, this.condiciones).subscribe({
      next: (q) => {
        this.guardando.set(false);
        this.toastr.success(
          `Cotización ${q.folio} enviada al cliente para su autorización`,
        );
        this.cerrarRecepcion();
      },
      error: (err) => {
        this.guardando.set(false);
        this.toastr.error(err?.error?.message || "Error al cotizar");
      },
    });
  }

  hora(iso: string): string {
    return new Date(iso).toLocaleTimeString("es-MX", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  money(n: number): string {
    return n.toLocaleString("es-MX", { style: "currency", currency: "MXN" });
  }
}
