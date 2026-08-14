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

import { BranchesService } from "../../features/inventario-refacciones/services/branches.service";
import { MonitorService, UnidadEnTablero } from "./monitor.service";

/**
 * La pantalla que se cuelga en el taller.
 *
 * Se lee de lejos y sin ratón: tipografía grande, sin menús y sin nada que
 * pulsar. Se refresca sola porque nadie va a estar dándole a recargar, y el
 * dato pierde su valor en cuanto envejece unos minutos.
 *
 * La sucursal se toma de la URL (`?branch=`) para poder dejar una pantalla
 * fija por taller sin tener que elegirla cada vez que se enciende el monitor.
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

  /** Cada minuto: el semáforo se mide en minutos, no en segundos. */
  private static readonly REFRESCO_MS = 60_000;
  private temporizador?: ReturnType<typeof setInterval>;

  unidades = signal<UnidadEnTablero[]>([]);
  sucursal = signal<string>("");
  nombreSucursal = signal<string>("");
  actualizado = signal<Date>(new Date());
  sinConexion = signal(false);

  excedidas = computed(
    () => this.unidades().filter((u) => u.semaforo === "excedido").length,
  );
  porVencer = computed(
    () => this.unidades().filter((u) => u.semaforo === "por-vencer").length,
  );

  /**
   * Lo urgente primero: quien mira la pantalla de paso tiene que ver arriba
   * lo que se está pasando de tiempo, no lo que entró primero.
   */
  ordenadas = computed(() => {
    const peso: Record<string, number> = {
      excedido: 0,
      "por-vencer": 1,
      "en-tiempo": 2,
      "sin-empezar": 3,
    };
    return [...this.unidades()].sort(
      (a, b) => peso[a.semaforo] - peso[b.semaforo] || b.retraso - a.retraso,
    );
  });

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
      },
    });
    this.temporizador = setInterval(
      () => this.cargar(),
      MonitorTaller.REFRESCO_MS,
    );
  }

  ngOnDestroy(): void {
    if (this.temporizador) clearInterval(this.temporizador);
  }

  cargar(): void {
    const b = this.sucursal();
    if (!b) return;
    this.srv.tablero(b).subscribe({
      next: (u) => {
        this.unidades.set(u);
        this.actualizado.set(new Date());
        this.sinConexion.set(false);
      },
      // No se vacía la pantalla al fallar: dejar los últimos datos con el
      // aviso de que están viejos es más útil que un tablero en blanco.
      error: () => this.sinConexion.set(true),
    });
  }

  /** Cuánto avanzó la fase respecto a su estimado, tope 100 para la barra. */
  avance(u: UnidadEnTablero): number {
    if (!u.estimadoFase || u.minutosEnFase === null) return 0;
    return Math.min(100, Math.round((u.minutosEnFase / u.estimadoFase) * 100));
  }

  /** `95` → `1 h 35 min`; en minutos sueltos no se lee de lejos. */
  duracion(min: number | null): string {
    if (min === null) return "—";
    if (min < 60) return `${min} min`;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m ? `${h} h ${m} min` : `${h} h`;
  }

  etiquetaEstado(e: string): string {
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
}
