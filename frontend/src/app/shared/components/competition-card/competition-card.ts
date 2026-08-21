import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Competition } from '../../../core/models';
import { StatusBadge } from '../status-badge/status-badge';
import { CategoryTag } from '../category-tag/category-tag';
import { DatePipe, CurrencyPipe } from '@angular/common';

@Component({
  selector: 'app-competition-card',
  standalone: true,
  imports: [RouterLink, StatusBadge, CategoryTag, DatePipe, CurrencyPipe],
  template: `
    <a [routerLink]="['/competitions', competition.id]" class="block border border-zinc-200 rounded-lg overflow-hidden bg-white hover:shadow-md transition-shadow">
      <div class="h-28 bg-zinc-100 flex items-center justify-center text-zinc-300 text-xs">
        @if (competition.banner) {
          <img [src]="competition.banner" [alt]="competition.name" class="h-full w-full object-cover" />
        } @else {
          <span>No banner</span>
        }
      </div>
      <div class="p-4">
        <div class="flex items-center gap-2 mb-2">
          <app-category-tag [category]="competition.category" />
          <app-status-badge [status]="competition.status" />
        </div>
        <h3 class="font-semibold text-zinc-900 leading-snug">{{ competition.name }}</h3>
        <p class="text-sm text-zinc-500 mt-0.5">{{ competition.organizer_name }} · {{ competition.organizer_college }}</p>

        <div class="mt-3 text-sm text-zinc-600 space-y-1">
          <div>{{ competition.start_date | date: 'mediumDate' }}</div>
          @if (competition.venue) {
            <div>{{ competition.venue }} @if (competition.mode === 'online') { <span>(Online)</span> }</div>
          } @else {
            <div>{{ competition.mode === 'online' ? 'Online' : 'TBA' }}</div>
          }
          <div class="text-zinc-500">Register by {{ competition.registration_deadline | date: 'mediumDate' }}</div>
        </div>

        <div class="mt-3 flex items-center justify-between text-sm">
          <span class="text-zinc-500">{{ competition.teams_count }} team{{ competition.teams_count === 1 ? '' : 's' }}</span>
          <span class="font-medium text-zinc-900">
            {{ competition.registration_fee > 0 ? (competition.registration_fee | currency: 'INR' : 'symbol' : '1.0-0') : 'Free' }}
          </span>
        </div>
      </div>
    </a>
  `,
})
export class CompetitionCard {
  @Input({ required: true }) competition!: Competition;
}
