import { Component, OnInit, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { RouterModule } from "@angular/router";
import { Subject } from "rxjs";
import { debounceTime, switchMap } from "rxjs/operators";

import { CajaVentasService } from "../../caja-ventas.service";
import { BranchesService } from "../../../inventario-refacciones/services/branches.service";
import { CashSession } from "../../models/cash-session.model";
import { FeatherIcons } from "../../../../shared/components/feather-icons/feather-icons";

@Component({
  selector: "app-sesiones-list",
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, FeatherIcons],
  templateUrl: "./sesiones-list.html",
  styleUrls: ["./sesiones-list.scss"],
})
export class SesionesList implements OnInit {
  private cajaService = inject(CajaVentasService);
  private branchesService = inject(BranchesService);

  sesiones = signal<CashSession[]>([]);
  activeSession = signal<CashSession | null>(null);
  branches = signal<{ id: string; name: string }[]>([]);
  branchFilter = signal<string>("");
  meta = signal<{
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  } | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);
  opening = signal(false);
  closing = signal(false);

  openingBalance = signal("");
  closingBalance = signal("");
  closingNotes = signal("");

  private loadSubject = new Subject<void>();

  ngOnInit(): void {
    this.branchesService.getAll().subscribe({
      next: (res) =>
        this.branches.set(res.data.map((b) => ({ id: b.id, name: b.name }))),
    });

    this.loadSubject
      .pipe(
        debounceTime(100),
        switchMap(() =>
          this.cajaService.getSessions({
            branchId: this.branchFilter() || undefined,
            page: this.meta()?.page ?? 1,
            limit: 20,
          })
        )
      )
      .subscribe({
        next: (res) => {
          this.sesiones.set(res.data);
          this.meta.set(res.meta);
          this.loading.set(false);
          this.error.set(null);
        },
        error: (err) => {
          this.loading.set(false);
          this.error.set(err?.error?.message || "Error al cargar sesiones");
        },
      });

    this.load();
  }

  onBranchChange(branchId: string): void {
    this.branchFilter.set(branchId);
    this.meta.update((m) => (m ? { ...m, page: 1 } : null));
    this.load();
    this.checkActiveSession(branchId);
  }

  private checkActiveSession(branchId: string): void {
    if (!branchId) {
      this.activeSession.set(null);
      return;
    }
    this.cajaService.getActiveSession(branchId).subscribe({
      next: (s) => this.activeSession.set(s),
      error: () => this.activeSession.set(null),
    });
  }

  load(): void {
    this.loading.set(true);
    this.loadSubject.next();
    const bid = this.branchFilter();
    if (bid) this.checkActiveSession(bid);
  }

  goToPage(page: number): void {
    const m = this.meta();
    if (!m || page < 1 || page > m.totalPages) return;
    this.meta.update((prev) => (prev ? { ...prev, page } : null));
    this.load();
  }

  onOpen(): void {
    const branchId = this.branchFilter();
    const balance = parseFloat(this.openingBalance());
    if (!branchId || isNaN(balance) || balance < 0) return;

    this.opening.set(true);
    this.cajaService.openSession({ branchId, openingBalance: balance }).subscribe({
      next: () => {
        this.openingBalance.set("");
        this.checkActiveSession(branchId);
        this.load();
        this.opening.set(false);
      },
      error: (err) => {
        this.opening.set(false);
        alert(err?.error?.message || "Error al abrir caja");
      },
    });
  }

  onClose(): void {
    const branchId = this.branchFilter();
    const balance = parseFloat(this.closingBalance());
    if (!branchId || isNaN(balance) || balance < 0) return;

    this.closing.set(true);
    this.cajaService
      .closeSession(branchId, {
        closingBalance: balance,
        closingNotes: this.closingNotes() || undefined,
      })
      .subscribe({
        next: () => {
          this.closingBalance.set("");
          this.closingNotes.set("");
          this.activeSession.set(null);
          this.checkActiveSession(branchId);
          this.load();
          this.closing.set(false);
        },
        error: (err) => {
          this.closing.set(false);
          alert(err?.error?.message || "Error al cerrar caja");
        },
      });
  }

  getStatusLabel(status: string): string {
    return this.cajaService.getSessionStatusLabel(status);
  }

  getBranchName(id: string): string {
    return this.branches().find((b) => b.id === id)?.name ?? id;
  }
}
