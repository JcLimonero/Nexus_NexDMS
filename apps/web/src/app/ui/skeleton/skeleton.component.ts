import { Component, input } from '@angular/core';

@Component({
  selector: 'app-ui-skeleton',
  standalone: true,
  template: `<div class="ui-skeleton" [style.width]="width()" [style.height]="height()"></div>`,
  styles: [`
    .ui-skeleton {
      background: linear-gradient(90deg, var(--border) 25%, var(--bg) 50%, var(--border) 75%);
      background-size: 200% 100%;
      animation: skeleton 1.5s ease-in-out infinite;
      border-radius: var(--radius-sm);
    }
    @keyframes skeleton {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
  `],
})
export class UiSkeleton {
  width = input('100%');
  height = input('20px');
}
