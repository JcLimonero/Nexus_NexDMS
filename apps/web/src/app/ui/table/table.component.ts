import { Component } from '@angular/core';

@Component({
  selector: 'app-ui-table',
  standalone: true,
  template: `
    <div class="ui-table-wrapper">
      <table class="ui-table">
        <ng-content />
      </table>
    </div>
  `,
  styles: [`
    .ui-table-wrapper {
      overflow-x: auto;
    }
    .ui-table {
      width: 100%;
      border-collapse: collapse;
      font-size: var(--text-sm);
    }
    .ui-table th,
    .ui-table td {
      padding: var(--space-12) var(--space-16);
      text-align: left;
      border-bottom: 1px solid var(--border);
    }
    .ui-table th {
      font-weight: var(--font-medium);
      color: var(--text-secondary);
      background: var(--bg);
    }
    .ui-table tbody tr:hover {
      background: var(--bg);
    }
    .ui-table tbody tr:last-child td {
      border-bottom: none;
    }
    .ui-table .text-center { text-align: center; }
    .ui-table .text-end { text-align: right; }
  `],
})
export class UiTable {}
