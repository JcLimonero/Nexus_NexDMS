import { Component, computed, signal } from "@angular/core";
import { CommonModule } from "@angular/common";

import { RemState, ServResult, ServicioPendiente } from "../whatsapp.model";

const REM_META: Record<RemState, { label: string; cls: string }> = {
  pendiente: { label: "Pendiente", cls: "p-wait" },
  enviado: { label: "Enviado ✓", cls: "p-sent" },
  entregado: { label: "Entregado ✓✓", cls: "p-sent" },
  leido: { label: "Leído ✓✓", cls: "p-ok" },
  fallido: { label: "Fallido", cls: "p-bad" },
};

const SEED: ServicioPendiente[] = [
  { folio: "DEMCT00000010", cliente: "Jorge Medina", tel: "771 245 8890", vehiculo: "Jetta 2021", motivo: "Alcanzó 40,000 km", rem: "leido", res: "agendo" },
  { folio: "DEMCT00000011", cliente: "Verónica Salas", tel: "771 660 1122", vehiculo: "CR-V 2020", motivo: "Última visita hace 6 meses", rem: "entregado", res: "pendiente" },
  { folio: "DEMCT00000012", cliente: "Distribuidora Lom", tel: "771 330 4455", vehiculo: "Hilux · flotilla", motivo: "Alcanzó 60,000 km", rem: "leido", res: "no_resp" },
  { folio: "DEMCT00000013", cliente: "Héctor Peña", tel: "771 812 7788", vehiculo: "Civic 2022", motivo: "Alcanzó 20,000 km", rem: "fallido", res: "pendiente" },
  { folio: "DEMCT00000014", cliente: "Lucía Ferrer", tel: "771 907 5533", vehiculo: "HR-V 2019", motivo: "Última visita hace 8 meses", rem: "pendiente", res: "pendiente" },
];

@Component({
  selector: "app-servicios-pendientes",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./servicios-pendientes.html",
  styleUrls: ["./servicios-pendientes.scss"],
})
export class ServiciosPendientes {
  readonly data = signal<ServicioPendiente[]>(
    SEED.map((r) => ({ ...r })),
  );

  private count(pred: (r: ServicioPendiente) => boolean): number {
    return this.data().filter(pred).length;
  }

  readonly total = computed(() => this.data().length);
  readonly enviados = computed(() =>
    this.count((r) => ["enviado", "entregado", "leido"].includes(r.rem)),
  );
  readonly leidos = computed(() => this.count((r) => r.rem === "leido"));
  readonly agendaron = computed(() => this.count((r) => r.res === "agendo"));
  readonly sinRespuesta = computed(() => this.count((r) => r.res === "no_resp"));
  readonly pendientes = computed(() => this.count((r) => r.rem === "pendiente"));
  readonly cobertura = computed(() =>
    Math.round(((this.total() - this.pendientes()) / this.total()) * 100),
  );

  remMeta(s: RemState) {
    return REM_META[s];
  }
  canSend(r: ServicioPendiente): boolean {
    return r.rem === "pendiente" || r.rem === "fallido";
  }
  resPill(res: ServResult): { label: string; cls: string } | null {
    if (res === "agendo") return { label: "Agendó ✅", cls: "p-ok" };
    if (res === "no_resp") return { label: "Sin respuesta", cls: "p-wait" };
    return null;
  }

  private refresh(): void {
    this.data.set([...this.data()]);
  }

  /** Envía el recordatorio y simula los recibos (enviado → entregado → leído). */
  send(row: ServicioPendiente): void {
    row.rem = "enviado";
    this.refresh();
    setTimeout(() => {
      if (row.rem === "enviado") {
        row.rem = "entregado";
        this.refresh();
      }
    }, 1100);
    setTimeout(() => {
      if (row.rem === "entregado") {
        row.rem = "leido";
        this.refresh();
        if (row.res === "pendiente") {
          setTimeout(() => {
            row.res = Math.random() < 0.7 ? "agendo" : "no_resp";
            this.refresh();
          }, 1300);
        }
      }
    }, 2300);
  }

  sendAll(): void {
    this.data().forEach((r) => {
      if (r.rem === "pendiente") this.send(r);
    });
  }
}
