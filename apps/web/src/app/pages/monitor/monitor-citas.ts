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
import { CitaDelDia, MonitorService } from "./monitor.service";

/**
 * Las citas de hoy, para colgar junto a la recepción.
 *
 * Misma regla que el tablero del taller: se lee de lejos, se refresca sola y
 * la sucursal viene en la URL para dejar la pantalla fija.
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

  private static readonly REFRESCO_MS = 60_000;
  private temporizador?: ReturnType<typeof setInterval>;

  citas = signal<CitaDelDia[]>([]);
  sucursal = signal<string>("");
  nombreSucursal = signal<string>("");
  actualizado = signal<Date>(new Date());
  sinConexion = signal(false);

  /** Las que ya no se esperan: llegaron, se cancelaron o no se presentaron. */
  private cerrada(c: CitaDelDia): boolean {
    return ["ARRIVED", "IN_SERVICE", "COMPLETED", "CANCELLED", "NO_SHOW"].includes(
      c.status,
    );
  }

  pendientes = computed(
    () => this.citas().filter((c) => !this.cerrada(c)).length,
  );
  llegadas = computed(
    () =>
      this.citas().filter((c) =>
        ["ARRIVED", "IN_SERVICE", "COMPLETED"].includes(c.status),
      ).length,
  );

  /** Por hora: es una agenda, y cualquier otro orden obliga a buscar. */
  ordenadas = computed(() =>
    [...this.citas()].sort((a, b) =>
      a.scheduledAt.localeCompare(b.scheduledAt),
    ),
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
      MonitorCitas.REFRESCO_MS,
    );
  }

  ngOnDestroy(): void {
    if (this.temporizador) clearInterval(this.temporizador);
  }

  private hoy(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  cargar(): void {
    const b = this.sucursal();
    if (!b) return;
    this.srv.citasDelDia(b, this.hoy()).subscribe({
      next: (c) => {
        this.citas.set(c ?? []);
        this.actualizado.set(new Date());
        this.sinConexion.set(false);
      },
      error: () => this.sinConexion.set(true),
    });
  }

  llego(c: CitaDelDia): boolean {
    return ["ARRIVED", "IN_SERVICE", "COMPLETED"].includes(c.status);
  }

  /** Pasó su hora y sigue esperándose: es lo que hay que mirar. */
  tarde(c: CitaDelDia): boolean {
    if (this.cerrada(c)) return false;
    return new Date(c.scheduledAt) < new Date();
  }

  etiquetaEstado(c: CitaDelDia): string {
    return (
      {
        SCHEDULED: this.tarde(c) ? "no ha llegado" : "esperada",
        CONFIRMED: this.tarde(c) ? "no ha llegado" : "confirmada",
        ARRIVED: "llegó",
        IN_SERVICE: "en servicio",
        COMPLETED: "terminada",
        CANCELLED: "cancelada",
        NO_SHOW: "no se presentó",
      }[c.status] ?? c.status
    );
  }
}
