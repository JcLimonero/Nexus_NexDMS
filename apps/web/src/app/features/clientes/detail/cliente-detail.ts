import { Component, OnInit, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ActivatedRoute, Router, RouterModule } from "@angular/router";
import { ToastrService } from "ngx-toastr";

import { ClientesService } from "../clientes.service";
import { ClientTypesService } from "../client-types.service";
import { ClientTypeOption } from "../models/client-type.model";
import { ClientDetail } from "../models/client.model";
import { EvidenciaRecepcion } from "../../../shared/components/evidencia-recepcion/evidencia-recepcion";

@Component({
  selector: "app-cliente-detail",
  standalone: true,
  imports: [CommonModule, RouterModule, EvidenciaRecepcion],
  templateUrl: "./cliente-detail.html",
  styleUrls: ["./cliente-detail.scss"],
})
export class ClienteDetail implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private clientesService = inject(ClientesService);
  private clientTypesService = inject(ClientTypesService);
  private toastr = inject(ToastrService);

  client = signal<ClientDetail | null>(null);
  clientTypes = signal<ClientTypeOption[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get("id");
    if (!id) {
      this.router.navigate(["/clientes"]);
      return;
    }

    this.clientesService.getById(id).subscribe({
      next: (c) => {
        this.client.set(c);
        this.loading.set(false);
        this.error.set(null);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.message || "Error al cargar cliente");
      },
    });
  }

  getDisplayName(c: ClientDetail): string {
    return this.clientesService.getDisplayName(c);
  }

  getTypeLabel(code: string): string {
    return this.clientTypesService.getLabelForCode(code, this.clientTypes());
  }

  getQualityBadgeClass(level: string): string {
    const map: Record<string, string> = {
      basic: "bg-secondary",
      partial: "bg-warning text-dark",
      operational: "bg-info",
      complete: "bg-success",
    };
    return map[level] ?? "bg-secondary";
  }

  getQualityLabel(level: string): string {
    const map: Record<string, string> = {
      basic: "Básico",
      partial: "Parcial",
      operational: "Operativo",
      complete: "Completo",
    };
    return map[level] ?? level;
  }

  deleteClient(): void {
    const c = this.client();
    if (!c || !confirm(`¿Eliminar a ${this.getDisplayName(c)}?`)) return;

    this.clientesService.delete(c.id).subscribe({
      next: () => {
        this.toastr.success("Cliente eliminado");
        this.router.navigate(["/clientes"]);
      },
      error: (err) =>
        this.toastr.error(err?.error?.message || "Error al eliminar"),
    });
  }
}
