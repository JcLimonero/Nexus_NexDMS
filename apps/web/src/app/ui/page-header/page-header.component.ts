import { Component, input } from '@angular/core';

@Component({
  selector: 'app-ui-page-header',
  standalone: true,
  template: `
    <div class="ui-page-header">
      <div class="ui-page-header-content">
        <h1 class="ui-page-title">{{ title() }}</h1>
        @if (description()) {
          <p class="ui-page-description">{{ description() }}</p>
        }
      </div>
      <div class="ui-page-header-actions">
        <ng-content select="[actions]" />
      </div>
    </div>
  `,
  styles: [`
    .ui-page-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--space-24);
      margin-bottom: var(--space-24);
    }
    .ui-page-title {
      margin: 0;
      font-size: var(--text-page-title);
      font-weight: var(--text-page-title-weight);
      color: var(--text-primary);
    }
    .ui-page-description {
      margin: var(--space-4) 0 0;
      font-size: var(--text-caption);
      font-weight: var(--text-caption-weight);
      color: var(--text-secondary);
    }
    .ui-page-header-actions {
      flex-shrink: 0;
    }
  `],
})
export class UiPageHeader {
  title = input('');
  description = input<string | null>(null);
}
