import { Component, computed, signal } from "@angular/core";
import { CommonModule } from "@angular/common";

import {
  Conversation,
  ConvState,
  EscalationReason,
  FlowData,
  Message,
} from "./conversacion.model";
import { DEMO_CONVERSATIONS } from "./conversaciones.mock";

const STATES: Record<ConvState, { label: string; cls: string }> = {
  BOT: { label: "Con el asistente", cls: "p-sent" },
  WITH_AGENT: { label: "Con asesor", cls: "p-warn" },
  BOOKED: { label: "Agendada", cls: "p-ok" },
  LEAD: { label: "Por agendar", cls: "p-warn" },
  CANCELLED: { label: "Cancelada", cls: "p-bad" },
  EXPIRED: { label: "Sin respuesta", cls: "p-wait" },
};

const REASONS: Record<EscalationReason, string> = {
  ASKED_FOR_HUMAN: "El cliente pidió hablar con una persona",
  BOT_LOOPED: "El asistente repitió la misma pregunta",
  BOT_WAS_WRONG: "El asistente dio información incorrecta",
};

const DOWS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const MONS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];
const CAL_TIMES = ["08:00", "09:30", "11:00", "12:30", "16:00", "17:30"];
const CAL_TAKEN = ["11:00"];

interface CalDay {
  key: string;
  dow: string;
  dnum: number;
  mon: string;
  label: string;
}

@Component({
  selector: "app-agente-conversacional",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./agente-conversacional.html",
  styleUrls: ["./agente-conversacional.scss"],
})
export class AgenteConversacional {
  readonly conversations = signal<Conversation[]>(
    DEMO_CONVERSATIONS.map((c) => ({ ...c, messages: [...c.messages] })),
  );
  readonly selectedId = signal<string>(DEMO_CONVERSATIONS[0]?.id ?? "");

  // Estado del calendario de reagendamiento.
  readonly calOpenId = signal<string | null>(null);
  readonly calDate = signal<string | null>(null);
  readonly calTime = signal<string | null>(null);

  readonly selected = computed(
    () => this.conversations().find((c) => c.id === this.selectedId()) ?? null,
  );

  readonly total = computed(() => this.conversations().length);
  readonly nuevos = computed(
    () => this.conversations().filter((c) => c.nuevo).length,
  );
  readonly agendoBot = computed(
    () =>
      this.conversations().filter((c) => c.state === "BOOKED" && !c.reason)
        .length,
  );
  readonly escalated = computed(
    () => this.conversations().filter((c) => c.reason).length,
  );
  readonly waitingForAgent = computed(
    () => this.conversations().filter((c) => c.state === "WITH_AGENT").length,
  );

  select(c: Conversation): void {
    this.selectedId.set(c.id);
    this.closeCal();
  }

  stateMeta(state: ConvState) {
    return STATES[state];
  }
  reasonText(reason: EscalationReason): string {
    return REASONS[reason];
  }
  canManage(c: Conversation): boolean {
    return !!c.appointmentRef && c.state !== "CANCELLED";
  }

  /** `true` en el primer mensaje que escribió una persona (línea de traspaso). */
  isHandoffPoint(conv: Conversation, i: number): boolean {
    if (conv.messages[i]?.author !== "agent") return false;
    return !conv.messages.slice(0, i).some((m) => m.author === "agent");
  }

  authorLabel(m: Message): string {
    return m.agentName ?? "Asesor";
  }

  lastLine(c: Conversation): string {
    for (let i = c.messages.length - 1; i >= 0; i--) {
      const m = c.messages[i];
      if (m.text) return m.text.replace(/\*/g, "").split("\n")[0];
      if (m.attachment) return `📷 ${m.attachment.description}`;
      if (m.flow) return "📅 Formulario para agendar";
      if (m.detail) return "📋 Detalle de la cita confirmada";
    }
    return "";
  }

