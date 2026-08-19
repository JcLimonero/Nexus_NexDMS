import { Component, input } from '@angular/core';

@Component({
  selector: 'app-ui-alert',
  standalone: true,
  template: `
    <div class="ui-alert" [class]="variantClass()">
      <ng-content />
    </div>
  `,
  styles: [`
    .ui-alert {
      padding: var(--space-12) var(--space-16);
      border-radius: var(--radius-sm);
      font-size: var(--text-sm);
      border: 1px solid;
    }
    .ui-alert-danger {
      background: var(--danger-bg);
      border-color: var(--danger);
      color: var(--danger);
    }
    .ui-alert-warning {
      background: var(--warning-bg);
      border-color: var(--warning);
      color: #92400E;
    }
    .ui-alert-success {
      background: var(--success-bg);
      border-color: var(--success);
      color: var(--success);
    }
    .ui-alert-info {
      background: #EFF6FF;
      border-color: var(--info);
      color: var(--info);
    }
  `],
})
export class UiAlert {
  variant = input<'danger' | 'warning' | 'success' | 'info'>('danger');

  variantClass() {
    return `ui-alert-${this.variant()}`;
  }
}
