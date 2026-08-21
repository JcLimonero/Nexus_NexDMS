import { HttpClient } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";

import { Observable } from "rxjs";

import {
  ConversationDetail,
  ConversationState,
  ConversationSummary,
  Message,
} from "./conversacion.model";

const URL = "/api/v1/whatsapp/conversations";

interface Paginated<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface ConversationFilters {
  state?: ConversationState;
  q?: string;
  page?: number;
  limit?: number;
  /** Sólo las que tuvieron que escalar (`escalation_reason` no nulo). */
  escalated?: boolean;
}

@Injectable({ providedIn: "root" })
export class ConversacionesService {
  private http = inject(HttpClient);

  list(
    filters: ConversationFilters = {},
  ): Observable<Paginated<ConversationSummary>> {
    const params = new URLSearchParams();
    if (filters.state) params.set("state", filters.state);
    if (filters.q?.trim()) params.set("q", filters.q.trim());
    if (filters.page) params.set("page", String(filters.page));
    if (filters.limit) params.set("limit", String(filters.limit));
    if (filters.escalated) params.set("escalated", "true");
    const qs = params.toString();
    return this.http.get<Paginated<ConversationSummary>>(
      qs ? `${URL}?${qs}` : URL,
    );
  }

  get(id: string): Observable<ConversationDetail> {
    return this.http.get<ConversationDetail>(`${URL}/${id}`);
  }

  /** El asesor entra a la conversación; el asistente deja de contestar. */
  take(id: string): Observable<ConversationDetail> {
    return this.http.post<ConversationDetail>(`${URL}/${id}/take`, {});
  }

  /** La suelta y la devuelve al asistente. */
  release(id: string): Observable<ConversationDetail> {
    return this.http.post<ConversationDetail>(`${URL}/${id}/release`, {});
  }

  sendMessage(id: string, text: string): Observable<Message> {
    return this.http.post<Message>(`${URL}/${id}/messages`, { text });
  }

  markRead(id: string): Observable<void> {
    return this.http.post<void>(`${URL}/${id}/read`, {});
  }
}
