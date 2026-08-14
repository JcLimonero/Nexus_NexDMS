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
import { Magneto, MonitorService, Semaforo } from "./monitor.service";

/** Un trabajo ya colocado sobre la línea de tiempo, en porcentaje. */
interface BloqueColocado {
  faseId: string;
  folio: string;
  vehiculo: string;
  placa: string | null;
  fase: string;
  semaforo: Semaforo;
  estado: string;
  transcurridoMin: number;
  estimadoMin: number;
  izquierda: number;
  ancho: number;
  /** Cuánto del estimado se lleva consumido, tope 100 para la barra. */
  consumido: number;
}

interface CarrilTecnico {
  id: string;
  nombre: string;
  iniciales: string;
  disponible: boolean;
  motivo: string | null;
  /** Su turno, ya en porcentaje sobre la línea de tiempo. */
  franjas: { izquierda: number; ancho: number }[];
  bloques: BloqueColocado[];
}

/**
 * El magneto plano del taller.
 *
 * Una fila por técnico y los trabajos colocados sobre la hora en que
 * ocurren, como el tablero de imanes de toda la vida. Lo que un tablero de
 * imanes no puede tener: la franja del turno de cada quien, el avance real
 * contra lo estimado, y una línea que marca la hora y se mueve sola.
 *
 * La hora la manda el servidor, no el equipo donde está colgada la pantalla:
 * un monitor con el reloj mal puesto dibujaría la línea donde no va y haría
 * dudar de todo lo demás.
 */
@Component({
  selector: "app-monitor-taller",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./monitor-taller.html",
  styleUrls: ["./monitor.scss"],
})
export class MonitorTaller implements OnInit, OnDestroy {
  private srv = inject(MonitorService);
  private branchesSrv = inject(BranchesService);
  private route = inject(ActivatedRoute);
  private titulo = inject(Title);

  /** Los datos, cada minuto; la línea de "ahora", cada quince segundos. */
  private static readonly REFRESCO_MS = 60_000;
  private static readonly LATIDO_MS = 15_000;
  private temporizador?: ReturnType<typeof setInterval>;
  private latido?: ReturnType<typeof setInterval>;

  /** Ventana del tablero. Un taller no abre a medianoche. */
  private static readonly HORA_INICIO = 7;
  private static readonly HORA_FIN = 20;

  datos = signal<Magneto | null>(null);
  sucursal = signal<string>("");
  nombreSucursal = signal<string>("");
  actualizado = signal<Date>(new Date());
  sinConexion = signal(false);
  /** Minutos desde el inicio del tablero; lo mueve el latido. */
  private ahoraMin = signal<number>(0);

  readonly horas = Array.from(
    { length: MonitorTaller.HORA_FIN - MonitorTaller.HORA_INICIO + 1 },
    (_, i) => MonitorTaller.HORA_INICIO + i,
  );

  private get rangoMin(): number {
    return (MonitorTaller.HORA_FIN - MonitorTaller.HORA_INICIO) * 60;
  }

  private aPorcentaje(fecha: Date): number {
    const min =
      (fecha.getHours() - MonitorTaller.HORA_INICIO) * 60 + fecha.getMinutes();
    return (min / this.rangoMin) * 100;
  }

  /** Dónde va la línea de la hora. Fuera de la ventana no se dibuja. */
  lineaAhora = computed(() => {
    const pct = (this.ahoraMin() / this.rangoMin) * 100;
    return pct >= 0 && pct <= 100 ? pct : null;
  });

  carriles = computed<CarrilTecnico[]>(() => {
    const d = this.datos();
    if (!d) return [];
    return d.tecnicos.map((t) => ({
      id: t.id,
      nombre: t.nombre,
      iniciales: t.iniciales,
      disponible: t.disponible,
      motivo: t.motivo,
      franjas: t.ventanas.map((v) => {
        const izquierda = this.horaAPorcentaje(v.inicio);
        return {
          izquierda,
          ancho: Math.max(0, this.horaAPorcentaje(v.fin) - izquierda),
        };
      }),
      bloques: t.bloques.map((b) => this.colocar(b)),
    }));
  });

  sinAsignar = computed<BloqueColocado[]>(() =>
    (this.datos()?.sinAsignar ?? []).map((b) => this.colocar(b)),
  );

  enEspera = computed(() => this.datos()?.enEspera ?? []);

