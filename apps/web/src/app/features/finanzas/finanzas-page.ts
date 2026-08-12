import { Component, OnInit, computed, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { HttpClient } from "@angular/common/http";
import { ToastrService } from "ngx-toastr";

interface FinanceDoc {
  id: string;
  concept: string;
  total: string;
  paidAmount: string;
  dueDate: string | null;
  status: string;
  client?: { firstName?: string; lastName?: string; companyName?: string };
  supplier?: { name?: string };
  beneficiaryName?: string | null;
}

interface Aging {
  totalOpen: number;
  buckets: { key: string; label: string; count: number; amount: number }[];
}

/** Cuentas por cobrar / por pagar con antigüedad y registro de abonos. */
@Component({
  selector: "app-finanzas-page",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./finanzas-page.html",
  styleUrls: ["./finanzas-page.scss"],
})
export class FinanzasPage implements OnInit {
  private http = inject(HttpClient);
  private toastr = inject(ToastrService);

  kind = signal<"receivables" | "payables">("receivables");
  docs = signal<FinanceDoc[]>([]);
  aging = signal<Aging | null>(null);
  loading = signal(true);
  payingId = signal<string | null>(null);
  payAmount = 0;

  title = computed(() =>
    this.kind() === "receivables" ? "Cuentas por cobrar" : "Cuentas por pagar",
  );

  ngOnInit(): void {
    this.load();
  }

  setKind(k: "receivables" | "payables"): void {
    this.kind.set(k);
    this.payingId.set(null);
    this.load();
  }

  load(): void {
    this.loading.set(true);
    const base = `/api/v1/finance/${this.kind()}`;
    this.http.get<FinanceDoc[]>(base).subscribe({
      next: (d) => {
        this.docs.set(d);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
    this.http.get<Aging>(`${base}/aging`).subscribe({
      next: (a) => this.aging.set(a),
    });
  }

  balance(d: FinanceDoc): number {
    return Number(d.total) - Number(d.paidAmount);
  }

  whoLabel(d: FinanceDoc): string {
    if (this.kind() === "receivables") {
      const c = d.client;
      return c
        ? c.companyName || [c.firstName, c.lastName].filter(Boolean).join(" ")
        : "—";
    }
    return d.supplier?.name || d.beneficiaryName || "—";
  }

  statusClass(s: string): string {
    return (
      { OPEN: "badge-warning", PARTIAL: "badge-info", PAID: "badge-success" }[
        s
      ] ?? "badge-secondary"
    );
  }

  statusLabel(s: string): string {
    return (
      { OPEN: "Abierta", PARTIAL: "Abono parcial", PAID: "Pagada", CANCELLED: "Cancelada" }[s] ?? s
    );
  }

  startPay(d: FinanceDoc): void {
    this.payingId.set(d.id);
    this.payAmount = this.balance(d);
  }

  confirmPay(d: FinanceDoc): void {
    this.http
      .post(`/api/v1/finance/${this.kind()}/${d.id}/payments`, {
        amount: this.payAmount,
      })
      .subscribe({
        next: () => {
          this.toastr.success("Pago registrado");
          this.payingId.set(null);
          this.load();
        },
        error: (err) =>
          this.toastr.error(err?.error?.message || "Error al registrar pago"),
      });
  }

  money(n: number): string {
    return n.toLocaleString("es-MX", { style: "currency", currency: "MXN" });
  }
}
