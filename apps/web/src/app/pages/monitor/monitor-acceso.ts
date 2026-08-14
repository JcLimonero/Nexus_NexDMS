import {
  Component,
  computed,
  inject,
  isDevMode,
  signal,
} from "@angular/core";
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

  /**
   * Cuentas de ejemplo, solo en desarrollo: `ng build` de producción elimina
   * el bloque entero. Una pantalla colgada a la vista de todos con las
   * credenciales impresas encima sería justo lo que no hay que hacer.
   */
  readonly demoMode = isDevMode();

  /**
   * Una cuenta por pantalla, del rol de quien la mira.
   *
   * El tablero del taller lo lee el técnico y la agenda del día el asesor de
   * servicio: cada monitor entra con la cuenta de su gente, no con una
   * genérica. Son además los roles de menor permiso que alcanzan cada
   * pantalla —comprobado contra sus endpoints—, que en un monitor colgado a
   * la vista de todos es lo que corresponde.
   */
  readonly cuentas = [
    {
      rol: "Técnico",
      para: "Monitor de taller",
      ruta: "/monitor/taller",
      email: "mecanico1@demo.local",
      password: "demo123",
    },
    {
      rol: "Asesor de servicio",
      para: "Monitor de citas",
      ruta: "/monitor/citas",
      email: "recepcion@demo.local",
      password: "demo1234",
    },
  ];

  /**
   * La cuenta que toca según la pantalla que se pidió, primero.
   *
   * Se llega aquí desde un monitor concreto, así que ofrecer las dos en el
   * mismo orden siempre obliga a leer cuál era la buena.
   */
  cuentasOrdenadas = computed(() => {
    const destino = this.destino();
    return [...this.cuentas].sort((a, b) =>
      destino.startsWith(b.ruta) ? 1 : destino.startsWith(a.ruta) ? -1 : 0,
    );
  });

  /** Si es la que corresponde a la pantalla pedida. */
  esLaDeEstaPantalla(c: { ruta: string }): boolean {
    return this.destino().startsWith(c.ruta);
  }

  usarCuenta(c: { email: string; password: string }): void {
    this.email = c.email;
    this.password = c.password;
  }
  entrando = signal(false);
  error = signal<string | null>(null);

  /** A cuál de las dos pantallas iba, con su sucursal si la traía. */
  destino(): string {
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
        this.error.set(this.mensaje(e));
      },
    });
  }
  /**
   * Traduce el fallo a algo accionable.
   *
   * El backend devuelve cosas como "ThrottlerException: Too Many Requests",
   * que en una pantalla colgada no le dice nada a quien la está montando.
   */
  private mensaje(e: { status?: number; error?: { message?: string } }): string {
    if (e?.status === 429) {
      return "Demasiados intentos seguidos. Espera un minuto y vuelve a probar.";
    }
    if (e?.status === 401) {
      return "Correo o contraseña incorrectos.";
    }
    if (e?.status === 0) {
      return "Sin conexión con el servidor.";
    }
    const m = e?.error?.message;
    return m && !m.includes("Exception")
      ? m
      : "No se pudo entrar. Revisa los datos.";
  }

}
