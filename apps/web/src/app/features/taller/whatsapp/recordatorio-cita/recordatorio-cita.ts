import { Component, computed, signal } from "@angular/core";
import { CommonModule } from "@angular/common";

import { CitaRecordatorio, ConfState, RemState } from "../whatsapp.model";

type Tab = "recordatorio" | "confirmacion";

const REM_META: Record<RemState, { label: string; cls: string }> = {
  pendiente: { label: "Pendiente", cls: "p-wait" },
  enviado: { label: "Enviado ✓", cls: "p-sent" },
  entregado: { label: "Entregado ✓✓", cls: "p-sent" },
  leido: { label: "Leído ✓✓", cls: "p-ok" },
  fallido: { label: "Fallido", cls: "p-bad" },
};

const CON_META: Record<ConfState, { label: string; cls: string }> = {
  pendiente: { label: "Pendiente", cls: "p-warn" },
  confirmada: { label: "Confirmada", cls: "p-ok" },
  no_responde: { label: "No responde", cls: "p-wait" },
  no_show: { label: "No-show", cls: "p-bad" },
  cancelada: { label: "Cancelada", cls: "p-bad" },
};

const SEED: CitaRecordatorio[] = [
  { folio: "DEMCT00000020", fecha: "hoy · 15:30", cliente: "Roberto Silva", tel: "477 123 4567", servicio: "Afinación mayor", rem: "pendiente", con: "pendiente", tConf: null },
  { folio: "DEMCT00000021", fecha: "hoy · 17:00", cliente: "María González", tel: "462 118 2233", servicio: "Cambio de frenos", rem: "leido", con: "confirmada", tConf: 12 },
  { folio: "DEMCT00000022", fecha: "mañana · 09:00", cliente: "Auto Bajío S.A.", tel: "477 700 8080", servicio: "Servicio 40 mil", rem: "entregado", con: "no_responde", tConf: null },
  { folio: "DEMCT00000023", fecha: "mañana · 11:30", cliente: "Pedro Ramírez", tel: "415 152 6677", servicio: "Diagnóstico", rem: "fallido", con: "pendiente", tConf: null },
  { folio: "DEMCT00000024", fecha: "mañana · 13:00", cliente: "Ana Torres", tel: "477 889 2211", servicio: "Alineación y balanceo", rem: "enviado", con: "pendiente", tConf: null },
  { folio: "DEMCT00000025", fecha: "mié · 10:00", cliente: "Fernando Nava", tel: "477 340 9012", servicio: "Cambio de aceite", rem: "leido", con: "no_show", tConf: 8 },
];

@Component({
  selector: "app-recordatorio-cita",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./recordatorio-cita.html",
  styleUrls: ["./recordatorio-cita.scss"],
})
export class RecordatorioCita {
  readonly tab = signal<Tab>("recordatorio");
  readonly data = signal<CitaRecordatorio[]>(SEED.map((r) => ({ ...r })));

  setTab(t: Tab): void {
    this.tab.set(t);
  }

  private count(pred: (r: CitaRecordatorio) => boolean): number {
    return this.data().filter(pred).length;
  }

  readonly total = computed(() => this.data().length);

  // Recordatorio
  readonly enviados = computed(() =>
    this.count((r) => ["enviado", "entregado", "leido"].includes(r.rem)),
  );
  readonly entregados = computed(() =>
    this.count((r) => ["entregado", "leido"].includes(r.rem)),
  );
  readonly leidos = computed(() => this.count((r) => r.rem === "leido"));
  readonly pendientesRem = computed(() => this.count((r) => r.rem === "pendiente"));
  readonly fallidos = computed(() => this.count((r) => r.rem === "fallido"));
  readonly cobertura = computed(() =>
    Math.round(((this.total() - this.pendientesRem()) / this.total()) * 100),
  );

  // Confirmación
  readonly confirmadas = computed(() => this.count((r) => r.con === "confirmada"));
  readonly pendientesCon = computed(() => this.count((r) => r.con === "pendiente"));
  readonly noResponden = computed(() => this.count((r) => r.con === "no_responde"));
  readonly noShows = computed(() => this.count((r) => r.con === "no_show"));
  readonly tasaConfirmacion = computed(() =>
    Math.round((this.confirmadas() / this.total()) * 100),
  );
  readonly tiempoProm = computed(() => {
    const t = this.data()
      .filter((r) => r.tConf != null)
      .map((r) => r.tConf as number);
    if (!t.length) return "—";
    return `${Math.round(t.reduce((a, b) => a + b, 0) / t.length)} min`;
  });

  remMeta(s: RemState) {
    return REM_META[s];
  }
  conMeta(s: ConfState) {
    return CON_META[s];
  }
  canSend(r: CitaRecordatorio): boolean {
    return r.rem === "pendiente" || r.rem === "fallido";
  }
  waitingConf(r: CitaRecordatorio): boolean {
    return r.con === "pendiente" || r.con === "no_responde";
  }

  private refresh(): void {
    this.data.set([...this.data()]);
  }

  send(row: CitaRecordatorio): void {
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
      }
    }, 2300);
  }

  sendAll(): void {
    this.data().forEach((r) => {
      if (r.rem === "pendiente") this.send(r);
    });
  }

  /** Simula la respuesta del cliente (el webhook del bot en producción). */
  respond(row: CitaRecordatorio, estado: ConfState): void {
    row.con = estado;
    if (estado === "confirmada") {
      row.tConf = 3 + Math.floor(Math.random() * 40);
    }
    this.refresh();
  }
}
