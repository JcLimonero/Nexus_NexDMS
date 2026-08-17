import { Component, inject, isDevMode, OnInit, signal } from "@angular/core";
import {
  FormBuilder,
  Validators,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
} from "@angular/forms";
import { ActivatedRoute, Router, RouterModule } from "@angular/router";

import { AuthService } from "../auth.service";
import { BrandingService } from "../../shared/services/branding.service";
import { TenantContext } from "../../shared/tenant/tenant-context";

@Component({
  selector: "app-login",
  imports: [RouterModule, FormsModule, ReactiveFormsModule],
  templateUrl: "./login.html",
  styleUrls: ["./login.scss"],
})
export class Login implements OnInit {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private branding = inject(BrandingService);
  private tenant = inject(TenantContext);

  /** Cliente de la liga (`/<slug>/…`): rotula el acceso y lo acota. */
  public clienteNombre: string | null = null;
  private tenantId: string | null = null;

  /**
   * A dónde ir tras entrar. Lo pone el guard cuando alguien abre un enlace
   * directo sin sesión —el portal de recepción, por ejemplo— para no dejarlo
   * en el tablero teniendo que buscar de nuevo lo que ya había pedido.
   */
  private destino(): string {
    // Quien recibe unidades entra directo a su portal: el DMS completo no es
    // su herramienta y obligarlo a navegar hasta ahí cada mañana sobra.
    const roles = this.auth.getUser()?.roles ?? [];
    if (roles.includes("RECEPTIONIST") && !roles.includes("ADMIN")) {
      return "/recepcion";
    }
    const url = this.route.snapshot.queryParamMap.get("returnUrl");
    // Solo rutas internas: un returnUrl absoluto podría mandar al usuario a
    // otro sitio tras autenticarse.
    return url && url.startsWith("/") && !url.startsWith("//")
      ? url
      : "/dashboard/default";
  }

  /**
   * A dónde iba el usuario antes de que el guard le pidiera la sesión.
   *
   * Sin decírselo, pulsar "Portal de recepción" desde esta misma pantalla
   * devuelve aquí y parece que el enlace no hace nada: en realidad el destino
   * quedó guardado y se abre en cuanto entra.
   */
  public get destinoPendiente(): string | null {
    const url = this.route.snapshot.queryParamMap.get("returnUrl");
    if (!url || !url.startsWith("/")) return null;
    // Frase completa y no solo el nombre: "a" + "el" se contrae en "al", y
    // componerlo en la plantilla obligaría a decidir el artículo ahí.
    const nombres: Record<string, string> = {
      "/recepcion": "al portal de recepción",
      "/reception": "a la recepción de unidades",
      "/portal": "al portal del cliente",
    };
    return nombres[url.split("?")[0]] ?? "a la página que abriste";
  }

  public newUser = false;
  public loginForm: FormGroup;
  public loading = false;
  public error: string | null = null;

  /**
   * Panel de demostración: credenciales y accesos a los otros portales.
   *
   * Solo aparece en compilaciones de desarrollo (`ng build` de producción
   * lo elimina). Publicar credenciales en la pantalla de acceso de un
   * entorno real dejaría el sistema abierto a cualquiera.
   */
  public readonly demoMode = isDevMode();

  /**
   * Cuentas de demostración. Por defecto las genéricas; si se entró por la liga
   * de un cliente (`/<slug>/…`) se reemplazan por las de ese cliente.
   */
  public demoCuentas = signal<
    { rol: string; email: string; password: string; detalle: string }[]
  >([
    {
      rol: "Administrador",
      email: "admin@demo.local",
      password: "demo123",
      detalle: "Acceso completo al sistema",
    },
    {
      rol: "Recepción",
      email: "recepcion@demo.local",
      password: "demo123",
      detalle: "Solo el módulo de recepción de unidades",
    },
    {
      rol: "Técnico",
      email: "mecanico1@demo.local",
      password: "demo123",
      detalle: "Para la app del taller",
    },
  ]);

  /** Etiqueta legible de un rol, para el panel de cuentas del cliente. */
  private etiquetaRol(roles: string[]): string {
    const map: Record<string, string> = {
      ADMIN: "Administrador",
      MANAGER: "Gerente",
      CASHIER: "Cajero",
      SELLER: "Vendedor",
      WAREHOUSE: "Almacén",
      RECEPTIONIST: "Recepción",
      MECHANIC: "Técnico",
    };
    return map[roles[0]] ?? roles[0] ?? "Usuario";
  }

