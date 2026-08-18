import { Component } from '@angular/core';
import { CompetitionsListing } from '../../../shared/components/competitions-listing/competitions-listing';

@Component({
  selector: 'app-explore',
  standalone: true,
  imports: [CompetitionsListing],
  template: `
    <div class="max-w-6xl mx-auto px-4 py-8">
      <h1 class="text-2xl font-semibold text-zinc-900 mb-1">Explore Competitions</h1>
      <p class="text-zinc-500 mb-6">Search and filter across every competition on ArenaSuite.</p>
      <app-competitions-listing />
    </div>
  `,
})
export class Explore {}
