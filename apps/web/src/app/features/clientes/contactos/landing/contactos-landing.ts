import { Component, OnInit, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { RouterModule } from "@angular/router";
import { Subject } from "rxjs";
import { debounceTime, distinctUntilChanged, switchMap } from "rxjs/operators";

import { ClientesService } from "../../clientes.service";
import { Client } from "../../models/client.model";
import { FeatherIcons } from "../../../../shared/components/feather-icons/feather-icons";

@Component({
  selector: "app-contactos-landing",
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, FeatherIcons],
  templateUrl: "./contactos-landing.html",
  styles: [
    `.contactos-landing-card .card-header span {
      color: var(--text-muted, #6b7280);
      font-size: 0.9rem;
    }`,
  ],
})
export class ContactosLanding implements OnInit {
  private clientesService = inject(ClientesService);

  clients = signal<Client[]>([]);
  loading = signal(false);
  searchTerm = signal("");
  private searchSubject = new Subject<string>();

  ngOnInit(): void {
    this.searchSubject
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((q) => {
          this.loading.set(true);
          return this.clientesService.getAll({
            search: q || undefined,
            limit: 20,
          });
        }),
      )
      .subscribe({
        next: (res) => {
          this.clients.set(res.data);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });

    this.search("");
  }

  onSearchChange(value: string): void {
    this.searchTerm.set(value);
    this.searchSubject.next(value);
  }

  search(q: string): void {
    this.searchSubject.next(q);
  }

  getDisplayName(client: Client): string {
    return this.clientesService.getDisplayName(client);
  }
}
