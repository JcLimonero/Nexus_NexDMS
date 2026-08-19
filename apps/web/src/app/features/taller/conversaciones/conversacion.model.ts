/**
 * WhatsApp booking conversations.
 *
 * ⚠️ This does NOT reflect what the API does today. The bot running in
 * production (`whatsapp-bot.service.ts`) is a rigid state machine: it sends
 * numbered menus, only understands numbers and `YYYY-MM-DD` dates, ignores
 * images, and has no way to hand the chat over to a person.
 *
 * What is drawn here is where we want to take it: the customer writes the way
 * they speak, sends photos, and when the assistant gets stuck someone from the
 * workshop steps in. It is meant for demoing and discussing the product, not
 * for validating current behaviour.
 */

/** Who wrote the message. */
export type Author =
  /** The customer, from their WhatsApp. */
  | "customer"
  /** The automated assistant. */
  | "bot"
  /** A person from the workshop who took over the conversation. */
  | "agent";

/**
 * Why the assistant stopped answering and a person stepped in.
 *
 * This is the thing most worth measuring: if most chats escalate with
 * `BOT_LOOPED`, the problem is the assistant, not the workload.
 */
export type EscalationReason =
  | "ASKED_FOR_HUMAN"
  | "BOT_LOOPED"
  | "BOT_WAS_WRONG";

/** Where the conversation ended up. */
export type ConversationState =
  /** The assistant is still handling it. */
  | "BOT"
  /** A person took it over and it is still open. */
  | "WITH_AGENT"
  | "BOOKED"
  | "CANCELLED"
  /** The customer stopped replying. */
  | "EXPIRED";

/**
 * An image that travelled through the chat.
 *
 * No file is loaded: the screen draws a box with the description. That is
 * enough to see how the bubble sits when it carries a photo.
 */
export interface Attachment {
  type: "image";
  /** What it shows. Used as the box caption and as alternative text. */
  description: string;
  /** Box aspect ratio, e.g. `"4 / 3"`. Defaults to `4 / 3`. */
  aspectRatio?: string;
}

export interface Message {
  author: Author;
  /** Text exactly as it travels over WhatsApp, with `*bold*` and newlines. */
  text?: string;
  attachment?: Attachment;
  /** Short time for the bubble, e.g. "09:12". */
  time: string;
  /** Who from the workshop wrote it. Only when `author` is `"agent"`. */
  agentName?: string;
}

export interface Conversation {
  id: string;
  /** Customer name, or the phone number when we do not know it yet. */
  name: string;
  /** Already masked: the full number is not kept in the mock. */
  phone: string;
  state: ConversationState;
  /** Relative text ready to render, e.g. "hace 5 min". */
  lastActivity: string;
  /** Why a person stepped in. Only on chats that escalated. */
  reason?: EscalationReason;
  /**
   * Reference of the appointment that came out of this chat, when there was
   * one.
   *
   * Today it is only a label: the bot creates appointments through
   * `createPublic()` and they are stored as `PUBLIC_PORTAL`, so there is still
   * no way to tell in the database which ones arrived over WhatsApp, nor to
   * link them back to their conversation.
   */
  appointmentRef?: string;
  messages: Message[];
}
