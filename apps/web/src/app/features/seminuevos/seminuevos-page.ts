import { Component, OnInit, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { HttpClient } from "@angular/common/http";
import { ToastrService } from "ngx-toastr";

interface Intake {
  id: string;
  sellerName: string;
  sellerPhone: string | null;
  brand: string;
  model: string;
  year: number | null;
  plate: string | null;
  km: number | null;
  askingPrice: string | null;
  appraisedValue: string | null;
  offeredValue: string | null;
  status: string;
}

const LABELS: Record<string, string> = {
  DRAFT: "Borrador",
  APPRAISED: "Avaluada",
  OFFERED: "Ofertada",
  ACCEPTED: "Aceptada",
  PURCHASED: "Comprada",
  REJECTED: "Rechazada",
};

const NEXT: Record<string, string[]> = {
  DRAFT: ["APPRAISED", "REJECTED"],
  APPRAISED: ["OFFERED", "REJECTED"],
  OFFERED: ["ACCEPTED", "REJECTED"],
  ACCEPTED: ["PURCHASED", "REJECTED"],
};

/** Tomas de seminuevos: avalúo → oferta → compra (genera CxP). */
@Component({
  selector: "app-seminuevos-page",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./seminuevos-page.html",
  styleUrls: ["./seminuevos-page.scss"],
})
export class SeminuevosPage implements OnInit {
  private http = inject(HttpClient);
  private toastr = inject(ToastrService);

  intakes = signal<Intake[]>([]);
  loading = signal(true);
  showForm = signal(false);
  editingValues = signal<string | null>(null);

  form = {
    sellerName: "",
    sellerPhone: "",
    brand: "",
    model: "",
    year: null as number | null,
    plate: "",
    km: null as number | null,
    askingPrice: null as number | null,
  };

  values = { appraisedValue: null as number | null, offeredValue: null as number | null };

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.http.get<Intake[]>("/api/v1/used-units").subscribe({
      next: (d) => {
        this.intakes.set(d);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  label(s: string): string {
    return LABELS[s] ?? s;
  }

  statusClass(s: string): string {
    return (
      {
        DRAFT: "badge-secondary",
        APPRAISED: "badge-info",
        OFFERED: "badge-warning",
        ACCEPTED: "badge-info",
        PURCHASED: "badge-success",
        REJECTED: "badge-danger",
      }[s] ?? "badge-secondary"
    );
  }

  next(i: Intake): string[] {
    return NEXT[i.status] ?? [];
  }

  save(): void {
    if (!this.form.sellerName || !this.form.brand || !this.form.model) return;
    this.http.post("/api/v1/used-units", this.form).subscribe({
      next: () => {
        this.toastr.success("Toma registrada");
        this.showForm.set(false);
        this.form = {
          sellerName: "", sellerPhone: "", brand: "", model: "",
          year: null, plate: "", km: null, askingPrice: null,
        };
        this.load();
      },
      error: (err) => this.toastr.error(err?.error?.message || "Error"),
    });
  }

  startValues(i: Intake): void {
    this.editingValues.set(i.id);
    this.values = {
      appraisedValue: i.appraisedValue ? +i.appraisedValue : null,
      offeredValue: i.offeredValue ? +i.offeredValue : null,
    };
  }

  saveValues(i: Intake): void {
    this.http.patch(`/api/v1/used-units/${i.id}`, this.values).subscribe({
      next: () => {
        this.editingValues.set(null);
        this.load();
      },
      error: (err) => this.toastr.error(err?.error?.message || "Error"),
    });
  }

  advance(i: Intake, status: string): void {
    this.http.post(`/api/v1/used-units/${i.id}/status`, { status }).subscribe({
      next: () => {
        if (status === "PURCHASED") {
          this.toastr.success("Compra registrada — se generó la cuenta por pagar");
        }
        this.load();
      },
      error: (err) => this.toastr.error(err?.error?.message || "Error"),
    });
  }

  money(v: string | null): string {
    return v
      ? Number(v).toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 })
      : "—";
  }
}
