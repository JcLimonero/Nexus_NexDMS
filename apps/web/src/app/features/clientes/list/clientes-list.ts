import { Component, OnInit, inject, signal, computed } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { RouterModule } from "@angular/router";
import { Subject } from "rxjs";
import { debounceTime, distinctUntilChanged, switchMap } from "rxjs/operators";

import { ClientesService } from "../clientes.service";
import { ClientTypesService } from "../client-types.service";
import { ClientTypeOption } from "../models/client-type.model";
import {
  Client,
  ClientListItem,
  ClientType,
  ClientsResponse,
} from "../models/client.model";

@Component({
  selector: "app-clientes-list",
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: "./clientes-list.html",
  styleUrls: ["./clientes-list.scss"],
})
export class ClientesList implements OnInit {
  private clientesService = inject(ClientesService);
  private clientTypesService = inject(ClientTypesService);

  clients = signal<ClientListItem[]>([]);
  clientTypes = signal<ClientTypeOption[]>([]);
  meta = signal<ClientsResponse["meta"] | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);
  searchTerm = signal("");
  clientTypeFilter = signal<string>("");

  private searchSubject = new Subject<void>();

  ngOnInit(): void {
    this.clientTypesService.getAll().subscribe({
      next: (types) => this.clientTypes.set(types),
    });

    this.searchSubject
      .pipe(
        debounceTime(300),
        switchMap(() => {
          const ct = this.clientTypeFilter();
          return this.clientesService.getAll({
            search: this.searchTerm() || undefined,
            clientType:
              ct === "INDIVIDUAL" || ct === "BUSINESS" ? (ct as ClientType) : undefined,
            page: this.meta()?.page ?? 1,
            limit: 20,
          });
        }),
      )
      .subscribe({
        next: (res) => {
          this.clients.set(res.data);
          this.meta.set(res.meta);
          this.loading.set(false);
          this.error.set(null);
        },
        error: (err) => {
          this.loading.set(false);
          this.error.set(err?.error?.message || "Error al cargar clientes");
        },
      });

    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.searchSubject.next();
  }

  onSearchChange(value: string): void {
    this.searchTerm.set(value);
    this.meta.update((m) => (m ? { ...m, page: 1 } : null));
    this.load();
  }

  onTypeFilterChange(value: string): void {
    this.clientTypeFilter.set(value);
    this.meta.update((m) => (m ? { ...m, page: 1 } : null));
    this.load();
  }

  goToPage(page: number): void {
    const m = this.meta();
    if (!m || page < 1 || page > m.totalPages) return;
    this.meta.update((prev) => (prev ? { ...prev, page } : null));
    this.load();
  }

  deleteClient(client: ClientListItem, event: Event): void {
    event.preventDefault();
    if (!confirm(`¿Eliminar a ${this.clientesService.getDisplayName(client)}?`)) {
      return;
    }
    this.clientesService.delete(client.id).subscribe({
      next: () => this.load(),
      error: (err) =>
        alert(err?.error?.message || "Error al eliminar el cliente"),
    });
  }

  getDisplayName(client: ClientListItem): string {
    return this.clientesService.getDisplayName(client);
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
}
