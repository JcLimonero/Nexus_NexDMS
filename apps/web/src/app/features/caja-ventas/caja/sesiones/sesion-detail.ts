import { MoneyPipe } from "../../../../shared/pipes/money.pipe";
import { Component, OnInit, computed, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Router, ActivatedRoute, RouterModule } from "@angular/router";
import { ToastrService } from "ngx-toastr";

import { CajaVentasService } from "../../caja-ventas.service";
import {
  CashSession,
  MovimientoCaja,
} from "../../models/cash-session.model";

/** Denominaciones de peso mexicano, de mayor a menor. */
const DENOMINACIONES = [1000, 500, 200, 100, 50, 20, 10, 5, 2, 1, 0.5];

const ETIQUETA_MOV: Record<string, string> = {
  DEPOSIT: "Depósito",
  WITHDRAWAL: "Retiro",
  EXPENSE: "Gasto",
};

@Component({
  selector: "app-sesion-detail",
  standalone: true,
  imports: [MoneyPipe, CommonModule, FormsModule, RouterModule],
  templateUrl: "./sesion-detail.html",
  styleUrls: ["./sesion-detail.scss"],
})
export class SesionDetail implements OnInit {
  private cajaService = inject(CajaVentasService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private toastr = inject(ToastrService);

  sesion = signal<CashSession | null>(null);
  movimientos = signal<MovimientoCaja[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  readonly etiquetaMov = ETIQUETA_MOV;
  readonly denominaciones = DENOMINACIONES;

  abierta = computed(() => this.sesion()?.status === "OPEN");

  // Movimiento manual
  movAbierto = signal(false);
  movForm = { kind: "EXPENSE" as MovimientoCaja["kind"], amount: 0, concept: "", reference: "" };
  guardandoMov = signal(false);

  // Cierre con arqueo
  cierreAbierto = signal(false);
  arqueo: Record<number, number> = {};
  notasCierre = "";
  cerrando = signal(false);

  /**
   * Total del arqueo capturado.
   *
   * Es un método, no un `computed`: `arqueo` es un objeto mutable que cambia
   * por ngModel, no una señal, y un `computed` solo se recalcula cuando cambia
   * una señal que lee —se quedaría congelado en cero—. Como método, Angular lo
   * reevalúa en cada detección de cambios, que ngModel dispara.
   */
  totalArqueo(): number {
    let t = 0;
    for (const d of DENOMINACIONES) t += d * (this.arqueo[d] || 0);
    return t;
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get("id");
    if (!id) {
      this.router.navigate(["/cash-register/sesiones"]);
      return;
    }
    this.cargar(id);
  }

  private cargar(id: string): void {
    this.loading.set(true);
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
    this.cajaService.getMovimientos(id).subscribe({
      next: (m) => this.movimientos.set(m),
    });
  }

  recargar(): void {
    const s = this.sesion();
    if (s) this.cargar(s.id);
  }

  getStatusLabel(status: string): string {
    return this.cajaService.getSessionStatusLabel(status);
  }

  getUserName(s: CashSession): string {
    const u = s.user;
    if (u) return `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || "—";
    return "—";
  }

  // ── Movimiento manual ──
  abrirMov(): void {
    this.movForm = { kind: "EXPENSE", amount: 0, concept: "", reference: "" };
    this.movAbierto.set(true);
  }

  guardarMov(): void {
    const s = this.sesion();
    if (!s) return;
    if (!this.movForm.amount || this.movForm.amount <= 0) {
      this.toastr.warning("El monto debe ser mayor a cero");
      return;
    }
    if (!this.movForm.concept.trim()) {
      this.toastr.warning("Falta el concepto");
      return;
    }
    this.guardandoMov.set(true);
    this.cajaService.registrarMovimiento(s.branchId, this.movForm).subscribe({
      next: () => {
        this.guardandoMov.set(false);
        this.movAbierto.set(false);
        this.toastr.success("Movimiento registrado");
        this.recargar();
      },
      error: (e) => {
        this.guardandoMov.set(false);
        this.toastr.error(e?.error?.message || "No se pudo registrar");
      },
    });
  }

  // ── Cierre con arqueo ──
  abrirCierre(): void {
    this.arqueo = {};
    this.notasCierre = "";
    this.cierreAbierto.set(true);
  }

  cerrar(): void {
    const s = this.sesion();
    if (!s) return;
    const denominations: Record<string, number> = {};
    for (const d of DENOMINACIONES) {
      if (this.arqueo[d] > 0) denominations[String(d)] = this.arqueo[d];
    }
    this.cerrando.set(true);
    this.cajaService
      .closeSession(s.branchId, {
        denominations,
        closingNotes: this.notasCierre || undefined,
      })
      .subscribe({
        next: () => {
          this.cerrando.set(false);
          this.cierreAbierto.set(false);
          this.toastr.success("Caja cerrada");
          this.recargar();
        },
        error: (e) => {
          this.cerrando.set(false);
          this.toastr.error(e?.error?.message || "No se pudo cerrar");
        },
      });
  }

  imprimirCorte(): void {
    const s = this.sesion();
    if (!s) return;
    this.cajaService.corte(s.id).subscribe({
      next: (pdf) => {
        const url = URL.createObjectURL(pdf);
        window.open(url, "_blank", "noopener");
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      },
      error: () => this.toastr.error("No se pudo generar el corte"),
    });
  }
}
