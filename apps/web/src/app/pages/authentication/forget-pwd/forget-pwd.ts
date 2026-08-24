import { Component, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { RouterModule } from "@angular/router";
import { AuthService } from "../../../auth/auth.service";
import { TenantContext } from "../../../shared/tenant/tenant-context";

/**
 * Solicita el correo de recuperación de contraseña. Resuelve el cliente por su
 * slug (`/<slug>/…`) para acotar la búsqueda del correo a ese concesionario.
 * La respuesta es siempre la misma, exista o no el correo.
 */
@Component({
  selector: "app-forget-pwd",
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: "./forget-pwd.html",
  styleUrls: ["./forget-pwd.scss"],
})
export class ForgetPwd {
  private auth = inject(AuthService);
  private tenant = inject(TenantContext);

  email = signal("");
  enviando = signal(false);
  enviado = signal(false);
  error = signal<string | null>(null);

  get loginLink(): string {
    return this.tenant.slug
      ? `/${this.tenant.slug}/auth/login`
      : "/auth/login";
  }

  enviar(): void {
    const email = this.email().trim();
    if (!email) {
      this.error.set("Escribe tu correo.");
      return;
    }
    this.error.set(null);
    this.enviando.set(true);
    const slug = this.tenant.slug;
    const pedir = (tenantId?: string) => {
      this.auth.forgotPassword(email, tenantId).subscribe({
        next: () => {
          this.enviando.set(false);
          this.enviado.set(true);
        },
        error: () => {
          // Aun con error se muestra el mismo mensaje: no revelamos nada.
          this.enviando.set(false);
          this.enviado.set(true);
        },
      });
    };
    if (slug) {
      this.auth.brandingPorSlug(slug).subscribe({
        next: (b) => pedir(b?.id),
        error: () => pedir(undefined),
      });
    } else {
      pedir(undefined);
    }
  }
}
