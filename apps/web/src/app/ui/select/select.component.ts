import { Component, input, model } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-ui-select',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="ui-select-wrapper">
      @if (label()) {
        <label class="ui-select-label">{{ label() }}</label>
      }
      <select
        class="ui-select"
        [disabled]="disabled()"
        [ngModel]="model()"
        (ngModelChange)="model.set($event)"
      >
        @for (opt of options(); track opt.value) {
          <option [value]="opt.value">{{ opt.label }}</option>
        }
      </select>
      @if (error()) {
        <span class="ui-select-error">{{ error() }}</span>
      }
    </div>
  `,
  styles: [`
    .ui-select-wrapper {
      display: flex;
      flex-direction: column;
      gap: var(--space-12);
    }
    .ui-select-label {
      font-size: var(--text-sm);
      font-weight: var(--font-medium);
      color: var(--text-primary);
    }
    .ui-select {
      width: 100%;
      min-height: var(--input-height);
      padding: var(--input-padding-y) var(--input-padding-x);
      padding-right: 3rem;
      font-size: var(--text-sm);
      color: var(--text-primary);
      background: var(--input-bg);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      cursor: pointer;
      appearance: auto;
      transition: border-color 0.15s;
    }
    .ui-select:hover:not(:disabled) {
      border-color: var(--border-hover);
    }
    .ui-select:focus {
      outline: none;
      border-color: var(--primary);
      box-shadow: var(--focus-ring);
    }
    .ui-select:disabled {
      background: var(--bg);
      cursor: not-allowed;
    }
    .ui-select-error {
      font-size: var(--text-xs);
      color: var(--danger);
    }
  `],
})
export class UiSelect {
  label = input<string | null>(null);
  options = input<{ value: string; label: string }[]>([]);
  disabled = input(false);
  error = input<string | null>(null);
  model = model<string>('');
}
