import { Component, computed, signal } from "@angular/core";
import { CommonModule } from "@angular/common";

import { FeatherIcons } from "../../../shared/components/feather-icons/feather-icons";
import {
  Conversation,
  ConversationState,
  EscalationReason,
  Message,
} from "./conversacion.model";
import { DEMO_CONVERSATIONS } from "./conversaciones.mock";

/** Label and colour for each state. Labels are what the user reads. */
const STATES: Record<ConversationState, { label: string; className: string }> =
  {
    BOT: { label: "Con el asistente", className: "badge-info" },
    WITH_AGENT: { label: "Con asesor", className: "badge-warning" },
    BOOKED: { label: "Cita agendada", className: "badge-success" },
    CANCELLED: { label: "Cancelada", className: "badge-danger" },
    EXPIRED: { label: "Sin respuesta", className: "badge-secondary" },
  };

/** Why a person had to step in. */
const REASONS: Record<EscalationReason, string> = {
  ASKED_FOR_HUMAN: "El cliente pidió hablar con una persona",
  BOT_LOOPED: "El asistente repitió la misma pregunta",
  BOT_WAS_WRONG: "El asistente dio información incorrecta",
};

@Component({
  selector: "app-conversaciones",
  standalone: true,
  imports: [CommonModule, FeatherIcons],
  templateUrl: "./conversaciones.html",
  styleUrls: ["./conversaciones.scss"],
})
export class Conversaciones {
  conversations = signal<Conversation[]>(DEMO_CONVERSATIONS);
  selectedId = signal<string>(DEMO_CONVERSATIONS[0]?.id ?? "");

  selected = computed(
    () => this.conversations().find((c) => c.id === this.selectedId()) ?? null,
  );

  /**
   * How many are waiting on a person.
   *
   * This is the number that matters in the header: the ones somebody at the
   * workshop has to answer now, not the ones the assistant already resolved.
   */
  waitingForAgent = computed(
    () => this.conversations().filter((c) => c.state === "WITH_AGENT").length,
  );

  /** How many a person had to rescue, out of the total. */
  escalated = computed(
    () => this.conversations().filter((c) => c.reason).length,
  );

  select(c: Conversation): void {
    this.selectedId.set(c.id);
  }

  stateLabel(state: ConversationState): string {
    return STATES[state].label;
  }

  stateClass(state: ConversationState): string {
    return STATES[state].className;
  }

  reasonText(reason: EscalationReason): string {
    return REASONS[reason];
  }

  /**
   * `true` on the first message a person wrote.
   *
   * That is where the "so-and-so took over" divider is drawn: it marks the
   * exact point where the assistant stopped being useful.
   */
  isHandoffPoint(conv: Conversation, i: number): boolean {
    if (conv.messages[i]?.author !== "agent") return false;
    return !conv.messages.slice(0, i).some((m) => m.author === "agent");
  }

  /** Last line of the chat, for the list row. */
  lastLine(c: Conversation): string {
    const last = c.messages[c.messages.length - 1];
    if (!last) return "";

    const body = last.text
      ? last.text.replace(/\*/g, "").split("\n")[0]
      : `📷 ${last.attachment?.description ?? "Imagen"}`;

    if (last.author === "customer") return body;
    const who = last.author === "agent" ? last.agentName : "Asistente";
    return `${who}: ${body}`;
  }

  /** Short name for the agent bubble label. */
  authorLabel(m: Message): string {
    return m.agentName ?? "Asesor";
  }

  /**
   * WhatsApp marks bold with `*asterisks*`. The text is escaped before
   * substituting because, even though the content is fixed today, this ends up
   * rendered through `innerHTML`.
   */
  withBold(text: string): string {
    const escaped = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    return escaped.replace(/\*([^*\n]+)\*/g, "<strong>$1</strong>");
  }
}
