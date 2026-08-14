import {
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { ActivatedRoute } from "@angular/router";
import { Title } from "@angular/platform-browser";

import { BranchesService } from "../../features/inventario-refacciones/services/branches.service";
import { CitaEnTablero, MonitorService, TableroCitas } from "./monitor.service";
import { LineaDeTiempo } from "./linea-de-tiempo";

/** Una cita ya colocada sobre la línea de tiempo, en porcentaje. */
interface CitaColocada {
  id: string;
  hora: string;
  cliente: string;
  servicio: string;
  estado: string;
  etiqueta: string;
  /** Pasó su hora y sigue esperándose. */
  tarde: boolean;
  llego: boolean;
  izquierda: number;
  ancho: number;
}

interface CarrilAsesor {
  id: string;
  nombre: string;
  iniciales: string;
  disponible: boolean;
  motivo: string | null;
  franjas: { izquierda: number; ancho: number }[];
  citas: CitaColocada[];
}

/**
 * La agenda del día, para colgar junto a la recepción.
 *
 * Mismo tablero que el del taller cambiando el recurso: allí son técnicos y
 * trabajos, aquí asesores y citas. Comparten el eje de horas —está en un
 * solo sitio— porque colgados uno al lado del otro, dos ejes distintos
 * dibujarían la misma hora en sitios distintos.
 */
@Component({
  selector: "app-monitor-citas",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./monitor-citas.html",
  styleUrls: ["./monitor.scss"],
})
export class MonitorCitas implements OnInit, OnDestroy {
  private srv = inject(MonitorService);
  private branchesSrv = inject(BranchesService);
  private route = inject(ActivatedRoute);
  private titulo = inject(Title);

  private static readonly REFRESCO_MS = 60_000;
  private static readonly LATIDO_MS = 15_000;
  private temporizador?: ReturnType<typeof setInterval>;
  private latido?: ReturnType<typeof setInterval>;

  readonly eje = new LineaDeTiempo();
  readonly horas = this.eje.horas;
  lineaAhora = computed(() => this.eje.posicionAhora());

  datos = signal<TableroCitas | null>(null);
  sucursal = signal<string>("");
  nombreSucursal = signal<string>("");
  /** Para poder cambiar de taller desde la propia pantalla. */
  sucursales = signal<{ id: string; name: string }[]>([]);
  actualizado = signal<Date>(new Date());
  sinConexion = signal(false);

  /** Las que ya no se esperan: llegaron, se cancelaron o no se presentaron. */
  private cerrada(estado: string): boolean {
    return [
      "ARRIVED",
      "IN_SERVICE",
      "COMPLETED",
      "CANCELLED",
      "NO_SHOW",
    ].includes(estado);
  }

  private llego(estado: string): boolean {
    return ["ARRIVED", "IN_SERVICE", "COMPLETED"].includes(estado);
  }

  private todas = computed<CitaEnTablero[]>(() => {
    const d = this.datos();
    if (!d) return [];
    // Se toleran listas ausentes: durante un despliegue la pantalla puede
    // recibir una respuesta con otra forma, y un monitor que se queda en
    // blanco por eso es peor que uno que muestra de menos un minuto.
    return [
      ...(d.asesores ?? []).flatMap((a) => a.bloques ?? []),
      ...(d.sinAsignar ?? []),
    ];
  });

  total = computed(() => this.todas().length);
  llegadas = computed(() => this.todas().filter((c) => this.llego(c.estado)).length);
  pendientes = computed(
    () => this.todas().filter((c) => !this.cerrada(c.estado)).length,
  );
  /** Las que ya pasaron de su hora y siguen sin llegar. */
  retrasadas = computed(
    () => this.todas().filter((c) => this.tarde(c)).length,
  );

  private tarde(c: CitaEnTablero): boolean {
    if (this.cerrada(c.estado)) return false;
    return new Date(c.inicio) < new Date();
  }

  private colocar(c: CitaEnTablero): CitaColocada {
    const inicio = new Date(c.inicio);
    const izquierda = this.eje.posicion(inicio);
    return {
      id: c.id,
      hora: `${String(inicio.getHours()).padStart(2, "0")}:${String(inicio.getMinutes()).padStart(2, "0")}`,
      cliente: c.cliente,
      servicio: c.servicio,
      estado: c.estado,
      etiqueta: this.etiquetaEstado(c),
      tarde: this.tarde(c),
      llego: this.llego(c.estado),
      izquierda,
      ancho: this.eje.ancho(izquierda, c.duracionMin),
    };
  }

  carriles = computed<CarrilAsesor[]>(() => {
    const d = this.datos();
    if (!d) return [];
    return (d.asesores ?? []).map((a) => ({
      id: a.id,
      nombre: a.nombre,
      iniciales: a.iniciales,
      disponible: a.disponible,
      motivo: a.motivo,
      franjas: (a.ventanas ?? []).map((v) => {
        const izquierda = this.eje.posicionHora(v.inicio);
        return {
          izquierda,
          ancho: Math.max(0, this.eje.posicionHora(v.fin) - izquierda),
        };
      }),
      citas: (a.bloques ?? []).map((b) => this.colocar(b)),
    }));
  });

  sinAsignar = computed<CitaColocada[]>(() =>
    (this.datos()?.sinAsignar ?? []).map((c) => this.colocar(c)),
  );

  ngOnInit(): void {
    const deLaUrl = this.route.snapshot.queryParamMap.get("branch");
    if (deLaUrl) {
      this.sucursal.set(deLaUrl);
      this.cargar();
    }
    this.branchesSrv.getAll(1, 100).subscribe({
      next: (res) => {
        const lista = res.data ?? [];
        this.sucursales.set(lista);
        if (!this.sucursal() && lista.length) {
          this.sucursal.set(lista[0].id);
          this.cargar();
        }
        this.nombreSucursal.set(
          lista.find((b: { id: string }) => b.id === this.sucursal())?.name ?? "",
        );
        this.ponerTitulo();
      },
    });
    this.temporizador = setInterval(
      () => this.cargar(),
      MonitorCitas.REFRESCO_MS,
    );
    // La línea avanza aunque no lleguen datos nuevos: entre refrescos el
    // tiempo sigue corriendo y una línea parada envejece mal.
    this.latido = setInterval(() => this.eje.mover(), MonitorCitas.LATIDO_MS);
  }

  /**
   * Cambia de sucursal sin recargar.
   *
   * La dirección se reescribe con la elegida para que, si alguien deja la
   * pantalla puesta y luego la marca, el marcador ya arranque en ese taller.
   */
  cambiarSucursal(id: string): void {
    if (!id || id === this.sucursal()) return;
    this.sucursal.set(id);
    this.nombreSucursal.set(
      this.sucursales().find((b) => b.id === id)?.name ?? "",
    );
    this.ponerTitulo();
    history.replaceState({}, "", `${location.pathname}?branch=${id}`);
    this.cargar();
  }

  ngOnDestroy(): void {
    if (this.temporizador) clearInterval(this.temporizador);
    if (this.latido) clearInterval(this.latido);
  }

  private hoy(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  cargar(): void {
    const b = this.sucursal();
    if (!b) return;
    this.srv.citasDelDia(b, this.hoy()).subscribe({
      next: (d) => {
        this.datos.set(d);
        this.actualizado.set(new Date());
        this.sinConexion.set(false);
        // La hora viene del servidor: si el reloj de la pantalla está mal,
        // la línea seguiría cuadrando con las citas.
        this.eje.mover(new Date(d.ahora));
      },
      error: () => this.sinConexion.set(true),
    });
  }

  etiquetaEstado(c: CitaEnTablero): string {
    return (
      {
        SCHEDULED: this.tarde(c) ? "no ha llegado" : "esperada",
        CONFIRMED: this.tarde(c) ? "no ha llegado" : "confirmada",
        ARRIVED: "llegó",
        IN_SERVICE: "en servicio",
        COMPLETED: "terminada",
        CANCELLED: "cancelada",
        NO_SHOW: "no se presentó",
      }[c.estado] ?? c.estado
    );
  }

  /**
   * El nombre de la pantalla y su sucursal, en la pestaña.
   *
   * Con dos monitores abiertos —o el mismo de dos talleres— las pestañas
   * decían lo mismo y no había forma de saber cuál era cuál.
   */
  private ponerTitulo(): void {
    const suc = this.nombreSucursal();
    this.titulo.setTitle(suc ? `Citas · ${suc} — NexDMS` : `Citas — NexDMS`);
  }
}
