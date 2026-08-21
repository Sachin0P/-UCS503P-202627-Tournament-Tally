import { Component, Input } from '@angular/core';
import { CompetitionsListing } from '../competitions-listing/competitions-listing';
import { CompetitionCategory } from '../../../core/models';

@Component({
  selector: 'app-category-landing',
  standalone: true,
  imports: [CompetitionsListing],
  template: `
    <div [attr.data-category]="category">
      <div class="border-b border-zinc-200 bg-white">
        <div class="max-w-6xl mx-auto px-4 py-8">
          <h1 class="text-xl font-semibold" [style.color]="'var(--color-accent)'">{{ title }}</h1>
          <p class="text-zinc-500 mt-1 max-w-xl">{{ description }}</p>
        </div>
      </div>
      <div class="max-w-6xl mx-auto px-4 py-8">
        <app-competitions-listing [fixedCategory]="category" />
      </div>
    </div>
  `,
})
export class CategoryLanding {
  @Input({ required: true }) category!: CompetitionCategory;
  @Input({ required: true }) title!: string;
  @Input({ required: true }) description!: string;
}
