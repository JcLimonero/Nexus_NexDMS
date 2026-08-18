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
  PhotoMark,
  TIPOS_UNIDAD,
  Reception,
  ReceptionPhoto,
  RecepcionService,
  ServicioPredefinido,
} from "./recepcion.service";
import { BranchesService } from "../../inventario-refacciones/services/branches.service";
import { FeatherIcons } from "../../../shared/components/feather-icons/feather-icons";
import {
  copiarAlPortapapeles,
  ligaDeSeguimiento,
  ligaWhatsApp,
  mensajeDeSeguimiento,
  telefonoParaWhatsApp,
} from "../../../shared/utils/liga-cliente";

interface LineaCotizacion {
  description: string;
  quantity: number;
  unitPrice: number;
}

type MarkShape = "POINT" | "CIRCLE";

interface MarcaPendiente {
  x: number;
  y: number;
  shape: MarkShape;
  /** Nulo en un punto. En un área, fracción del ANCHO de la foto. */
  radius: number | null;
}

/**
 * Radio mínimo de un área, en fracción del ancho de la foto.
 *
 * Un toque sin arrastre en modo área daría radio cero, es decir un círculo
 * invisible. Con este mínimo el toque simple deja un área pequeña que después
 * se puede rehacer, en vez de una marca que no se ve y que nadie sabe borrar.
 */