  /** WhatsApp marca negritas con `*asteriscos*`. Se escapa antes de sustituir. */
  withBold(text: string): string {
    const escaped = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    return escaped.replace(/\*([^*\n]+)\*/g, "<strong>$1</strong>");
  }

  // ── Hoja del WhatsApp Flow (calendario nativo) ───────────
  flowMonthLabel(f: FlowData): string {
    return `${MONS[f.month]} ${f.year}`;
  }
  /** Celdas del mes: `null` para los huecos iniciales. */
  flowCells(f: FlowData): (number | null)[] {
    const first = new Date(f.year, f.month, 1).getDay();
    const days = new Date(f.year, f.month + 1, 0).getDate();
    const cells: (number | null)[] = [];
    for (let i = 0; i < first; i++) cells.push(null);
    for (let n = 1; n <= days; n++) cells.push(n);
    return cells;
  }
  readonly dow = DOWS.map((d) => d[0].toUpperCase());

  // ── Calendario de reagendamiento ─────────────────────────
  readonly calDays = computed<CalDay[]>(() => {
    const out: CalDay[] = [];
    const d = new Date();
    d.setDate(d.getDate() + 1);
    while (out.length < 8) {
      if (d.getDay() !== 0) {
        out.push({
          key: `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`,
          dow: DOWS[d.getDay()],
          dnum: d.getDate(),
          mon: MONS[d.getMonth()].slice(0, 3),
          label: `${DOWS[d.getDay()]} ${d.getDate()} de ${MONS[d.getMonth()]}`,
        });
      }
      d.setDate(d.getDate() + 1);
    }
    return out;
  });
  readonly calTimes = CAL_TIMES;
  isTaken(t: string): boolean {
    return CAL_TAKEN.includes(t);
  }
  readonly calReady = computed(() => !!this.calDate() && !!this.calTime());

  openCal(id: string): void {
    this.calOpenId.set(id);
    this.calDate.set(null);
    this.calTime.set(null);
  }
  closeCal(): void {
    this.calOpenId.set(null);
  }
  pickDate(key: string): void {
    this.calDate.set(key);
  }
  pickTime(t: string): void {
    if (!this.isTaken(t)) this.calTime.set(t);
  }

  private now(): string {
    return new Date().toLocaleTimeString("es-MX", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  private mutate(id: string, fn: (c: Conversation) => void): void {
    const list = this.conversations().map((c) => {
      if (c.id !== id) return c;
      const copy = { ...c, messages: [...c.messages] };
      fn(copy);
      return copy;
    });
    this.conversations.set(list);
  }

  confirmReschedule(): void {
    const id = this.calOpenId();
    const date = this.calDate();
    const time = this.calTime();
    if (!id || !date || !time) return;
    const day = this.calDays().find((d) => d.key === date);
    const labelDay = day ? day.label : date;
    const h = this.now();
    this.mutate(id, (c) => {
      c.messages.push({
        author: "agent",
        agentName: "Asistente",
        text: `✅ Su cita ha sido *reprogramada*:\n\n• Nueva fecha: *${labelDay} · ${time}*\n• Sucursal Pachuca\n\nLe enviaremos un recordatorio un día antes. Quedo a sus órdenes.`,
        time: h,
      });
      c.messages.push({ author: "customer", text: "Perfecto, muchas gracias.", time: h });
      c.state = "BOOKED";
      c.reason = undefined;
      c.lastActivity = "ahora";
    });
    this.closeCal();
  }

  cancelAppointment(id: string): void {
    const h = this.now();
    this.mutate(id, (c) => {
      c.messages.push({
        author: "agent",
        agentName: "Asistente",
        text: "Su cita ha sido *cancelada* como lo solicitó. Cuando guste reagendar, con gusto le comparto las fechas y horarios disponibles. Que tenga buen día.",
        time: h,
      });
      c.state = "CANCELLED";
      c.reason = undefined;
      c.lastActivity = "ahora";
    });
    this.closeCal();
  }
}
