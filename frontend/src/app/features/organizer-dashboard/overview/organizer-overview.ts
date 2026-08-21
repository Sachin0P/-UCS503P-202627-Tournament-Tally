import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { CompetitionService } from '../../../core/services/competition.service';
import { MatchService } from '../../../core/services/match.service';
import { Competition } from '../../../core/models';
import { CompetitionCard } from '../../../shared/components/competition-card/competition-card';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';
import { LoadingSpinner } from '../../../shared/components/loading-spinner/loading-spinner';

@Component({
  selector: 'app-organizer-overview',
  standalone: true,
  imports: [RouterLink, CompetitionCard, EmptyState, LoadingSpinner],
  template: `
    <h1 class="text-xl font-semibold text-zinc-900 mb-6">Organizer Dashboard</h1>

    @if (loading()) {
      <app-loading-spinner />
    } @else {
      <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
        <div class="border border-zinc-200 rounded-lg p-4 bg-white">
          <p class="text-2xl font-semibold text-zinc-900">{{ competitions().length }}</p>
          <p class="text-xs text-zinc-500 mt-0.5">Total Competitions</p>
        </div>
        <div class="border border-zinc-200 rounded-lg p-4 bg-white">
          <p class="text-2xl font-semibold text-zinc-900">{{ activeCount() }}</p>
          <p class="text-xs text-zinc-500 mt-0.5">Active Competitions</p>
        </div>
        <div class="border border-zinc-200 rounded-lg p-4 bg-white">
          <p class="text-2xl font-semibold text-zinc-900">{{ totalRegistrations() }}</p>
          <p class="text-xs text-zinc-500 mt-0.5">Total Registrations</p>
        </div>
        <div class="border border-zinc-200 rounded-lg p-4 bg-white">
          <p class="text-2xl font-semibold text-zinc-900">{{ totalTeams() }}</p>
          <p class="text-xs text-zinc-500 mt-0.5">Total Teams</p>
        </div>
        <div class="border border-zinc-200 rounded-lg p-4 bg-white">
          <p class="text-2xl font-semibold text-zinc-900">{{ upcomingMatches() }}</p>
          <p class="text-xs text-zinc-500 mt-0.5">Upcoming Matches</p>
        </div>
        <div class="border border-zinc-200 rounded-lg p-4 bg-white">
          <p class="text-2xl font-semibold text-zinc-900">{{ completedMatches() }}</p>
          <p class="text-xs text-zinc-500 mt-0.5">Completed Matches</p>
        </div>
      </div>

      <div class="flex items-center justify-between mb-3">
        <h2 class="font-semibold text-zinc-900">My Competitions</h2>
        <a routerLink="/organizer/competitions/new" class="text-sm font-medium bg-zinc-900 text-white px-3 py-1.5 rounded-md">+ New</a>
      </div>
      @if (competitions().length === 0) {
        <app-empty-state title="No competitions yet" subtitle="Create your first competition to get started." />
      } @else {
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          @for (c of competitions().slice(0, 6); track c.id) {
            <app-competition-card [competition]="c" />
          }
        </div>
      }
    }
  `,
})
export class OrganizerOverview implements OnInit {
  private competitionService = inject(CompetitionService);
  private matchService = inject(MatchService);

  loading = signal(true);
  competitions = signal<Competition[]>([]);
  upcomingMatches = signal(0);
  completedMatches = signal(0);

  activeCount = computed(() => this.competitions().filter((c) => c.status === 'published' || c.status === 'ongoing').length);
  totalRegistrations = computed(() => this.competitions().reduce((sum, c) => sum + c.registrations_count, 0));
  totalTeams = computed(() => this.competitions().reduce((sum, c) => sum + c.teams_count, 0));

  ngOnInit() {
    this.competitionService.list({ mine: 'true', limit: 100 }).subscribe((res) => {
      this.competitions.set(res.competitions);
      if (res.competitions.length === 0) {
        this.loading.set(false);
        return;
      }
      forkJoin(res.competitions.map((c) => this.matchService.listForCompetition(c.id))).subscribe((all) => {
        const matches = all.flatMap((r) => r.matches);
        this.upcomingMatches.set(matches.filter((m) => m.status === 'scheduled' || m.status === 'live').length);
        this.completedMatches.set(matches.filter((m) => m.status === 'completed').length);
        this.loading.set(false);
      });
    });
  }
}
