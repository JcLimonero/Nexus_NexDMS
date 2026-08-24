import { Component, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { RouterModule } from "@angular/router";
import { AuthService } from "../../core/auth/auth.service";

/** Solicita el correo de recuperación de contraseña del portal admin. */
@Component({
  selector: "app-recuperar",
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="rc-wrap">
      <div class="rc-card">
        @if (!enviado()) {
          <h1>Recuperar contraseña</h1>
          <p class="rc-sub">Te enviaremos un enlace para crear una nueva contraseña.</p>
          <form (ngSubmit)="enviar()">
            <label class="rc-field">
              <span>Correo</span>
              <input type="email" [ngModel]="email()" (ngModelChange)="email.set($event)" name="email" />
            </label>
            @if (error()) { <p class="rc-err">{{ error() }}</p> }
            <button class="rc-btn" [disabled]="enviando()">{{ enviando() ? "Enviando…" : "Enviar enlace" }}</button>
          </form>
          <a class="rc-link" routerLink="/acceso">Volver</a>
        } @else {
          <div class="rc-emoji">📧</div>
          <h1>Revisa tu correo</h1>
          <p class="rc-sub">Si el correo está registrado, te enviamos un enlace. Vence en 1 hora.</p>
          <a class="rc-btn rc-btn--ghost" routerLink="/acceso">Volver</a>
        }
      </div>
    </div>
  `,
  styleUrls: ["./recuperar.scss"],
})
export class Recuperar {
  private auth = inject(AuthService);
  email = signal("");
  enviando = signal(false);
  enviado = signal(false);
  error = signal<string | null>(null);

  enviar(): void {
    const email = this.email().trim();
    if (!email) {
      this.error.set("Escribe tu correo.");
      return;
    }
    this.error.set(null);
    this.enviando.set(true);
    this.auth.forgotPassword(email).subscribe({
      next: () => {
        this.enviando.set(false);
        this.enviado.set(true);
      },
      error: () => {
        this.enviando.set(false);
        this.enviado.set(true);
      },
    });
  }
}
