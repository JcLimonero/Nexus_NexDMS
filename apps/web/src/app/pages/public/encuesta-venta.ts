import { Component, OnInit, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { HttpClient } from "@angular/common/http";
import { ActivatedRoute } from "@angular/router";

interface PublicQuestion {
  id: string;
  label: string;
  type: "RATING" | "TEXT";
}

/** Página pública (sin login): encuesta de satisfacción post-venta. */
@Component({
  selector: "app-encuesta-venta",
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="sv-wrap">
      <div class="sv-card">
        @if (loading()) {
          <p>Cargando…</p>
        } @else if (error()) {
          <p class="sv-error">{{ error() }}</p>
        } @else if (done() || answered()) {
          <div class="sv-thanks">
            <div class="sv-check">✓</div>
            <h3>{{ thanks() || "¡Gracias por tu opinión!" }}</h3>
          </div>
        } @else {
          <h3 class="sv-title">Encuesta de satisfacción</h3>
          @if (intro()) { <p class="sv-intro">{{ intro() }}</p> }

          @for (q of questions(); track q.id) {
            <div class="sv-q">
              <label class="sv-label">{{ q.label }}</label>
              @if (q.type === "RATING") {
                <div class="sv-stars">
                  @for (n of [1,2,3,4,5]; track n) {
                    <button
                      type="button"
                      class="sv-star"
                      [class.on]="+(answers[q.id] || 0) >= n"
                      (click)="answers[q.id] = n"
                    >★</button>
                  }
                </div>
              } @else {
                <textarea class="sv-text" rows="2" [(ngModel)]="answers[q.id]"></textarea>
              }
            </div>
          }

          <button class="sv-submit" [disabled]="saving() || !completo()" (click)="submit()">
            {{ saving() ? "Enviando…" : "Enviar" }}
          </button>
        }
      </div>
    </div>
  `,
  styles: [
    `
      .sv-wrap {
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #f1f5f9;
        padding: 24px;
      }
      .sv-card {
        background: #fff;
        border-radius: 16px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
        padding: 28px;
        width: min(520px, 100%);
      }
      .sv-title { margin: 0 0 6px; font-size: 22px; }
      .sv-intro { color: #64748b; margin: 0 0 20px; }
      .sv-q { margin-bottom: 18px; }
      .sv-label { display: block; font-weight: 600; margin-bottom: 8px; }
      .sv-stars { display: flex; gap: 6px; }
      .sv-star {
        background: none;
        border: none;
        font-size: 30px;
        line-height: 1;
        color: #cbd5e1;
        cursor: pointer;
        padding: 0;
      }
      .sv-star.on { color: #f59e0b; }
      .sv-text {
        width: 100%;
        border: 1px solid #cbd5e1;
        border-radius: 8px;
        padding: 8px;
      }
      .sv-submit {
        width: 100%;
        margin-top: 8px;
        padding: 12px;
        border: none;
        border-radius: 10px;
        background: #2563eb;
        color: #fff;
        font-weight: 600;
        cursor: pointer;
      }
      .sv-submit:disabled { opacity: 0.5; cursor: default; }
      .sv-thanks { text-align: center; padding: 20px 0; }
      .sv-check {
        width: 64px;
        height: 64px;
        border-radius: 50%;
        background: #16a34a;
        color: #fff;
        font-size: 34px;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 16px;
      }
      .sv-error { color: #dc2626; }
    `,
  ],
})
export class EncuestaVenta implements OnInit {
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);

  private token = "";
  loading = signal(true);
  error = signal<string | null>(null);
  intro = signal<string | null>(null);
  thanks = signal<string | null>(null);
  questions = signal<PublicQuestion[]>([]);
  answered = signal(false);
  done = signal(false);
  saving = signal(false);

  answers: Record<string, number | string> = {};

  ngOnInit(): void {
    this.token = this.route.snapshot.paramMap.get("token") ?? "";
    this.http
      .get<{
        intro: string | null;
        thanks: string | null;
        questions: PublicQuestion[];
        answered: boolean;
      }>(`/api/v1/public/sale-surveys/${this.token}`)
      .subscribe({
        next: (d) => {
          this.intro.set(d.intro);
          this.thanks.set(d.thanks);
          this.questions.set(d.questions);
          this.answered.set(d.answered);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.error.set("No encontramos esta encuesta. Verifica el link.");
        },
      });
  }

  completo(): boolean {
    return this.questions()
      .filter((q) => q.type === "RATING")
      .every((q) => Number(this.answers[q.id]) > 0);
  }

  submit(): void {
    if (this.saving() || !this.completo()) return;
    this.saving.set(true);
    this.http
      .post<{ ok: boolean; thanks: string | null }>(
        `/api/v1/public/sale-surveys/${this.token}`,
        { answers: this.answers },
      )
      .subscribe({
        next: (r) => {
          this.thanks.set(r.thanks);
          this.done.set(true);
          this.saving.set(false);
        },
        error: () => {
          this.saving.set(false);
          this.error.set("No se pudo enviar. Intenta de nuevo.");
        },
      });
  }
}
