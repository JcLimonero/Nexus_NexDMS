import { Component, input } from '@angular/core';

@Component({
  selector: 'app-ui-card',
  standalone: true,
  template: `
    <div class="ui-card">
      @if (header()) {
        <div class="ui-card-header">
          <div class="ui-card-header-content">
            <h3 class="ui-card-title">{{ header() }}</h3>
            @if (subtitle()) {
              <span class="ui-card-subtitle">{{ subtitle() }}</span>
            }
          </div>
          <div class="ui-card-header-actions">
            <ng-content select="[headerActions]" />
          </div>
        </div>
      }
      <div class="ui-card-body">
        <ng-content />
      </div>
    </div>
  `,
  styles: [`
    .ui-card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      overflow: hidden;
    }
    .ui-card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-16);
      padding: var(--space-16) var(--space-24);
      border-bottom: 1px solid var(--border);
    }
    .ui-card-header-content {
      display: flex;
      flex-direction: column;
      gap: var(--space-4);
    }
    .ui-card-title {
      margin: 0;
      font-size: var(--text-section-title);
      font-weight: var(--text-section-title-weight);
      color: var(--text-primary);
    }
    .ui-card-subtitle {
      font-size: var(--text-caption);
      font-weight: var(--text-caption-weight);
      color: var(--text-secondary);
    }
    .ui-card-header-actions {
      flex-shrink: 0;
    }
    .ui-card-body {
      padding: var(--space-24);
    }
  `],
})
export class UiCard {
  header = input<string | null>(null);
  subtitle = input<string | null>(null);
}
