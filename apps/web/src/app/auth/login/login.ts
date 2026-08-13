import { Component, inject, isDevMode, OnInit } from "@angular/core";
import {
  FormBuilder,
  Validators,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
} from "@angular/forms";
import { ActivatedRoute, Router, RouterModule } from "@angular/router";

import { AuthService } from "../auth.service";

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

  public readonly demoCuentas = [
    {
      rol: "Administrador",
      email: "admin@demo.local",
      password: "demo123",
      detalle: "Acceso completo al sistema",
    },
    {
      rol: "Recepción",
      email: "recepcion@demo.local",
      password: "demo1234",
      detalle: "Solo el módulo de recepción de unidades",
    },
    {
      rol: "Técnico",
      email: "mecanico1@demo.local",
      password: "demo123",
      detalle: "Para la app del taller",
    },
  ];

  public readonly demoPortales = [
    {
      // Va primero porque es el que se usa a diario y desde el iPad del taller.
      // `interno` lo abre en esta misma pestaña: así el guard puede pedir la
      // sesión y devolver al portal, en vez de dejar una pestaña huérfana.
      nombre: "Portal de recepción",
      descripcion: "Recibir unidades desde el iPad, con cámara",
      url: "/recepcion",
      interno: true,
    },
    {
      nombre: "App del técnico",
      descripcion: "Órdenes, cronómetro y hallazgos",
      url: "http://localhost:4201",
      interno: false,
    },
    {
      nombre: "Panel superadmin",
      descripcion: "Administración de Nexus Q Tech",
      url: "http://localhost:4202",
      interno: false,
    },
    {
      nombre: "Documentación de la API",
      descripcion: "Swagger con todos los endpoints",
      url: "http://localhost:3010/api/docs",
      interno: false,
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
  }

  login() {
    if (this.loginForm.invalid || this.loading) return;
    this.loading = true;
    this.error = null;

    this.auth
      .login({
        email: this.loginForm.value["email"],
        password: this.loginForm.value["password"],
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
          this.error =
            err?.error?.message ||
            err?.message ||
            "Credenciales inválidas. Intente de nuevo.";
        },
      });
  }
}
