import { Component, input } from '@angular/core';

@Component({
  selector: 'app-ui-kpi-card',
  standalone: true,
  template: `
    <div class="ui-kpi-card">
      <div class="ui-kpi-content">
        <span class="ui-kpi-label">{{ label() }}</span>
        <span class="ui-kpi-value">{{ value() }}</span>
      </div>
      @if (trend()) {
        <span class="ui-kpi-trend" [class.positive]="trend()?.startsWith('+')" [class.negative]="trend()?.startsWith('-')">
          {{ trend() }}
        </span>
      }
    </div>
  `,
  styles: [`
    .ui-kpi-card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      padding: var(--space-24);
      transition: border-color 0.15s;
    }
    .ui-kpi-card:hover {
      border-color: var(--border-hover);
    }
    .ui-kpi-content {
      display: flex;
      flex-direction: column;
      gap: var(--space-4);
    }
    .ui-kpi-label {
      font-size: var(--text-sm);
      color: var(--text-secondary);
    }
    .ui-kpi-value {
      font-size: var(--text-2xl);
      font-weight: var(--font-semibold);
      color: var(--text-primary);
    }
    .ui-kpi-trend {
      display: inline-block;
      margin-top: var(--space-8);
      font-size: var(--text-xs);
      color: var(--text-muted);
    }
    .ui-kpi-trend.positive { color: var(--success); }
    .ui-kpi-trend.negative { color: var(--danger); }
  `],
})
export class UiKpiCard {
  label = input('');
  value = input('');
  trend = input<string | null>(null);
}
