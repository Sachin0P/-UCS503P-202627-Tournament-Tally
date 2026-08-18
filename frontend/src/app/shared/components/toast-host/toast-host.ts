import { Component, inject } from '@angular/core';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-toast-host',
  standalone: true,
  template: `
    <div class="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-80 max-w-[calc(100vw-2rem)]">
      @for (toast of toastService.toasts(); track toast.id) {
        <div
          class="rounded-md border px-4 py-3 text-sm shadow-sm bg-white flex items-start justify-between gap-3"
          [class.border-emerald-300]="toast.kind === 'success'"
          [class.border-red-300]="toast.kind === 'error'"
          [class.border-zinc-300]="toast.kind === 'info'"
        >
          <span
            [class.text-emerald-700]="toast.kind === 'success'"
            [class.text-red-700]="toast.kind === 'error'"
            [class.text-zinc-700]="toast.kind === 'info'"
          >{{ toast.message }}</span>
          <button type="button" class="text-zinc-400 hover:text-zinc-600" (click)="toastService.dismiss(toast.id)">✕</button>
        </div>
      }
    </div>
  `,
})
export class ToastHost {
  toastService = inject(ToastService);
}
