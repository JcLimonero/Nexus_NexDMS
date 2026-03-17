import { Component, OnInit, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { Router, ActivatedRoute, RouterModule } from "@angular/router";

import { CajaVentasService } from "../../caja-ventas.service";
import { CashSession } from "../../models/cash-session.model";

@Component({
  selector: "app-sesion-detail",
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: "./sesion-detail.html",
  styleUrls: ["./sesion-detail.scss"],
})
export class SesionDetail implements OnInit {
  private cajaService = inject(CajaVentasService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  sesion = signal<CashSession | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get("id");
    if (!id) {
      this.router.navigate(["/cash-register/sesiones"]);
      return;
    }

    this.cajaService.getSession(id).subscribe({
      next: (s) => {
        this.sesion.set(s);
        this.loading.set(false);
        this.error.set(null);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.message || "Error al cargar sesión");
      },
    });
  }

  getStatusLabel(status: string): string {
    return this.cajaService.getSessionStatusLabel(status);
  }

  getUserName(s: CashSession): string {
    const u = s.user;
    if (u) return `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || "—";
    return "—";
  }
}
