import { Component, OnInit, computed, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ActivatedRoute, Router, RouterModule } from "@angular/router";
import {
  CdkDragDrop,
  DragDropModule,
  transferArrayItem,
} from "@angular/cdk/drag-drop";
import { ToastrService } from "ngx-toastr";
import {
  BodyworkStatus,
  HojalateriaService,
  OrdenLista,
} from "../hojalateria.service";
import { ESTADOS } from "../estados";

type Vista = "tablero" | "tabla";
interface Columna {
  value: BodyworkStatus;
  label: string;
  items: OrdenLista[];
}

/** Bandeja de órdenes de Hojalatería y Pintura (tablero Kanban + tabla). */
@Component({
  selector: "app-hojalateria-lista",
  standalone: true,
  imports: [CommonModule, RouterModule, DragDropModule],
  templateUrl: "./lista.html",
  styleUrls: ["../hojalateria.scss"],
})
export class Lista implements OnInit {
  private srv = inject(HojalateriaService);
  private toastr = inject(ToastrService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  readonly estados = ESTADOS;

  ordenes = signal<OrdenLista[]>([]);
  cargando = signal(true);
  vista = signal<Vista>("tablero");
  filtro = signal<BodyworkStatus | "">("");
  /** Evita que un arrastre termine navegando al detalle. */
  private arrastrando = false;

  /** Columnas del tablero, una por estado, con sus órdenes. */
  columnas = computed<Columna[]>(() =>
    this.estados.map((e) => ({
      value: e.value,
      label: e.label,
      items: this.ordenes().filter((o) => o.status === e.value),
    })),
  );

  /** Ids de las listas (para conectar el arrastre entre columnas). */
  readonly listIds = this.estados.map((e) => "col-" + e.value);

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    // El tablero necesita todas las órdenes; el filtro por estado solo aplica a la tabla.
    const filtro = this.vista() === "tabla" ? this.filtro() || undefined : undefined;
    this.srv.listar(filtro).subscribe({
      next: (o) => {
        this.ordenes.set(o);
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.toastr.error("No se pudieron cargar las órdenes");
      },
    });
  }

  cambiarVista(v: Vista): void {
    this.vista.set(v);
    this.cargar();
  }

  filtrar(status: BodyworkStatus | ""): void {
    this.filtro.set(status);
    this.cargar();
  }

  listaId(status: BodyworkStatus): string {
    return "col-" + status;
  }

  onDragStart(): void {
    this.arrastrando = true;
  }

  onDragEnd(): void {
    // El click de fin de arrastre llega justo después; se ignora con este flag.
    setTimeout(() => (this.arrastrando = false), 60);
  }

  /** Click en una tarjeta → abre el detalle (salvo que haya sido un arrastre). */
  abrir(o: OrdenLista): void {
    if (this.arrastrando) return;
    this.router.navigate([o.id], { relativeTo: this.route });
  }

  /** Suelta una tarjeta en otra columna → cambia el estado de la orden. */
  soltar(evento: CdkDragDrop<OrdenLista[]>, destino: BodyworkStatus): void {
    if (evento.previousContainer === evento.container) return;
    const orden = evento.previousContainer.data[evento.previousIndex];
    const anterior = orden.status;

    // Movimiento optimista en la UI.
    transferArrayItem(
      evento.previousContainer.data,
      evento.container.data,
      evento.previousIndex,
      evento.currentIndex,
    );
    orden.status = destino;
    this.ordenes.set([...this.ordenes()]);

    this.srv.actualizar(orden.id, { status: destino }).subscribe({
      next: () => {
        this.toastr.success(
          `${orden.folio} → ${this.etiquetaEstado(destino)}`,
        );
      },
      error: () => {
        orden.status = anterior;
        this.ordenes.set([...this.ordenes()]);
        this.toastr.error("No se pudo cambiar el estado");
      },
    });
  }

  etiquetaEstado(s: string): string {
    return this.estados.find((e) => e.value === s)?.label ?? s;
  }

  vehiculo(o: OrdenLista): string {
    return [o.vehicleBrand, o.vehicleModel, o.vehiclePlate]
      .filter(Boolean)
      .join(" · ");
  }
}
