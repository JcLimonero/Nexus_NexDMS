import { Component, OnInit, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { HttpClient, HttpParams } from "@angular/common/http";
import { ToastrService } from "ngx-toastr";

interface PldOp {
  id: string;
  operationDate: string;
  amount: string;
  umaAmount: string;
  requiresIdentification: boolean;
  requiresNotice: boolean;
  fileStatus: string;
  noticeStatus: string;
  client?: { firstName?: string; lastName?: string; companyName?: string; rfc?: string };
}

interface PldSummary {
  config: { umaValue: number; identificationUma: number; noticeUma: number };
  total: number;
  expedientesPendientes: number;
  avisosPendientes: number;
  avisosPresentados: number;
}

/** Cumplimiento PLD — operaciones vulnerables (venta de vehículos). */
@Component({
  selector: "app-pld-page",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./pld-page.html",
  styleUrls: ["./pld-page.scss"],
})
export class PldPage implements OnInit {
  private http = inject(HttpClient);
  private toastr = inject(ToastrService);

  summary = signal<PldSummary | null>(null);
  ops = signal<PldOp[]>([]);
  loading = signal(true);
  month = signal<string>("");
  umaEdit = signal(false);
  umaValue = 0;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.http.get<PldSummary>("/api/v1/pld/summary").subscribe({
      next: (s) => {
        this.summary.set(s);
        this.umaValue = s.config.umaValue;
      },
    });
    let params = new HttpParams();
    if (this.month()) params = params.set("month", this.month());
    this.http.get<PldOp[]>("/api/v1/pld/operations", { params }).subscribe({
      next: (d) => {
        this.ops.set(d);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  evaluate(): void {
    this.http
      .post<{ evaluated: number; created: number; requiresNotice: number }>(
        "/api/v1/pld/evaluate",
        {},
      )
      .subscribe({
        next: (r) => {
          this.toastr.success(
            `${r.evaluated} ventas revisadas · ${r.created} operaciones nuevas · ${r.requiresNotice} requieren aviso`,
          );
          this.load();
        },
        error: (err) => this.toastr.error(err?.error?.message || "Error"),
      });
  }

  saveUma(): void {
    this.http
      .patch("/api/v1/pld/config", { umaValue: this.umaValue })
      .subscribe({
        next: () => {
          this.toastr.success("Valor UMA actualizado");
          this.umaEdit.set(false);
          this.load();
        },
        error: (err) => this.toastr.error(err?.error?.message || "Error"),
      });
  }

  toggleFile(op: PldOp): void {
    const fileStatus = op.fileStatus === "COMPLETE" ? "PENDING" : "COMPLETE";
    this.http
      .patch(`/api/v1/pld/operations/${op.id}`, { fileStatus })
      .subscribe({ next: () => this.load() });
  }

  markReported(op: PldOp): void {
    this.http
      .post(`/api/v1/pld/operations/${op.id}/mark-reported`, {})
      .subscribe({
        next: () => {
          this.toastr.success("Aviso marcado como presentado");
          this.load();
        },
        error: (err) => this.toastr.error(err?.error?.message || "Error"),
      });
  }

  exportCsv(): void {
    const m = this.month() || new Date().toISOString().slice(0, 7);
    this.http
      .get<Record<string, unknown>[]>(`/api/v1/pld/export?month=${m}`)
      .subscribe({
        next: (rows) => {
          if (rows.length === 0) {
            this.toastr.info("Sin operaciones con aviso en ese mes");
            return;
          }
          const headers = Object.keys(rows[0]);
          const csv = [
            headers.join(","),
            ...rows.map((r) =>
              headers.map((h) => `"${String(r[h] ?? "")}"`).join(","),
            ),
          ].join("\n");
          const blob = new Blob(["﻿" + csv], { type: "text/csv" });
          const a = document.createElement("a");
          a.href = URL.createObjectURL(blob);
          a.download = `pld-avisos-${m}.csv`;
          a.click();
          URL.revokeObjectURL(a.href);
        },
      });
  }

  clientLabel(op: PldOp): string {
    const c = op.client;
    if (!c) return "—";
    return c.companyName || [c.firstName, c.lastName].filter(Boolean).join(" ");
  }

  money(v: string): string {
    return Number(v).toLocaleString("es-MX", {
      style: "currency",
      currency: "MXN",
      maximumFractionDigits: 0,
    });
  }
}
