import { Component, inject, isDevMode, OnInit } from "@angular/core";
import {
  FormBuilder,
  Validators,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
} from "@angular/forms";
import { Router, RouterModule } from "@angular/router";

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
      rol: "Mecánico",
      email: "mecanico1@demo.local",
      password: "demo123",
      detalle: "Para la app del taller",
    },
  ];

  public readonly demoPortales = [
    {
      nombre: "App del mecánico",
      descripcion: "Órdenes, cronómetro y hallazgos",
      url: "http://localhost:4201",
    },
    {
      nombre: "Panel superadmin",
      descripcion: "Administración de Nexus Q Tech",
      url: "http://localhost:4202",
    },
    {
      nombre: "Documentación de la API",
      descripcion: "Swagger con todos los endpoints",
      url: "http://localhost:3010/api/docs",
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
      this.router.navigate(["/dashboard/default"]);
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
          this.router.navigate(["/dashboard/default"]);
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
