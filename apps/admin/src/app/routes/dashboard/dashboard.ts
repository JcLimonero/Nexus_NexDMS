import { Component, OnInit, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterLink } from "@angular/router";
import { Barra } from "../../shared/barra/barra";
import {
  DashboardOps,
  Panorama,
  SaasService,
} from "../tenants/tenants.service";

/**
 * Dashboard principal del portal de administración (Nexus): salud del SaaS —
 * cobros, cartera y operación agregada de todos los clientes.
 */
@Component({
  selector: "app-dashboard",
  standalone: true,
  imports: [CommonModule, RouterLink, Barra],
  templateUrl: "./dashboard.html",
  styleUrls: ["./dashboard.scss"],
})
export class Dashboard implements OnInit {
  private saas = inject(SaasService);

  panorama = signal<Panorama | null>(null);
  ops = signal<DashboardOps | null>(null);
  cargando = signal(true);

  readonly planLabel: Record<string, string> = {
    BASIC: "Básico",
    PRO: "Pro",
    ENTERPRISE: "Empresarial",
  };

  ngOnInit(): void {
    this.saas.panorama().subscribe({
      next: (p) => this.panorama.set(p),
      error: () => {},
    });
    this.saas.dashboardOps().subscribe({
      next: (o) => {
        this.ops.set(o);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false),
    });
  }
}
