import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-ui-pagination',
  standalone: true,
  template: `
    <nav class="ui-pagination">
      <span class="ui-pagination-info">{{ infoText() }}</span>
      <div class="ui-pagination-controls">
        <button
          class="ui-pagination-btn"
          [disabled]="page() <= 1"
          (click)="pageChange.emit(page() - 1)"
        >
          Anterior
        </button>
        <button
          class="ui-pagination-btn"
          [disabled]="page() >= totalPages()"
          (click)="pageChange.emit(page() + 1)"
        >
          Siguiente
        </button>
      </div>
    </nav>
  `,
  styles: [`
    .ui-pagination {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-16);
      padding: var(--space-12) 0;
    }
    .ui-pagination-info {
      font-size: var(--text-sm);
      color: var(--text-muted);
    }
    .ui-pagination-controls {
      display: flex;
      gap: var(--space-8);
    }
    .ui-pagination-btn {
      padding: var(--space-8) var(--space-16);
      font-size: var(--text-sm);
      color: var(--text-primary);
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      cursor: pointer;
      transition: background 0.15s;
    }
    .ui-pagination-btn:hover:not(:disabled) {
      background: var(--bg);
    }
    .ui-pagination-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `],
})
export class UiPagination {
  page = input(1);
  totalPages = input(1);
  total = input(0);
  label = input('elemento(s)');

  pageChange = output<number>();

  infoText() {
    const t = this.total();
    const p = this.page();
    const tp = this.totalPages();
    const lbl = this.label();
    return `${t} ${lbl} · Página ${p} de ${tp}`;
  }
}
