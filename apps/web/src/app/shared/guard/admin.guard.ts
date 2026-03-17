import { Injectable, inject } from "@angular/core";
import { Router } from "@angular/router";

import { AuthService } from "../../auth/auth.service";

@Injectable({
  providedIn: "root",
})
export class AdminGuard {
  private router = inject(Router);
  private auth = inject(AuthService);

  canActivate(): boolean {
    if (this.auth.isAuthenticated()) {
      return true;
    }
    this.router.navigate(["/auth/login"]);
    return false;
  }
}
