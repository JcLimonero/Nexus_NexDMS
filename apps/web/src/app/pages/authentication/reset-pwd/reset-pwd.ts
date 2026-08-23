import { Component, OnInit, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute, RouterModule } from "@angular/router";
import { AuthService } from "../../../auth/auth.service";
import { TenantContext } from "../../../shared/tenant/tenant-context";

/** Fija la nueva contraseña con el token que llega en el enlace del correo. */
@Component({
  selector: "app-reset-pwd",
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: "./reset-pwd.html",
  styleUrls: ["../forget-pwd/forget-pwd.scss"],
})
export class ResetPwd implements OnInit {
  private auth = inject(AuthService);
  private route = inject(ActivatedRoute);
  private tenant = inject(TenantContext);

  token = signal("");
  pass = signal("");
  pass2 = signal("");
  guardando = signal(false);
  listo = signal(false);
  error = signal<string | null>(null);

  get loginLink(): string {
    return this.tenant.slug ? `/${this.tenant.slug}/auth/login` : "/auth/login";
  }

  ngOnInit(): void {
    this.token.set(this.route.snapshot.queryParamMap.get("token") ?? "");
  }

  guardar(): void {
    if (!this.token()) {
      this.error.set("El enlace no es válido. Solicita uno nuevo.");
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
        this.error.set(
          e?.error?.message || "El enlace no es válido o ya venció.",
        );
      },
    });
  }
}
