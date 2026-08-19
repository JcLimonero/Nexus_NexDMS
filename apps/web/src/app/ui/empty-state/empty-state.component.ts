import { Component, input } from '@angular/core';

@Component({
  selector: 'app-ui-empty-state',
  standalone: true,
  template: `
    <div class="ui-empty-state">
      <p class="ui-empty-message">{{ message() }}</p>
      <ng-content />
    </div>
  `,
  styles: [`
    .ui-empty-state {
      text-align: center;
      padding: var(--space-32);
      color: var(--text-muted);
    }
    .ui-empty-message {
      margin: 0 0 var(--space-16);
      font-size: var(--text-sm);
    }
  `],
})
export class UiEmptyState {
  message = input('No hay datos para mostrar.');
}
