import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-ui-button',
  standalone: true,
  imports: [RouterLink],
  template: `
    @if (routerLink()) {
      <a
        [routerLink]="routerLink()!"
        [class]="buttonClass()"
        [attr.disabled]="disabled() ? true : null"
      >
        <ng-content />
      </a>
    } @else {
      <button
        [type]="type()"
        [class]="buttonClass()"
        [disabled]="disabled()"
      >
        <ng-content />
      </button>
    }
  `,
  styles: [`
    :host {
      display: inline-flex;
    }
    a, button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-8);
      padding: var(--space-8) var(--space-16);
      font-size: var(--text-sm);
      font-weight: var(--font-medium);
      border-radius: var(--radius-sm);
      border: 1px solid transparent;
      transition: background-color 0.15s, border-color 0.15s;
      cursor: pointer;
      text-decoration: none;
    }
    a:disabled, button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-primary {
      background: var(--primary);
      color: white;
      border-color: var(--primary);
    }
    .btn-primary:hover:not(:disabled) {
      background: var(--primary-hover);
      border-color: var(--primary-hover);
    }

    .btn-secondary {
      background: var(--bg);
      color: var(--text-primary);
      border-color: var(--border);
    }
    .btn-secondary:hover:not(:disabled) {
      background: var(--border);
    }

    .btn-ghost {
      background: transparent;
      color: var(--text-primary);
    }
    .btn-ghost:hover:not(:disabled) {
      background: var(--bg);
    }

    .btn-danger {
      background: var(--danger);
      color: white;
      border-color: var(--danger);
    }
    .btn-danger:hover:not(:disabled) {
      background: #B91C1C;
      border-color: #B91C1C;
    }

    .btn-outline-primary {
      background: transparent;
      color: var(--primary);
      border-color: var(--border);
    }
    .btn-outline-primary:hover:not(:disabled) {
      background: rgba(17, 24, 39, 0.06);
      border-color: var(--primary);
    }

    .btn-outline-secondary {
      background: transparent;
      color: var(--text-secondary);
      border-color: var(--border);
    }
    .btn-outline-secondary:hover:not(:disabled) {
      background: var(--bg);
      border-color: var(--border-hover);
    }

    .btn-outline-danger {
      background: transparent;
      color: var(--danger);
      border-color: var(--border);
    }
    .btn-outline-danger:hover:not(:disabled) {
      background: var(--danger-bg);
      border-color: var(--danger);
    }

    .btn-sm {
      padding: var(--space-4) var(--space-12);
      font-size: var(--text-xs);
    }

    .btn-lg {
      padding: var(--space-12) var(--space-24);
      font-size: var(--text-base);
    }
  `],
})
export class UiButton {
  variant = input<'primary' | 'secondary' | 'ghost' | 'danger' | 'outline-primary' | 'outline-secondary' | 'outline-danger'>('primary');
  size = input<'sm' | 'md' | 'lg'>('md');
  type = input<'button' | 'submit'>('button');
  disabled = input(false);
  routerLink = input<string | string[] | null>(null);

  buttonClass() {
    const v = this.variant();
    const s = this.size();
    const base = 'app-ui-button';
    const sizeClass = s !== 'md' ? `btn-${s}` : '';
    return `${base} btn-${v} ${sizeClass}`.trim();
  }
}
