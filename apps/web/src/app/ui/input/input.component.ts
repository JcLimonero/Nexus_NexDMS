import { Component, input, model } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-ui-input',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="ui-input-wrapper">
      @if (label()) {
        <label class="ui-input-label">{{ label() }}</label>
      }
      <input
        class="ui-input"
        [type]="type()"
        [placeholder]="placeholder()"
        [disabled]="disabled()"
        [readonly]="readonly()"
        [ngModel]="model()"
        (ngModelChange)="model.set($event)"
      />
      @if (hint()) {
        <span class="ui-input-hint">{{ hint() }}</span>
      }
      @if (error()) {
        <span class="ui-input-error">{{ error() }}</span>
      }
    </div>
  `,
  styles: [`
    .ui-input-wrapper {
      display: flex;
      flex-direction: column;
      gap: var(--space-12);
    }
    .ui-input-label {
      font-size: var(--text-sm);
      font-weight: var(--font-medium);
      color: var(--text-primary);
    }
    .ui-input {
      width: 100%;
      min-height: var(--input-height);
      padding: var(--input-padding-y) var(--input-padding-x);
      font-size: var(--text-sm);
      color: var(--text-primary);
      background: var(--input-bg);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    .ui-input::placeholder {
      color: var(--text-muted);
    }
    .ui-input:hover:not(:disabled):not(:focus) {
      border-color: var(--border-hover);
    }
    .ui-input:focus {
      outline: none;
      border-color: var(--primary);
      box-shadow: var(--focus-ring);
    }
    .ui-input:disabled {
      background: var(--bg);
      color: var(--text-muted);
      cursor: not-allowed;
    }
    .ui-input-hint {
      font-size: var(--text-xs);
      color: var(--text-muted);
    }
    .ui-input-error {
      font-size: var(--text-xs);
      color: var(--danger);
    }
  `],
})
export class UiInput {
  type = input<'text' | 'email' | 'password' | 'number' | 'search'>('text');
  placeholder = input('');
  label = input<string | null>(null);
  hint = input<string | null>(null);
  error = input<string | null>(null);
  disabled = input(false);
  readonly = input(false);
  model = model<string>('');
}
