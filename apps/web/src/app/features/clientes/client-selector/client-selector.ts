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

  /**
   * Lista opcional de clientes ya cargados. Ya NO es obligatoria: el selector
   * busca en el servidor (typeahead), así que los formularios no necesitan
   * precargar cientos de clientes para usarlo.
   */
  clients = input<ClientListItem[]>([]);
  selectedId = input<string>("");

  selectedIdChange = output<string>();
  reload = output<void>();

  searchTerm = signal("");
  showDropdown = signal(false);
  searchResults = signal<ClientListItem[]>([]);
  searchLoading = signal(false);
  /** Cliente elegido/resuelto, para mostrar su nombre sin tener toda la lista. */
  private selectedCache = signal<ClientListItem | null>(null);

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
    const enLista = this.clients().find((c) => c.id === id);
    if (enLista) return enLista;
    const cache = this.selectedCache();
    return cache && cache.id === id ? cache : null;
  });

  displayValue = computed(() => {
    const c = this.selectedClient();
    if (c) return this.clientesService.getDisplayName(c);
    return this.searchTerm() || "Buscar o seleccionar cliente...";
  });

  constructor() {
    effect(() => {
      const id = this.selectedId();
      if (!id) return;
      const c = this.clients().find((x) => x.id === id) ?? this.selectedCache();
      if (c && c.id === id) {
        this.searchTerm.set(this.clientesService.getDisplayName(c));
        return;
      }
      // No está en la lista precargada (o no se precargó ninguna): se resuelve
      // el nombre por id, sin traer todos los clientes.
      this.clientesService.getById(id).subscribe({
        next: (det) => {
          const item = det as unknown as ClientListItem;
          this.selectedCache.set(item);
          this.searchTerm.set(this.clientesService.getDisplayName(item));
        },
        error: () => undefined,
      });
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
    this.selectedCache.set(client);
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
    window.open("/clients/nuevo", "_blank", "noopener,noreferrer");
  }

  onReload(): void {
    this.reload.emit();
  }

  getDisplayName(client: ClientListItem): string {
    return this.clientesService.getDisplayName(client);
  }
}
