import { CommonModule } from "@angular/common";
import { HttpErrorResponse } from "@angular/common/http";
import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
  viewChild,
} from "@angular/core";
import { FormsModule } from "@angular/forms";

import { ToastrService } from "ngx-toastr";

import {
  ConversationDetail,
  ConversationErrorCode,
  ConversationState,
  ConversationSummary,
  EscalationReason,
  Message,
} from "./conversacion.model";
import { ConversacionesService } from "./conversaciones.service";
import { AuthService } from "../../../auth/auth.service";
import { FeatherIcons } from "../../../shared/components/feather-icons/feather-icons";

/** Etiqueta y color de cada estado. La etiqueta es lo que lee la persona. */
const STATES: Record<ConversationState, { label: string; className: string }> =
  {
    BOT: { label: "Con el asistente", className: "badge-info" },
    WITH_AGENT: { label: "Con asesor", className: "badge-warning" },
    BOOKED: { label: "Cita agendada", className: "badge-success" },
    CANCELLED: { label: "Cancelada", className: "badge-danger" },
    EXPIRED: { label: "Sin respuesta", className: "badge-secondary" },
  };

/** Por qué tuvo que entrar una persona. */
const REASONS: Record<EscalationReason, string> = {
  ASKED_FOR_HUMAN: "El cliente pidió hablar con una persona",
  BOT_LOOPED: "El asistente repitió la misma pregunta",
  BOT_WAS_WRONG: "El asistente dio información incorrecta",
};

/**
 * Cada cuánto se vuelve a preguntar por la bandeja.
 *
 * Es un chat: quince segundos es lo más tarde que alguien acepta enterarse de
 * que le escribieron. Cuando haya empuje del servidor esto se va (fase D5 del
 * plan); mientras tanto, sondear es honesto y no rompe nada.
 */
const POLL_MS = 15_000;

@Component({
  selector: "app-conversaciones",
  standalone: true,
  imports: [CommonModule, FormsModule, FeatherIcons],
  templateUrl: "./conversaciones.html",
  styleUrls: ["./conversaciones.scss"],
})
export class Conversaciones implements OnInit, OnDestroy {
  private api = inject(ConversacionesService);
  private auth = inject(AuthService);
  private toastr = inject(ToastrService);

  private thread = viewChild<ElementRef<HTMLElement>>("thread");

  conversations = signal<ConversationSummary[]>([]);
  selectedId = signal<string | null>(null);
  detail = signal<ConversationDetail | null>(null);

  loading = signal(true);
  loadError = signal<string | null>(null);
  detailLoading = signal(false);
  sending = signal(false);
  working = signal(false);

  /** Cuántas esperan a que alguien conteste, en toda la sucursal. */
  waitingForAgent = signal(0);

  /** Lo escrito para la conversación abierta, todavía sin mandar. */
  borrador = signal("");

  /** Quién soy, para saber si la conversación abierta es mía. */
  private readonly myUserId = signal<string | null>(null);

  esMia = computed(() => {
    const d = this.detail();
    return !!d && d.assignedTo?.id === this.myUserId();
  });

  private pollId: ReturnType<typeof setInterval> | null = null;
  private lastMessageCount = 0;

  ngOnInit(): void {
    this.myUserId.set(this.auth.getUser()?.id ?? null);
    this.cargarLista(true);
    this.pollId = setInterval(() => this.refrescar(), POLL_MS);
  }

  ngOnDestroy(): void {
    if (this.pollId) clearInterval(this.pollId);
  }

  // ─── Carga ───────────────────────────────────────

  private cargarLista(primeraVez = false): void {
    if (primeraVez) this.loading.set(true);

    this.api.list({ limit: 50 }).subscribe({
      next: (res) => {
        this.conversations.set(res.data);
        this.loading.set(false);
        this.loadError.set(null);

        // Si no hay ninguna abierta, se abre la primera: la pantalla sin nada
        // seleccionado no le sirve a nadie.
        if (!this.selectedId() && res.data.length) {
          this.select(res.data[0]);
        }
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.loadError.set(
          err?.error?.message ?? "No se pudieron cargar las conversaciones",
        );
      },
    });

    // Cuenta real, no la de la página cargada: se pide sólo el total.
    this.api.list({ state: "WITH_AGENT", limit: 1 }).subscribe({
      next: (res) => this.waitingForAgent.set(res.meta.total),
    });
  }

