import { Component, OnInit, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute, RouterModule } from "@angular/router";
import { AuthService } from "../../core/auth/auth.service";

/** Fija la nueva contraseña del portal admin con el token del enlace. */
@Component({
  selector: "app-restablecer",
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="rc-wrap">
      <div class="rc-card">
        @if (!listo()) {
          <h1>Nueva contraseña</h1>
          <p class="rc-sub">Crea una contraseña nueva para el portal de administración.</p>
          <form (ngSubmit)="guardar()">
            <label class="rc-field">
              <span>Nueva contraseña</span>
              <input type="password" [ngModel]="pass()" (ngModelChange)="pass.set($event)" name="pass" placeholder="Mínimo 8 caracteres" />
            </label>
            <label class="rc-field">
              <span>Confirmar</span>
              <input type="password" [ngModel]="pass2()" (ngModelChange)="pass2.set($event)" name="pass2" />
            </label>
            @if (error()) { <p class="rc-err">{{ error() }}</p> }
            <button class="rc-btn" [disabled]="guardando()">{{ guardando() ? "Guardando…" : "Cambiar contraseña" }}</button>
          </form>
          <a class="rc-link" routerLink="/acceso">Volver</a>
        } @else {
          <div class="rc-emoji">✅</div>
          <h1>Contraseña actualizada</h1>
          <p class="rc-sub">Ya puedes iniciar sesión.</p>
          <a class="rc-btn" routerLink="/acceso">Iniciar sesión</a>
        }
      </div>
    </div>
  `,
  styleUrls: ["../recuperar/recuperar.scss"],
})
export class Restablecer implements OnInit {
  private auth = inject(AuthService);
  private route = inject(ActivatedRoute);
  token = signal("");
  pass = signal("");
  pass2 = signal("");
  guardando = signal(false);
  listo = signal(false);
  error = signal<string | null>(null);

  ngOnInit(): void {
    this.token.set(this.route.snapshot.queryParamMap.get("token") ?? "");
  }

  guardar(): void {
    if (!this.token()) {
      this.error.set("El enlace no es válido.");
      return;
    }
    if (this.pass().length < 8) {
      this.error.set("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (this.pass() !== this.pass2()) {
      this.error.set("Las contraseñas no coinciden.");
      return;
    }
    this.error.set(null);
    this.guardando.set(true);
    this.auth.resetPassword(this.token(), this.pass()).subscribe({
      next: () => {
        this.guardando.set(false);
        this.listo.set(true);
      },
      error: (e) => {
        this.guardando.set(false);
        this.error.set(e?.error?.message || "El enlace no es válido o ya venció.");
      },
    });
  }
}
