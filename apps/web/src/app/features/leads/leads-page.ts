import { Component, OnInit, computed, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { HttpClient } from "@angular/common/http";
import { ToastrService } from "ngx-toastr";

interface Lead {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  source: string;
  interest: string | null;
  status: string;
  clientId: string | null;
  updatedAt: string;
}

const COLUMNS = [
  { key: "NEW", label: "Nuevos" },
  { key: "CONTACTED", label: "Contactados" },
  { key: "QUALIFIED", label: "Calificados" },
  { key: "OPPORTUNITY", label: "Oportunidad" },
  { key: "WON", label: "Ganados" },
  { key: "LOST", label: "Perdidos" },
];

const NEXT: Record<string, string[]> = {
  NEW: ["CONTACTED", "LOST"],
  CONTACTED: ["QUALIFIED", "LOST"],
  QUALIFIED: ["OPPORTUNITY", "LOST"],
  OPPORTUNITY: ["WON", "LOST"],
};

/** Pipeline de leads en tablero por estatus. */
@Component({
  selector: "app-leads-page",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./leads-page.html",
  styleUrls: ["./leads-page.scss"],
})
export class LeadsPage implements OnInit {
  private http = inject(HttpClient);
  private toastr = inject(ToastrService);

  readonly columns = COLUMNS;
  leads = signal<Lead[]>([]);
  loading = signal(true);
  showForm = signal(false);

  form = { name: "", phone: "", source: "PISO", interest: "" };

  byStatus = computed(() => {
    const map: Record<string, Lead[]> = {};
    for (const c of COLUMNS) map[c.key] = [];
    for (const l of this.leads()) (map[l.status] ?? (map[l.status] = [])).push(l);
    return map;
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.http.get<Lead[]>("/api/v1/leads").subscribe({
      next: (d) => {
        this.leads.set(d);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  nextStatuses(l: Lead): string[] {
    return NEXT[l.status] ?? [];
  }

  statusLabel(s: string): string {
    return COLUMNS.find((c) => c.key === s)?.label ?? s;
  }

  advance(l: Lead, status: string): void {
    this.http.post(`/api/v1/leads/${l.id}/status`, { status }).subscribe({
      next: () => this.load(),
      error: (err) => this.toastr.error(err?.error?.message || "Error"),
    });
  }

  convert(l: Lead): void {
    this.http.post(`/api/v1/leads/${l.id}/convert`, {}).subscribe({
      next: () => {
        this.toastr.success("Lead convertido a cliente");
        this.load();
      },
      error: (err) => this.toastr.error(err?.error?.message || "Error"),
    });
  }

  save(): void {
    if (!this.form.name.trim()) return;
    this.http
      .post("/api/v1/leads", {
        name: this.form.name,
        phone: this.form.phone || undefined,
        source: this.form.source,
        interest: this.form.interest || undefined,
      })
      .subscribe({
        next: () => {
          this.toastr.success("Lead creado");
          this.form = { name: "", phone: "", source: "PISO", interest: "" };
          this.showForm.set(false);
          this.load();
        },
        error: (err) => this.toastr.error(err?.error?.message || "Error"),
      });
  }
}
