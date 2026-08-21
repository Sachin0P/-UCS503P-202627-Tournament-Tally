import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { OrganizationService } from '../../../core/services/organization.service';
import { Competition, Organization } from '../../../core/models';
import { CompetitionCard } from '../../../shared/components/competition-card/competition-card';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';
import { LoadingSpinner } from '../../../shared/components/loading-spinner/loading-spinner';

@Component({
  selector: 'app-organization-profile',
  standalone: true,
  imports: [CompetitionCard, EmptyState, LoadingSpinner],
  template: `
    @if (loading()) {
      <app-loading-spinner />
    } @else if (!organization()) {
      <app-empty-state title="Organization not found" />
    } @else {
      <div class="max-w-5xl mx-auto px-4 py-8">
        <div class="flex items-center gap-4">
          @if (organization()!.logo) {
            <img [src]="organization()!.logo" class="h-16 w-16 rounded-lg object-cover" alt="" />
          } @else {
            <span class="h-16 w-16 rounded-lg bg-zinc-100 flex items-center justify-center text-2xl font-semibold text-zinc-400">{{ organization()!.name.charAt(0) }}</span>
          }
          <div>
            <div class="flex items-center gap-2">
              <h1 class="text-2xl font-semibold text-zinc-900">{{ organization()!.name }}</h1>
              @if (organization()!.verified) {
                <span class="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded">Verified</span>
              }
            </div>
            <p class="text-zinc-500 text-sm mt-0.5">{{ organization()!.college }}</p>
          </div>
        </div>
        @if (organization()!.description) {
          <p class="text-zinc-700 mt-4 max-w-2xl">{{ organization()!.description }}</p>
        }

        <h2 class="font-semibold text-zinc-900 mt-8 mb-3">Upcoming Competitions</h2>
        @if (upcoming().length === 0) {
          <app-empty-state title="No upcoming competitions" />
        } @else {
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            @for (c of upcoming(); track c.id) { <app-competition-card [competition]="c" /> }
          </div>
        }

        <h2 class="font-semibold text-zinc-900 mt-8 mb-3">Past Competitions</h2>
        @if (past().length === 0) {
          <app-empty-state title="No past competitions yet" />
        } @else {
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            @for (c of past(); track c.id) { <app-competition-card [competition]="c" /> }
          </div>
        }
      </div>
    }
  `,
})
export class OrganizationProfile implements OnInit {
  private route = inject(ActivatedRoute);
  private organizationService = inject(OrganizationService);

  loading = signal(true);
  organization = signal<Organization | null>(null);
  upcoming = signal<Competition[]>([]);
  past = signal<Competition[]>([]);

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.organizationService.get(id).subscribe({
      next: (res) => {
        this.organization.set(res.organization);
        this.upcoming.set(res.upcomingCompetitions);
        this.past.set(res.pastCompetitions);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