  /** Sondeo: refresca sin parpadear ni pisar lo que la persona está viendo. */
  private refrescar(): void {
    this.cargarLista();
    const id = this.selectedId();
    if (id) this.cargarDetalle(id, true);
  }

  private cargarDetalle(id: string, silencioso = false): void {
    if (!silencioso) this.detailLoading.set(true);

    this.api.get(id).subscribe({
      next: (d) => {
        this.detail.set(d);
        this.detailLoading.set(false);
        this.bajarSiHayNuevos(d.messages.length);
        if (d.unreadCount > 0) this.marcarLeido(id);
      },
      error: (err: HttpErrorResponse) => {
        this.detailLoading.set(false);
        if (!silencioso) {
          this.toastr.error(
            err?.error?.message ?? "No se pudo abrir la conversación",
          );
        }
      },
    });
  }

  select(c: ConversationSummary): void {
    if (this.selectedId() === c.id) return;
    this.selectedId.set(c.id);
    this.detail.set(null);
    // Un borrador de un cliente no tiene por qué aparecer bajo el de otro.
    this.borrador.set("");
    this.lastMessageCount = 0;
    this.cargarDetalle(c.id);
  }

  private marcarLeido(id: string): void {
    this.api.markRead(id).subscribe({
      next: () => {
        this.conversations.update((list) =>
          list.map((c) => (c.id === id ? { ...c, unreadCount: 0 } : c)),
        );
      },
      // Que falle no le cambia la vida a nadie: se reintenta al siguiente
      // sondeo y mientras tanto el contador se queda como estaba.
      error: () => undefined,
    });
  }

  // ─── Acciones ────────────────────────────────────

  /**
   * El asesor entra a una conversación que atiende el asistente.
   *
   * A partir de aquí el bot se calla —lo impide el servidor, no la pantalla— y
   * aparece la caja para responder.
   */
  tomarConversacion(id: string): void {
    if (this.working()) return;
    this.working.set(true);

    this.api.take(id).subscribe({
      next: (d) => {
        this.detail.set(d);
        this.working.set(false);
        this.toastr.success("Tomaste la conversación");
        this.cargarLista();
      },
      error: (err: HttpErrorResponse) => {
        this.working.set(false);
        this.avisarError(err, id);
      },
    });
  }

  soltarConversacion(id: string): void {
    if (this.working()) return;
    this.working.set(true);

    this.api.release(id).subscribe({
      next: (d) => {
        this.detail.set(d);
        this.working.set(false);
        this.toastr.info("La conversación volvió con el asistente");
        this.cargarLista();
      },
      error: (err: HttpErrorResponse) => {
        this.working.set(false);
        this.avisarError(err, id);
      },
    });
  }

  enviarMensaje(id: string): void {
    const texto = this.borrador().trim();
    if (!texto || this.sending()) return;
    this.sending.set(true);

    this.api.sendMessage(id, texto).subscribe({
      next: (m) => {
        // Se agrega el que devolvió el servidor, no el que se escribió: sólo
        // aparece en el chat lo que WhatsApp aceptó de verdad.
        this.detail.update((d) =>
          d ? { ...d, messages: [...d.messages, m] } : d,
        );
        this.borrador.set("");
        this.sending.set(false);
        this.bajarSiHayNuevos((this.detail()?.messages.length ?? 0) + 1);
        this.cargarLista();
      },
      error: (err: HttpErrorResponse) => {
        this.sending.set(false);
        this.avisarError(err, id);
      },
    });
  }