  public readonly demoPortales = [
    {
      // Va primero porque es el que se usa a diario, desde el iPad del taller.
      // Es una aplicación aparte —como la del técnico— y se abre en su propia
      // pestaña: tiene su sesión y su ciclo, y meterla en esta cerraría el DMS
      // a quien solo iba a echar un vistazo.
      nombre: "Recepción",
      // El icono es lo que se ve; la descripción queda en el título emergente
      // y como nombre accesible, para no perderla al compactar.
      icono: "📋",
      descripcion: "Recibir unidades desde el iPad, con cámara",
      url: "http://localhost:4203",
      interno: false,
    },
    {
      nombre: "Técnico",
      icono: "🔧",
      descripcion: "Órdenes, cronómetro y hallazgos",
      url: "http://localhost:4201",
      interno: false,
    },
    {
      nombre: "Superadmin",
      icono: "🏢",
      descripcion: "Administración de Nexus Q Tech",
      url: "http://localhost:4202",
      interno: false,
    },
    {
      nombre: "API",
      icono: "📘",
      descripcion: "Swagger con todos los endpoints",
      // Ruta relativa a propósito: sale por el mismo proxy que las peticiones
      // de la aplicación, así que funciona sea cual sea el puerto en que esté
      // publicada la API. Fijarlo a un puerto lo rompía en cuanto cambiaba.
      url: "/api/docs",
      interno: false,
    },
  ];

  /**
   * Pantallas para colgar en el taller.
   *
   * Van fuera del panel de demostración a propósito: ese bloque desaparece
   * en producción —publica contraseñas—, y un monitor de taller es
   * justamente algo que hace falta en producción. Además apuntan a rutas de
   * esta misma aplicación, así que funcionan en cualquier despliegue, al
   * contrario que los otros portales, fijados a puertos locales.
   *
   * Se abren en otra pestaña, como los demás accesos: el monitor se queda
   * puesto en su pantalla y quien lo abrió sigue aquí para entrar al DMS.
   *
   * Sin sucursal en la dirección toman la primera; para dejar una pantalla
   * fija por taller se añade `?branch=<id>` al marcador del navegador.
   */
  public readonly monitores = [
    {
      nombre: "Monitor de taller",
      icono: "🖥️",
      descripcion: "Estado de las unidades en servicio, con semáforo de tiempos",
      url: "/monitor/taller",
    },
    {
      nombre: "Monitor de citas",
      icono: "📅",
      descripcion: "Las citas esperadas hoy, para la recepción",
      url: "/monitor/citas",
    },
  ];

  /** Rellena el formulario con una cuenta de demostración. */
  usarCuenta(cuenta: { email: string; password: string }): void {
    this.loginForm.patchValue({
      email: cuenta.email,
      password: cuenta.password,
    });
  }

  constructor() {
    this.loginForm = this.fb.group({
      email: ["", [Validators.required, Validators.email]],
      password: ["", Validators.required],
    });
  }

  ngOnInit(): void {
    if (this.auth.isAuthenticated()) {
      this.router.navigateByUrl(this.destino());
    }

    // Si se entró por la liga de un cliente, se viste el acceso con su marca y
    // se acota el login a ese cliente.
    const slug = this.tenant.slug;
    if (slug) {
      this.auth.brandingPorSlug(slug).subscribe({
        next: (b) => {
          this.clienteNombre = b?.nombre ?? null;
          this.tenantId = b?.id ?? null;
          this.branding.establecer(b);
        },
        error: () => {
          /* slug desconocido: se entra al acceso genérico */
        },
      });
      // Las cuentas del panel pasan a ser las de este cliente.
      this.auth.demoUsersPorSlug(slug).subscribe({
        next: (us) => {
          if (us.length) {
            this.demoCuentas.set(
              us.map((u) => ({
                rol: this.etiquetaRol(u.roles),
                email: u.email,
                password: "demo123",
                detalle: u.nombre,
              })),
            );
          }
        },
        error: () => {
          /* sin cuentas del cliente: quedan las genéricas */
        },
      });
    }
  }

  login() {
    if (this.loginForm.invalid || this.loading) return;
    this.loading = true;
    this.error = null;

    this.auth
      .login({
        email: this.loginForm.value["email"],
        password: this.loginForm.value["password"],
        tenantId: this.tenantId ?? undefined,
      })
      .subscribe({
        next: (res) => {
          this.loading = false;
          if ("requiresTotp" in res) {
            this.error = res.message;
            return;
          }
          this.router.navigateByUrl(this.destino());
        },
        error: (err) => {
          this.loading = false;
          this.error = this.mensajeDeError(err);
        },
      });
  }
  /**
   * Traduce el fallo a algo que se pueda hacer.
   *
   * El backend devuelve cosas como "ThrottlerException: Too Many Requests",
   * que no le dice nada a quien solo quiere entrar y encima parece un error
   * del sistema y no un límite a propósito.
   */
  private mensajeDeError(err: {
    status?: number;
    error?: { message?: string | string[] };
  }): string {
    if (err?.status === 429) {
      return "Demasiados intentos seguidos. Espera un minuto y vuelve a probar.";
    }
    if (err?.status === 0) {
      return "Sin conexión con el servidor.";
    }
    const m = err?.error?.message;
    const texto = Array.isArray(m) ? m[0] : m;
    return texto && !texto.includes("Exception")
      ? texto
      : "Credenciales inválidas. Intente de nuevo.";
  }

}
