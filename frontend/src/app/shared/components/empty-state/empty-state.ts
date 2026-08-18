import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  template: `
    <div class="flex flex-col items-center justify-center text-center py-16 px-4">
      <div class="text-3xl mb-3">{{ icon }}</div>
      <p class="text-zinc-900 font-medium">{{ title }}</p>
      @if (subtitle) {
        <p class="text-zinc-500 text-sm mt-1 max-w-sm">{{ subtitle }}</p>
      }
      <ng-content></ng-content>
    </div>
  `,
})
export class EmptyState {
  @Input() icon = '—';
  @Input() title = 'Nothing here yet';
  @Input() subtitle = '';
}