  /** Enter manda, como en WhatsApp; Shift+Enter sigue partiendo la línea. */
  onComposerKeydown(ev: KeyboardEvent, id: string): void {
    if (ev.key === "Enter" && !ev.shiftKey) {
      ev.preventDefault();
      this.enviarMensaje(id);
    }
  }

  /**
   * Traduce el rechazo del API a algo accionable.
   *
   * El servidor manda `code` además del mensaje justo para esto: si la ventana
   * se venció o alguien más la tomó, la pantalla está desactualizada y hay que
   * recargarla, no sólo enseñar un error.
   */
  private avisarError(err: HttpErrorResponse, id: string): void {
    const code = err?.error?.code as ConversationErrorCode | undefined;
    const mensaje = err?.error?.message ?? "No se pudo completar la acción";

    this.toastr.error(mensaje);

    if (
      code === "WINDOW_CLOSED" ||
      code === "ALREADY_TAKEN" ||
      code === "NOT_TAKEN" ||
      code === "NOT_TAKEABLE"
    ) {
      this.cargarDetalle(id, true);
      this.cargarLista();
    }
  }

  // ─── Presentación ────────────────────────────────

  stateLabel(state: ConversationState): string {
    return STATES[state].label;
  }

  stateClass(state: ConversationState): string {
    return STATES[state].className;
  }

  reasonText(reason: EscalationReason): string {
    return REASONS[reason];
  }

  /** La clase de la burbuja va en minúsculas; el autor viene en mayúsculas. */
  authorClass(m: Message): string {
    return m.author.toLowerCase();
  }

  /** Nombre corto para la etiqueta de la burbuja del asesor. */
  authorLabel(m: Message): string {
    return m.agentName ?? "Asesor";
  }

  /**
   * `true` en el primer mensaje que escribió una persona.
   *
   * Ahí se dibuja el separador de "fulano tomó la conversación": marca el
   * punto exacto en que el asistente dejó de ser suficiente.
   */
  isHandoffPoint(messages: Message[], i: number): boolean {
    if (messages[i]?.author !== "AGENT") return false;
    return !messages.slice(0, i).some((m) => m.author === "AGENT");
  }

  /** Hora corta para la burbuja. */
  hora(iso: string): string {
    return new Date(iso).toLocaleTimeString("es-MX", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  /**
   * "hace 5 min", calculado en la pantalla.
   *
   * El servidor manda la fecha en ISO a propósito: un relativo calculado allá
   * nace viejo y se queda escrito mientras esta pantalla sigue abierta.
   */
  desde(iso: string): string {
    const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (min < 1) return "justo ahora";
    if (min < 60) return `hace ${min} min`;
    const horas = Math.floor(min / 60);
    if (horas < 24) return `hace ${horas} h`;
    const dias = Math.floor(horas / 24);
    return dias === 1 ? "ayer" : `hace ${dias} días`;
  }

  /** Por qué no se puede escribir ahora mismo. */
  motivoSinRespuesta(d: ConversationDetail): string {
    if (!d.canReplyFreeText) {
      return (
        "Pasaron más de 24 horas desde el último mensaje del cliente. " +
        "WhatsApp ya no permite responder con texto libre."
      );
    }
    if (d.assignedTo && !this.esMia()) {
      return `${d.assignedTo.name} está atendiendo esta conversación.`;
    }
    return "";
  }

  /**
   * WhatsApp marca negritas con `*asteriscos*`. El texto se escapa antes de
   * sustituir porque termina pintándose con `innerHTML`, y ahora sí viene de
   * fuera: lo escribe el cliente.
   */
  withBold(text: string): string {
    const escaped = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    return escaped.replace(/\*([^*\n]+)\*/g, "<strong>$1</strong>");
  }

  /** Baja el hilo al final cuando llegaron mensajes nuevos, no en cada sondeo. */
  private bajarSiHayNuevos(total: number): void {
    if (total <= this.lastMessageCount) return;
    this.lastMessageCount = total;
    queueMicrotask(() => {
      const el = this.thread()?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }
}
