import { Component, OnInit, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { HttpClient } from "@angular/common/http";
import { ActivatedRoute } from "@angular/router";

/** Página pública (sin login): encuesta de satisfacción post-servicio. */
@Component({
  selector: "app-encuesta-publica",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./encuesta-publica.html",
  styleUrls: ["./public-pages.scss"],
})
export class EncuestaPublica implements OnInit {
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);

  private token = "";
  loading = signal(true);
  error = signal<string | null>(null);
  folio = signal<string | null>(null);
  answered = signal(false);
  sent = signal(false);
  saving = signal(false);

  score = signal(0);
  comment = "";

  ngOnInit(): void {
    this.token = this.route.snapshot.paramMap.get("token") ?? "";
    this.http
      .get<{ folio: string | null; answered: boolean }>(
        `/api/v1/public/surveys/${this.token}`,
      )
      .subscribe({
        next: (d) => {
          this.folio.set(d.folio);
          this.answered.set(d.answered);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.error.set("No encontramos esta encuesta. Verifica el link.");
        },
      });
  }

  setScore(n: number): void {
    if (!this.answered() && !this.sent()) this.score.set(n);
  }

  submit(): void {
    if (this.score() < 1 || this.saving()) return;
    this.saving.set(true);
    this.http
      .post(`/api/v1/public/surveys/${this.token}`, {
        score: this.score(),
        comment: this.comment.trim() || undefined,
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.sent.set(true);
        },
        error: (err) => {
          this.saving.set(false);
          this.error.set(
            err?.error?.message || "No pudimos guardar tu respuesta.",
          );
        },
      });
  }
}
