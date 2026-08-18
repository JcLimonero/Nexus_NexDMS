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
import {
  Magneto,
  MonitorService,
  Semaforo,
  UnidadEnTablero,
} from "./monitor.service";
import { LineaDeTiempo } from "./linea-de-tiempo";

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
  /** Sigue corriendo; una terminada ya no compite por atención. */
  enCurso: boolean;
  izquierda: number;
  ancho: number;
  /** Fila dentro del carril, para los que se pisan entre sí. */
  nivel: number;
  /** Cuánto del estimado se lleva consumido, tope 100 para la barra. */
  consumido: number;
}

interface CarrilTecnico {
  /** Cuántas filas ocupa; el carril crece con ellas. */
  filas: number;
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

  datos = signal<Magneto | null>(null);
  sucursal = signal<string>("");
  nombreSucursal = signal<string>("");
  /** Para poder cambiar de taller desde la propia pantalla. */
  sucursales = signal<{ id: string; name: string }[]>([]);
  actualizado = signal<Date>(new Date());
  sinConexion = signal(false);
  /** Vista del tablero: por tiempo (magneto) o por estado (columnas). */
  vista = signal<"tiempo" | "estado">("tiempo");
  /** Unidades para la vista por estado (endpoint tablero). */
  unidades = signal<UnidadEnTablero[]>([]);
  /** El eje de horas, compartido con el tablero de citas. */
  readonly eje = new LineaDeTiempo();
  readonly horas = this.eje.horas;
  /** Se relee en cada latido gracias a la señal interna del eje. */
  lineaAhora = computed(() => this.eje.posicionAhora());

  carriles = computed<CarrilTecnico[]>(() => {
    const d = this.datos();
    if (!d) return [];
    return (d.tecnicos ?? []).map((t) => {
      const bloques = this.eje.apilar(
        (t.bloques ?? []).map((b) => this.colocar(b)),
      );
      return {
      filas: bloques.reduce((a, b) => Math.max(a, b.nivel + 1), 1),
      id: t.id,
      nombre: t.nombre,
      iniciales: t.iniciales,
      disponible: t.disponible,
      motivo: t.motivo,
      franjas: (t.ventanas ?? []).map((v) => {
        const izquierda = this.eje.posicionHora(v.inicio);
        return {
          izquierda,
          ancho: Math.max(0, this.eje.posicionHora(v.fin) - izquierda),
        };
      }),
      bloques,
      };
    });
  });

  sinAsignar = computed<BloqueColocado[]>(() =>
    this.eje.apilar((this.datos()?.sinAsignar ?? []).map((b) => this.colocar(b))),
  );

  enEspera = computed(() => this.datos()?.enEspera ?? []);

  /**
   * Lo que hay que atender ahora, no lo que se pasó de tiempo alguna vez.
   *
   * Solo cuenta lo que sigue en curso: una fase ya terminada que tardó de
   * más es un dato del historial, y sumarla dejaba el contador en rojo toda
   * la tarde por trabajos que ya salieron.
   */
  excedidas = computed(
    () =>
      this.carriles()
        .flatMap((c) => c.bloques)
        .concat(this.sinAsignar())
        .filter((b) => b.enCurso && b.semaforo === "excedido").length,
  );

  enPiso = computed(() => {
    const d = this.datos();
    if (!d) return 0;
    const conTrabajo = new Set(
      [
        ...(d.tecnicos ?? []).flatMap((t) => t.bloques ?? []),
        ...(d.sinAsignar ?? []),
      ].map((b) => b.ordenId),
    );
    return conTrabajo.size + (d.enEspera?.length ?? 0);
  });

  private colocar(b: Magneto["sinAsignar"][number]): BloqueColocado {
    const izquierda = this.eje.posicion(new Date(b.inicio));
    // El ancho es lo estimado, no lo transcurrido: el bloque representa el
    // hueco que el trabajo debía ocupar, y el relleno dice cuánto lleva.
    const ancho = this.eje.ancho(izquierda, b.estimadoMin);
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
      enCurso: b.estado === "EN_CURSO",
      // El nivel lo pone `apilar` al conocer el carril completo.
      nivel: 0,
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
      MonitorTaller.REFRESCO_MS,
    );
    // La línea avanza aunque no lleguen datos nuevos: entre refrescos el
    // tiempo sigue corriendo y una línea parada envejece mal.
    this.latido = setInterval(() => this.eje.mover(), MonitorTaller.LATIDO_MS);
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
        this.eje.mover(new Date(d.ahora));
      },
      error: () => this.sinConexion.set(true),
    });
    // Las mismas unidades, pero como lista, para la vista por estado.
    this.srv.tablero(b).subscribe({
      next: (u) => this.unidades.set(u),
    });
  }

  /** Semáforo por estado, como lo pidió Ricardo. Cada unidad cae en uno. */
  readonly ESTADOS = [
    { clave: "rojo", titulo: "Sin mecánico" },
    { clave: "amarillo", titulo: "En reparación" },
    { clave: "naranja", titulo: "Espera refacciones" },
    { clave: "verde", titulo: "Terminada" },
  ] as const;

  tipoEstado(u: UnidadEnTablero): "rojo" | "amarillo" | "naranja" | "verde" {
    if (u.estado === "READY") return "verde";
    if (u.estado === "WAITING_PARTS") return "naranja";
    // Sin nadie trabajándola: es la que hay que atender primero.
    if (!u.responsable) return "rojo";
    return "amarillo";
  }

  /** Las cuatro columnas del tablero por estado, en orden de urgencia. */
  columnas = computed(() => {
    const grupos: Record<string, UnidadEnTablero[]> = {
      rojo: [],
      amarillo: [],
      naranja: [],
      verde: [],
    };
    for (const u of this.unidades()) grupos[this.tipoEstado(u)].push(u);
    return this.ESTADOS.map((e) => ({ ...e, unidades: grupos[e.clave] }));
  });

  cambiarVista(v: "tiempo" | "estado"): void {
    this.vista.set(v);
  }

  /** Días que la unidad lleva en el taller; base de la "vista por días". */
  diasEnTaller(iso: string): number {
    const ms = Date.now() - new Date(iso).getTime();
    return Math.max(0, Math.floor(ms / 86_400_000));
  }

  etiquetaDias(iso: string): string {
    const d = this.diasEnTaller(iso);
    return d === 0 ? "Hoy" : d === 1 ? "1 día" : `${d} días`;
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