  excedidas = computed(
    () =>
      this.carriles()
        .flatMap((c) => c.bloques)
        .concat(this.sinAsignar())
        .filter((b) => b.semaforo === "excedido").length,
  );

  enPiso = computed(() => {
    const d = this.datos();
    if (!d) return 0;
    const conTrabajo = new Set(
      [...d.tecnicos.flatMap((t) => t.bloques), ...d.sinAsignar].map(
        (b) => b.ordenId,
      ),
    );
    return conTrabajo.size + d.enEspera.length;
  });

  private horaAPorcentaje(hhmm: string): number {
    const [h, m] = hhmm.split(":").map(Number);
    const min = (h - MonitorTaller.HORA_INICIO) * 60 + m;
    return Math.max(0, Math.min(100, (min / this.rangoMin) * 100));
  }

  private colocar(b: Magneto["sinAsignar"][number]): BloqueColocado {
    const inicio = new Date(b.inicio);
    const izquierda = Math.max(0, Math.min(100, this.aPorcentaje(inicio)));
    // El ancho es lo estimado, no lo transcurrido: el bloque representa el
    // hueco que el trabajo debía ocupar, y el relleno dice cuánto lleva.
    // Con un mínimo visible, o una fase de cinco minutos sería una raya.
    const ancho = Math.min(
      100 - izquierda,
      Math.max(1.5, (b.estimadoMin / this.rangoMin) * 100),
    );
    return {
      faseId: b.faseId,
      folio: b.folio,
      vehiculo: b.vehiculo,
      placa: b.placa,
      fase: b.fase,
      semaforo: b.semaforo,
      estado: b.estado,
      transcurridoMin: b.transcurridoMin,
      estimadoMin: b.estimadoMin,
      izquierda,
      ancho,
      consumido: b.estimadoMin
        ? Math.min(100, Math.round((b.transcurridoMin / b.estimadoMin) * 100))
        : 0,
    };
  }

  ngOnInit(): void {
    const deLaUrl = this.route.snapshot.queryParamMap.get("branch");
    if (deLaUrl) {
      this.sucursal.set(deLaUrl);
      this.cargar();
    }
    this.branchesSrv.getAll(1, 100).subscribe({
      next: (res) => {
        const lista = res.data ?? [];
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
      MonitorTaller.REFRESCO_MS,
    );
    // La línea avanza aunque no lleguen datos nuevos: entre refrescos el
    // tiempo sigue corriendo y una línea parada envejece mal.
    this.latido = setInterval(
      () => this.moverLinea(),
      MonitorTaller.LATIDO_MS,
    );
  }

  ngOnDestroy(): void {
    if (this.temporizador) clearInterval(this.temporizador);
    if (this.latido) clearInterval(this.latido);
  }

  private moverLinea(desde?: Date): void {
    const ahora = desde ?? new Date();
    this.ahoraMin.set(
      (ahora.getHours() - MonitorTaller.HORA_INICIO) * 60 + ahora.getMinutes(),
    );
  }

  cargar(): void {
    const b = this.sucursal();
    if (!b) return;
    const hoy = new Date();
    const fecha = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`;
    this.srv.magneto(b, fecha).subscribe({
      next: (d) => {
        this.datos.set(d);
        this.actualizado.set(new Date());
        this.sinConexion.set(false);
        // La hora viene del servidor: si el reloj del monitor está mal, la
        // línea seguiría cuadrando con los bloques.
        this.moverLinea(new Date(d.ahora));
      },
      error: () => this.sinConexion.set(true),
    });
  }

  /**
   * Solo la hora, sin los minutos.
   *
   * Con "07:00" en cada columna las etiquetas se tocaban entre sí en cuanto
   * la pantalla no era enorme, y en un eje de horas en punto los dos ceros
   * no aportan nada.
   */
  etiquetaHora(h: number): string {
    return String(h).padStart(2, "0");
  }

  duracion(min: number): string {
    if (min < 60) return `${min} min`;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m ? `${h} h ${m} min` : `${h} h`;
  }

  etiquetaEstadoOrden(e: string): string {
    return (
      {
        RECEIVED: "Recibida",
        DIAGNOSIS: "Diagnóstico",
        IN_PROGRESS: "En proceso",
        WAITING_PARTS: "Espera refacciones",
        READY: "Lista",
      }[e] ?? e
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
    this.titulo.setTitle(
      suc ? `Taller · ${suc} — NexDMS` : `Taller — NexDMS`,
    );
  }

}
