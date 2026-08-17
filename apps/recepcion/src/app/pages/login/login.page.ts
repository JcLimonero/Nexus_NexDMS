import {
  Component,
  OnInit,
  inject,
  isDevMode,
  signal,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";
import { AuthService } from "../../core/auth.service";
import { BrandingService } from "../../core/branding.service";
import { TenantContext } from "../../core/tenant-context";

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
            <div class="brand-sub">Recepción</div>
          </div>
        </div>
        <h1>Iniciar sesión</h1>
        @if (clienteNombre()) {
          <p class="hint">Acceso a <strong>{{ clienteNombre() }}</strong></p>
        } @else {
          <p class="hint">Ingresa con tu cuenta de asesor de servicio</p>
        }

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

        <!-- Solo en compilaciones de desarrollo (ver modoDemo) -->
        @if (modoDemo) {
          <div class="demo">
            <div class="demo-titulo">Asesores de demostración</div>
            @for (t of tecnicosDemo; track t.email) {
              <button type="button" class="demo-fila" (click)="usar(t)">
                <span class="demo-nombre">{{ t.nombre }}</span>
                <span class="demo-cred">{{ t.email }} · {{ t.password }}</span>
              </button>
            }
          </div>
        }
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
      .demo {
        margin-top: 20px;
        padding-top: 16px;
        border-top: 1px solid #e2e8f0;
      }
      .demo-titulo {
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: #94a3b8;
        margin-bottom: 8px;
      }
      /* Toda la fila es pulsable: el técnico entra de un toque, sin teclear. */
      .demo-fila {
        display: flex;
        flex-direction: column;
        gap: 2px;
        width: 100%;
        padding: 10px 12px;
        margin-bottom: 6px;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        background: #f8fafc;
        text-align: left;
        cursor: pointer;
      }
      .demo-nombre {
        font-size: 14px;
        font-weight: 600;
        color: #0f172a;
      }
      .demo-cred {
        font-size: 12px;
        color: #64748b;
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
export class LoginPage implements OnInit {
  private auth = inject(AuthService);
  private router = inject(Router);
  private branding = inject(BrandingService);
  private tenant = inject(TenantContext);

  email = "";
  password = "";
  loading = signal(false);
  error = signal<string | null>(null);

  /** Cliente de la liga (`/<slug>/…`): rotula el acceso y lo acota. */
  clienteNombre = signal<string | null>(null);
  private tenantId: string | null = null;

  ngOnInit(): void {
    const slug = this.tenant.slug;
    if (!slug) return;
    this.auth.brandingPublica(slug).subscribe({
      next: (b) => {
        this.clienteNombre.set(b?.nombre ?? null);
        this.tenantId = b?.id ?? null;
        this.branding.establecer(b);
      },
      error: () => {
        /* slug desconocido: acceso genérico */
      },
    });
  }

  /**
   * Credenciales a la vista para la demostración. Solo aparecen en
   * compilaciones de desarrollo: `ng build` de producción evalúa `isDevMode()`
   * como falso y elimina el bloque, porque publicar cuentas en la pantalla de
   * acceso de un taller real lo dejaría abierto a cualquiera.
   */
  readonly modoDemo = isDevMode();

  readonly tecnicosDemo = [
    { nombre: "Andrés Recepción", email: "recepcion@demo.local", password: "demo1234" },
    { nombre: "Asesor 2", email: "asesor2@demo.local", password: "demo1234" },
    { nombre: "Asesor 3", email: "asesor3@demo.local", password: "demo1234" },
  ];

  /** Llena el formulario y entra: en el taller nadie teclea un correo largo. */
  usar(t: { email: string; password: string }): void {
    this.email = t.email;
    this.password = t.password;
    this.submit();
  }

  submit(): void {
    if (!this.email || !this.password || this.loading()) return;
    this.loading.set(true);
    this.error.set(null);
    this.auth.login(this.email, this.password, this.tenantId ?? undefined).subscribe({
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
