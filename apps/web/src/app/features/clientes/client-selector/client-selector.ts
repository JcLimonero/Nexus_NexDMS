import {
  Component,
  inject,
  input,
  output,
  signal,
  computed,
  effect,
  DestroyRef,
} from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Subject, of } from "rxjs";
import {
  debounceTime,
  distinctUntilChanged,
  switchMap,
  tap,
} from "rxjs/operators";
import { ClientListItem } from "../models/client.model";
import { ClientesService } from "../clientes.service";

@Component({
  selector: "app-client-selector",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./client-selector.html",
  styleUrls: ["./client-selector.scss"],
})
export class ClientSelector {
  private clientesService = inject(ClientesService);
  private destroyRef = inject(DestroyRef);

  clients = input.required<ClientListItem[]>();
  selectedId = input<string>("");

  selectedIdChange = output<string>();
  reload = output<void>();

  searchTerm = signal("");
  showDropdown = signal(false);
  searchResults = signal<ClientListItem[]>([]);
  searchLoading = signal(false);

  private searchSubject = new Subject<string>();

  filteredClients = computed(() => {
    const term = this.searchTerm().trim();
    if (!term) {
      return this.clients().slice(0, 50);
    }
    return this.searchResults();
  });

  selectedClient = computed(() => {
    const id = this.selectedId();
    if (!id) return null;
    return this.clients().find((c) => c.id === id) ?? null;
  });

  displayValue = computed(() => {
    const c = this.selectedClient();
    if (c) return this.clientesService.getDisplayName(c);
    return this.searchTerm() || "Buscar o seleccionar cliente...";
  });

  constructor() {
    effect(() => {
      const id = this.selectedId();
      if (id) {
        const c = this.clients().find((x) => x.id === id);
        if (c) {
          this.searchTerm.set(this.clientesService.getDisplayName(c));
        }
      }
    });

    this.searchSubject
      .pipe(
        debounceTime(250),
        distinctUntilChanged(),
        switchMap((term) => {
          const t = term.trim();
          if (!t) {
            this.searchResults.set([]);
            return of([]);
          }
          this.searchLoading.set(true);
          return this.clientesService.search(t, 50).pipe(
            tap(() => this.searchLoading.set(false)),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (data) => this.searchResults.set(data),
        error: () => {
          this.searchLoading.set(false);
          this.searchResults.set([]);
        },
      });
  }

  onFocus(): void {
    this.showDropdown.set(true);
  }

  onBlur(): void {
    setTimeout(() => this.showDropdown.set(false), 150);
  }

  selectClient(client: ClientListItem): void {
    this.selectedIdChange.emit(client.id);
    this.searchTerm.set(this.clientesService.getDisplayName(client));
    this.showDropdown.set(false);
  }

  clearSelection(): void {
    this.selectedIdChange.emit("");
    this.searchTerm.set("");
  }

  onSearchInput(value: string): void {
    this.searchTerm.set(value);
    this.searchSubject.next(value);
    const current = this.selectedClient();
    const matchesCurrent =
      current && value === this.clientesService.getDisplayName(current);
    if (!value || !matchesCurrent) {
      this.selectedIdChange.emit("");
    }
    if (!value.trim()) {
      this.searchResults.set([]);
    }
    this.showDropdown.set(true);
  }

  openNewClient(): void {
    window.open("/clientes/nuevo", "_blank", "noopener,noreferrer");
  }

  onReload(): void {
    this.reload.emit();
  }

  getDisplayName(client: ClientListItem): string {
    return this.clientesService.getDisplayName(client);
  }
}
