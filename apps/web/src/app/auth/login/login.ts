import { Component, inject, OnInit } from "@angular/core";
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