const RADIO_MINIMO = 0.04;

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
 * → presupuesto que se envía al cliente para que la autorice.
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

  // ─── Marcado sobre la foto ───────────────────────
  fotoActiva = signal<ReceptionPhoto | null>(null);
  /**
   * Se entra en "ver" a propósito: esta ficha se abre muchas más veces para
   * consultar los daños que para agregar uno, y mientras cualquier toque
   * sobre la foto creaba una marca, revisarla era arriesgado.
   */
  modo = signal<"ver" | "marcar">("ver");
  marcando = computed(() => this.modo() === "marcar");
  herramienta = signal<MarkShape>("POINT");
  /** Marca que se resalta en la foto y en la lista a la vez. */
  marcaResaltada = signal<string | null>(null);
  /** Marca cuyo detalle está desplegado sobre la foto; null = ninguna. */
  detalleAbierto = signal<string | null>(null);
  marcaPendiente = signal<MarcaPendiente | null>(null);
  marcaTipo = "SCRATCH";
  marcaNota = "";
  /** Caja de la foto durante el arrastre, para no medirla en cada movimiento. */
  private cajaFoto: DOMRect | null = null;
  private arrastrando = false;

  // Presupuesto
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

  // ─── Liga de seguimiento para el cliente ─────────

  /** Dirección pública de la orden; vacía si aún no tiene token. */
  ligaCliente = computed(() => {
    const t = this.recepcion()?.serviceOrder.trackingToken;
    return t ? ligaDeSeguimiento(t) : "";
  });

  private mensajeCliente(): string {
    const so = this.recepcion()!.serviceOrder;
    return mensajeDeSeguimiento(
      so.folio,
      this.ligaCliente(),
      so.clientName,
      so.advisorName,
    );
  }

  abrirLigaCliente(): void {
    const liga = this.ligaCliente();
    if (liga) window.open(liga, "_blank", "noopener");
  }

  async copiarLigaCliente(): Promise<void> {
    const liga = this.ligaCliente();
    if (!liga) return;
    if (await copiarAlPortapapeles(liga)) {
      this.toastr.success("Liga copiada");
    } else {
      // Sin portapapeles no se deja al asesor sin salida: se le enseña la
      // liga para que la copie a mano.
      this.toastr.info(liga, "Copia la liga", { disableTimeOut: true });
    }
  }

  enviarLigaPorWhatsApp(): void {
    const so = this.recepcion()?.serviceOrder;
    if (!so || !this.ligaCliente()) return;
    const tel = telefonoParaWhatsApp(so.clientPhone);
    if (!tel) {
      this.toastr.info(
        "El cliente no tiene teléfono capturado; elige el contacto en WhatsApp",
      );
    }
    window.open(ligaWhatsApp(tel, this.mensajeCliente()), "_blank", "noopener");
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
    this.marcaResaltada.set(null);
    this.detalleAbierto.set(null);
    this.modo.set("ver");
  }

  cerrarMarcado(): void {
    this.fotoActiva.set(null);
    this.marcaPendiente.set(null);
    this.marcaResaltada.set(null);
  }

  /** Vuelve a solo lectura y descarta lo que se estuviera dibujando. */
  verMarcas(): void {
    this.modo.set("ver");
    this.marcaPendiente.set(null);
  }

  cambiarHerramienta(h: MarkShape): void {
    this.herramienta.set(h);
    this.marcaPendiente.set(null);
  }

  /** Nombre del catálogo, que dice más que el código de la foto. */
  nombreSpec(code: string | null): string {
    return (
      this.recepcion()?.specs.find((s) => s.code === code)?.name ?? code ?? ""
    );
  }

  /** Posición del puntero como fracción del ancho y del alto de la foto. */
  private relativo(ev: PointerEvent, caja: DOMRect): { x: number; y: number } {
    return {
      x: Math.min(1, Math.max(0, (ev.clientX - caja.left) / caja.width)),
      y: Math.min(1, Math.max(0, (ev.clientY - caja.top) / caja.height)),
    };
  }

  onPointerDown(ev: PointerEvent): void {
    // Sobre un video no se marca: la posición no significa nada si la imagen
    // se mueve, y el toque sería el de darle play.
    if (!this.marcando() || this.fotoActiva()?.mediaType === "VIDEO") return;
    const lienzo = ev.currentTarget as HTMLElement;
    this.cajaFoto = lienzo.getBoundingClientRect();
    const p = this.relativo(ev, this.cajaFoto);
    this.arrastrando = true;
    // Con captura el arrastre sigue vivo aunque el puntero se salga de la
    // foto: sin ella el círculo se congela justo cuando se quiere agrandar
    // del todo. Puede fallar si el puntero ya se levantó, y no vale la pena
    // abortar el marcado entero por eso.
    try {
      lienzo.setPointerCapture(ev.pointerId);
    } catch {
      /* el arrastre sigue funcionando sin captura */
    }
    this.marcaPendiente.set({
      x: p.x,
      y: p.y,
      shape: this.herramienta(),
      radius: this.herramienta() === "CIRCLE" ? RADIO_MINIMO : null,
    });
    this.marcaNota = "";
  }

  onPointerMove(ev: PointerEvent): void {
    if (!this.arrastrando || this.herramienta() !== "CIRCLE") return;
    const centro = this.marcaPendiente();
    const caja = this.cajaFoto;
    if (!centro || !caja) return;
    const p = this.relativo(ev, caja);
    // El radio se mide sobre el ancho para que el círculo salga redondo, así
    // que la distancia vertical —que viene en fracción del alto— hay que
    // pasarla a fracción del ancho antes de componerla con la horizontal.
    const dx = p.x - centro.x;
    const dy = (p.y - centro.y) * (caja.height / caja.width);
    this.marcaPendiente.set({
      ...centro,
      radius: Math.min(1, Math.max(RADIO_MINIMO, Math.hypot(dx, dy))),
    });
  }

  onPointerUp(): void {
    this.arrastrando = false;
    this.cajaFoto = null;
  }

  /**
   * Un toque sobre la marca abre su detalle; otro lo cierra.
   *
   * Se corta la propagación para que el toque no llegue al lienzo: en modo
   * marcar, consultar una marca dejaría además una marca nueva encima.
   */
  alternarDetalle(m: PhotoMark, ev: Event): void {
    ev.stopPropagation();
    this.detalleAbierto.update((abierta) => (abierta === m.id ? null : m.id));
  }

  confirmarMarca(): void {
    const foto = this.fotoActiva();
    const pos = this.marcaPendiente();
    const r = this.recepcion();
    if (!foto || !pos || !r) return;
    this.guardando.set(true);
    this.srv
      .addMark(foto.id, {
        type: this.marcaTipo,
        shape: pos.shape,
        note: this.marcaNota || undefined,
        x: pos.x,
        y: pos.y,
        radius: pos.radius ?? undefined,
      })
      .subscribe({
        next: () => {
          this.guardando.set(false);
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
        error: (err) => {
          this.guardando.set(false);
          this.toastr.error(err?.error?.message || "Error");
        },
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

  // ─── Servicios y presupuesto ──────────────────────

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
          `Presupuesto ${q.folio} enviado al cliente para su autorización`,
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
