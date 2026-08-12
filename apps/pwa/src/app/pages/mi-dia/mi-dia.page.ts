import { Component, OnInit, computed, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { Router, RouterModule } from "@angular/router";
import { forkJoin } from "rxjs";

import { AuthService } from "../../core/auth.service";
import {
  MecanicoApiService,
  MyAppointment,
  MyServiceOrder,
} from "../../core/mecanico-api.service";

@Component({
  selector: "app-mi-dia-page",
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <header class="topbar">
      <div class="who">
        <div class="avatar">{{ initials() }}</div>
        <div>
          <div class="name">{{ userName() }}</div>
          <div class="date">{{ todayLabel }}</div>
        </div>
      </div>
      <button class="icon-btn" (click)="logout()" title="Cerrar sesión">⎋</button>
    </header>

    <main class="content">
      @if (loading()) {
        <div class="empty">Cargando tu día…</div>
      } @else if (error()) {
        <div class="error">{{ error() }}</div>
      } @else {
        <!-- Citas de hoy -->
        <section>
          <h2>Mi agenda de hoy <span class="count">{{ citas().length }}</span></h2>
          @if (citas().length === 0) {
            <div class="empty">Sin citas asignadas para hoy.</div>
          }
          @for (c of citas(); track c.id) {
            <div class="card cita">
              <div class="card-time">
                <span class="hour">{{ hourLabel(c.scheduledAt) }}</span>
                <span class="dur">{{ c.durationMin || 60 }} min</span>
              </div>
              <div class="card-main">
                <div class="card-title">{{ vehicleLabel(c) }}</div>
                <div class="card-sub">{{ c.serviceType }}</div>
                <div class="card-sub muted">{{ clientLabel(c) }}</div>
              </div>
              <span class="chip {{ c.status }}">{{ statusLabel(c.status) }}</span>
            </div>
          }
        </section>

        <!-- Órdenes activas -->
        <section>
          <h2>
            Mis órdenes activas <span class="count">{{ activas().length }}</span>
          </h2>
          @if (activas().length === 0) {
            <div class="empty">No tienes órdenes activas.</div>
          }
          @for (o of activas(); track o.id) {
            <a class="card orden" [routerLink]="['/orden', o.id]">
              <div class="card-main">
                <div class="card-title">
                  {{ o.folio || "OS" }} · {{ orderVehicleLabel(o) }}
                </div>
                <div class="card-sub">{{ o.reportedFault || "—" }}</div>
                <div class="card-sub muted">{{ orderClientLabel(o) }}</div>
              </div>
              <span class="chip {{ o.status }}">{{ statusLabel(o.status) }}</span>
              <span class="arrow">›</span>
            </a>
          }
        </section>
      }
    </main>
  `,
  styleUrls: ["./mi-dia.page.scss"],
})
export class MiDiaPage implements OnInit {
  private api = inject(MecanicoApiService);
  private auth = inject(AuthService);
  private router = inject(Router);

  loading = signal(true);
  error = signal<string | null>(null);
  citas = signal<MyAppointment[]>([]);
  ordenes = signal<MyServiceOrder[]>([]);

  readonly todayLabel = new Date().toLocaleDateString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  activas = computed(() =>
    this.ordenes().filter(
      (o) => o.status !== "DELIVERED" && o.status !== "CANCELLED",
    ),
  );

  userName = computed(() => {
    const u = this.auth.user();
    return u ? `${u.firstName} ${u.lastName}` : "";
  });

  initials = computed(() => {
    const u = this.auth.user();
    return u
      ? `${u.firstName[0] ?? ""}${u.lastName[0] ?? ""}`.toUpperCase()
      : "?";
  });

  ngOnInit(): void {
    forkJoin({
      citas: this.api.getMyAppointmentsToday(),
      ordenes: this.api.getMyOrders(),
    }).subscribe({
      next: ({ citas, ordenes }) => {
        this.citas.set(
          citas.data.filter(
            (c) => c.status !== "CANCELLED" && c.status !== "NO_SHOW",
          ),
        );
        this.ordenes.set(ordenes.data);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.message || "Error al cargar tu día");
      },
    });
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(["/login"]);
  }

  statusLabel(s: string): string {
    return this.api.getStatusLabel(s);
  }

  hourLabel(iso: string): string {
    return new Date(iso).toLocaleTimeString("es-MX", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  vehicleLabel(c: MyAppointment): string {
    if (!c.vehicle) return c.serviceType;
    const v = [c.vehicle.brand, c.vehicle.model].filter(Boolean).join(" ");
    return c.vehicle.plate ? `${c.vehicle.plate} · ${v}` : v || c.serviceType;
  }

  clientLabel(c: MyAppointment): string {
    if (c.client) {
      return (
        c.client.companyName ||
        [c.client.firstName, c.client.lastName].filter(Boolean).join(" ")
      );
    }
    return c.clientName || "";
  }

  orderVehicleLabel(o: MyServiceOrder): string {
    if (!o.vehicle) return "";
    const v = [o.vehicle.brand ?? o.vehicle.make, o.vehicle.model]
      .filter(Boolean)
      .join(" ");
    return o.vehicle.plate ? `${o.vehicle.plate} · ${v}` : v;
  }

  orderClientLabel(o: MyServiceOrder): string {
    if (!o.client) return "";
    return (
      o.client.companyName ||
      [o.client.firstName, o.client.lastName].filter(Boolean).join(" ")
    );
  }
}
