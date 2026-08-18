import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  template: `
    @if (open) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
        <div class="bg-white rounded-lg shadow-lg max-w-sm w-full p-5">
          <h3 class="font-semibold text-zinc-900">{{ title }}</h3>
          <p class="text-sm text-zinc-600 mt-1">{{ message }}</p>
          <div class="flex justify-end gap-2 mt-5">
            <button type="button" class="px-3 py-1.5 text-sm rounded border border-zinc-300 hover:bg-zinc-50" (click)="cancelled.emit()">
              {{ cancelLabel }}
            </button>
            <button type="button" class="px-3 py-1.5 text-sm rounded bg-zinc-900 text-white hover:bg-zinc-800" (click)="confirmed.emit()">
              {{ confirmLabel }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class ConfirmDialog {
  @Input() open = false;
  @Input() title = 'Are you sure?';
  @Input() message = 'This action cannot be undone.';
  @Input() confirmLabel = 'Confirm';
  @Input() cancelLabel = 'Cancel';
  @Output() confirmed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();
}
