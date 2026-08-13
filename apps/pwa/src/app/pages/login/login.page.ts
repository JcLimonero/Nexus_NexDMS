import { Component, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";
import { AuthService } from "../../core/auth.service";

@Component({
  selector: "app-login-page",
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="login-wrap">
      <div class="login-card">
        <div class="brand">
          <span class="brand-mark">N</span>
          <div>
            <div class="brand-name">NexDMS</div>
            <div class="brand-sub">Mecánico</div>
          </div>
        </div>
        <h1>Iniciar sesión</h1>
        <p class="hint">Ingresa con tu cuenta de taller</p>

        <label>Correo electrónico</label>
        <input
          type="email"
          [(ngModel)]="email"
          placeholder="tu@taller.com"
          autocomplete="username"
        />

        <label>Contraseña</label>
        <input
          type="password"
          [(ngModel)]="password"
          placeholder="••••••••"
          autocomplete="current-password"
          (keyup.enter)="submit()"
        />

        @if (error()) {
          <div class="error">{{ error() }}</div>
        }

        <button class="btn-primary" [disabled]="loading()" (click)="submit()">
          {{ loading() ? "Entrando…" : "Entrar" }}
        </button>
      </div>
    </div>
  `,
  styles: [
    `
      .login-wrap {
        min-height: 100dvh;
        display: flex;
        align-items: center;
        justify-content: center;
        background: linear-gradient(to bottom, var(--navy-600), var(--navy-800));
        padding: 16px;
      }
      .login-card {
        width: 100%;
        max-width: 380px;
        background: #fff;
        border-radius: 12px;
        padding: 28px 24px;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3);
      }
      .brand {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 20px;
      }
      .brand-mark {
        width: 40px;
        height: 40px;
        border-radius: var(--radius-md);
        background: linear-gradient(to bottom right, var(--nexus-500), var(--nexus-700));
        color: #fff;
        font-weight: 700;
        font-size: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .brand-name {
        font-weight: 700;
        color: var(--navy-600);
      }
      .brand-sub {
        font-size: 12px;
        color: var(--text-secondary);
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }
      h1 {
        font-size: 22px;
        font-weight: 600;
        color: var(--navy-600);
        margin: 0 0 4px;
      }
      .hint {
        font-size: 14px;
        color: var(--text-secondary);
        margin: 0 0 20px;
      }
      label {
        display: block;
        font-size: 13px;
        font-weight: 500;
        color: var(--text-secondary);
        margin: 12px 0 6px;
      }
      input {
        width: 100%;
        box-sizing: border-box;
        padding: 12px;
        font-size: 16px;
        border: 1px solid var(--border);
        border-radius: 8px;
      }
      input:focus {
        outline: none;
        border-color: var(--primary);
        box-shadow: 0 0 0 2px rgba(16, 80, 120, 0.25);
      }
      .error {
        margin-top: 12px;
        padding: 10px 12px;
        border-radius: 8px;
        background: var(--danger-bg);
        color: var(--danger);
        font-size: 13px;
      }
      .btn-primary {
        width: 100%;
        margin-top: 20px;
        padding: 13px;
        font-size: 15px;
        font-weight: 600;
        color: #fff;
        background: var(--primary);
        border: none;
        border-radius: 8px;
        cursor: pointer;
      }
      .btn-primary:disabled {
        opacity: 0.6;
      }
    `,
  ],
})
export class LoginPage {
  private auth = inject(AuthService);
  private router = inject(Router);

  email = "";
  password = "";
  loading = signal(false);
  error = signal<string | null>(null);

  submit(): void {
    if (!this.email || !this.password || this.loading()) return;
    this.loading.set(true);
    this.error.set(null);
    this.auth.login(this.email, this.password).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(["/"]);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(
          err?.error?.message || "Credenciales inválidas, intenta de nuevo",
        );
      },
    });
  }
}
