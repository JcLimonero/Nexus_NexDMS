import { Component, input } from '@angular/core';

@Component({
  selector: 'app-ui-badge',
  standalone: true,
  template: `<span class="ui-badge" [class]="variantClass()"><ng-content /></span>`,
  styles: [`
    .ui-badge {
      display: inline-flex;
      align-items: center;
      padding: 2px var(--space-8);
      font-size: var(--text-xs);
      font-weight: var(--font-medium);
      border-radius: 6px;
    }
    .ui-badge-default {
      background: var(--bg);
      color: var(--text-secondary);
      border: 1px solid var(--border);
    }
    .ui-badge-success {
      background: var(--success-bg);
      color: var(--success);
    }
    .ui-badge-warning {
      background: var(--warning-bg);
      color: var(--warning);
    }
    .ui-badge-danger {
      background: var(--danger-bg);
      color: var(--danger);
    }
    .ui-badge-primary {
      background: var(--primary);
      color: white;
    }
  `],
})
export class UiBadge {
  variant = input<'default' | 'success' | 'warning' | 'danger' | 'primary'>('default');

  variantClass() {
    return `ui-badge-${this.variant()}`;
  }
}
