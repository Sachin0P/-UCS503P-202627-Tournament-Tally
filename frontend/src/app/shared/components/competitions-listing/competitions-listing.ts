import { Component, Input, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CompetitionService } from '../../../core/services/competition.service';
import { Competition, CompetitionCategory } from '../../../core/models';
import { CompetitionCard } from '../competition-card/competition-card';
import { EmptyState } from '../empty-state/empty-state';
import { LoadingSpinner } from '../loading-spinner/loading-spinner';

@Component({
  selector: 'app-competitions-listing',
  standalone: true,
  imports: [FormsModule, CompetitionCard, EmptyState, LoadingSpinner],
  template: `
    <div class="flex flex-col sm:flex-row gap-3 mb-6">
      <input
        type="search"
        [(ngModel)]="search"
        (ngModelChange)="onFiltersChange()"
        placeholder="Search competitions..."
        class="flex-1 border border-zinc-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
      />
      @if (!fixedCategory) {
        <select [(ngModel)]="category" (ngModelChange)="onFiltersChange()" class="border border-zinc-300 rounded-md px-3 py-2 text-sm">
          <option value="">All categories</option>
          <option value="SPORTS">🏆 Sports</option>
          <option value="ACADEMIC">🎓 Academic</option>
          <option value="ESPORTS">🎮 Esports</option>
        </select>
      }
      <select [(ngModel)]="mode" (ngModelChange)="onFiltersChange()" class="border border-zinc-300 rounded-md px-3 py-2 text-sm">
        <option value="">Online or offline</option>
        <option value="online">Online</option>
        <option value="offline">Offline</option>
      </select>
      <select [(ngModel)]="free" (ngModelChange)="onFiltersChange()" class="border border-zinc-300 rounded-md px-3 py-2 text-sm">
        <option value="">Free or paid</option>
        <option value="true">Free</option>
        <option value="false">Paid</option>
      </select>
      <select [(ngModel)]="sort" (ngModelChange)="onFiltersChange()" class="border border-zinc-300 rounded-md px-3 py-2 text-sm">
        <option value="">Upcoming first</option>
        <option value="closingSoon">Registration closing soon</option>
        <option value="popular">Most popular</option>
        <option value="recent">Recently added</option>
      </select>
    </div>

    @if (loading()) {
      <app-loading-spinner />
    } @else if (competitions().length === 0) {
      <app-empty-state icon="🔍" title="No competitions found" subtitle="Try adjusting your filters or search terms." />
    } @else {
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        @for (c of competitions(); track c.id) {
          <app-competition-card [competition]="c" />
        }
      </div>
    }
  `,
})
export class CompetitionsListing implements OnInit {
  @Input() fixedCategory: CompetitionCategory | null = null;
  @Input() extraFilters: Record<string, unknown> = {};

  private competitionService = inject(CompetitionService);

  competitions = signal<Competition[]>([]);
  loading = signal(true);

  search = '';
  category: CompetitionCategory | '' = '';
  mode: '' | 'online' | 'offline' = '';
  free: '' | 'true' | 'false' = '';
  sort: '' | 'closingSoon' | 'popular' | 'recent' = '';

  private searchTimeout?: ReturnType<typeof setTimeout>;

  ngOnInit() {
    this.load();
  }

  onFiltersChange() {
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => this.load(), 250);
  }

  load() {
    this.loading.set(true);
    this.competitionService
      .list({
        category: this.fixedCategory || this.category || undefined,
        q: this.search || undefined,
        mode: this.mode || undefined,
        free: this.free || undefined,
        sort: this.sort || undefined,
        ...this.extraFilters,
      })
      .subscribe({
        next: (res) => {
          this.competitions.set(res.competitions);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }
}
