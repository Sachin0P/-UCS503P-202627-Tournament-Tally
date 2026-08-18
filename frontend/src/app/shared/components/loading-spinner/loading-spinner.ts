import { Component } from '@angular/core';

@Component({
  selector: 'app-loading-spinner',
  standalone: true,
  template: `
    <div class="flex items-center justify-center py-16">
      <div class="h-6 w-6 rounded-full border-2 border-zinc-200 border-t-zinc-900 animate-spin"></div>
    </div>
  `,
})
export class LoadingSpinner {}
