import { Component, Input, computed, signal } from '@angular/core';

const META: Record<string, { label: string; classes: string }> = {
  SPORTS: { label: 'Sports', classes: 'bg-emerald-50 text-emerald-700' },
  ACADEMIC: { label: 'Academic', classes: 'bg-indigo-50 text-indigo-700' },
  ESPORTS: { label: 'Esports', classes: 'bg-rose-50 text-rose-700' },
};

@Component({
  selector: 'app-category-tag',
  standalone: true,
  template: `
    <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium {{ meta().classes }}">
      {{ meta().label }}
    </span>
  `,
})
export class CategoryTag {
  private categorySignal = signal<string>('SPORTS');
  @Input({ required: true }) set category(value: string) { this.categorySignal.set(value); }
  meta = computed(() => META[this.categorySignal()] ?? META['SPORTS']);
}
