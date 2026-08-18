import { Component, Input, computed, signal } from '@angular/core';

const STYLES: Record<string, string> = {
  draft: 'bg-zinc-100 text-zinc-600',
  published: 'bg-emerald-50 text-emerald-700',
  ongoing: 'bg-blue-50 text-blue-700',
  live: 'bg-blue-50 text-blue-700',
  completed: 'bg-zinc-100 text-zinc-600',
  cancelled: 'bg-red-50 text-red-700',
  postponed: 'bg-amber-50 text-amber-700',
  scheduled: 'bg-zinc-100 text-zinc-600',
  pending: 'bg-amber-50 text-amber-700',
  approved: 'bg-emerald-50 text-emerald-700',
  rejected: 'bg-red-50 text-red-700',
  accepted: 'bg-emerald-50 text-emerald-700',
  open: 'bg-emerald-50 text-emerald-700',
  closed: 'bg-zinc-100 text-zinc-600',
  active: 'bg-emerald-50 text-emerald-700',
  suspended: 'bg-red-50 text-red-700',
};

@Component({
  selector: 'app-status-badge',
  standalone: true,
  template: `
    <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize {{ classes() }}">
      {{ label() }}
    </span>
  `,
})
export class StatusBadge {
  private statusSignal = signal<string>('');
  @Input({ required: true }) set status(value: string) { this.statusSignal.set(value ?? ''); }

  label = computed(() => this.statusSignal().replace(/_/g, ' '));
  classes = computed(() => STYLES[this.statusSignal()] ?? 'bg-zinc-100 text-zinc-600');
}
