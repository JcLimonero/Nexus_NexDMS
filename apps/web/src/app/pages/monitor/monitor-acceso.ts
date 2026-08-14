import { Component, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute, Router } from "@angular/router";

import { MonitorAuthService } from "./monitor-auth.service";

/**
 * Acceso de las pantallas del taller.
 *
 * Se entra una vez, al colgar el monitor, y no se vuelve a tocar. Por eso el
 * formulario es mínimo y del mismo tono que las pantallas que abre: quien lo
 * ve delante es alguien montando una pantalla, no alguien trabajando.
 */
@Component({
  selector: "app-monitor-acceso",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./monitor-acceso.html",
  styleUrls: ["./monitor.scss"],
})
export class MonitorAcceso {
  private auth = inject(MonitorAuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  email = "";
  password = "";
  entrando = signal(false);
  error = signal<string | null>(null);

  /** A cuál de las dos pantallas iba, con su sucursal si la traía. */
  private destino(): string {
    const url = this.route.snapshot.queryParamMap.get("returnUrl");
    // Solo rutas del monitor: un returnUrl a cualquier otro sitio metería la
    // cuenta de la pantalla dentro del DMS.
    return url && url.startsWith("/monitor/") ? url : "/monitor/taller";
  }

  entrar(): void {
    if (!this.email || !this.password || this.entrando()) return;
    this.entrando.set(true);
    this.error.set(null);
    this.auth.entrar(this.email.trim(), this.password).subscribe({
      next: (r) => {
        this.entrando.set(false);
        if ("requiresTotp" in r) {
          this.error.set(r.message);
          return;
        }
        this.router.navigateByUrl(this.destino());
      },
      error: (e) => {
        this.entrando.set(false);
        this.error.set(
          e?.error?.message || "No se pudo entrar. Revisa los datos.",
        );
      },
    });
  }
}
