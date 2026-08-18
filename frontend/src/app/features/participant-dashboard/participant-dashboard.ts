import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';

import { RegistrationService } from '../../core/services/registration.service';
import { TeamService } from '../../core/services/team.service';
import { MatchService } from '../../core/services/match.service';
import { AuthService } from '../../core/services/auth.service';
import { Match, Registration, Team } from '../../core/models';

import { StatusBadge } from '../../shared/components/status-badge/status-badge';
import { EmptyState } from '../../shared/components/empty-state/empty-state';
import { LoadingSpinner } from '../../shared/components/loading-spinner/loading-spinner';

@Component({
  selector: 'app-participant-dashboard',
  standalone: true,
  imports: [RouterLink, DatePipe, StatusBadge, EmptyState, LoadingSpinner],
  templateUrl: './participant-dashboard.html',
})
export class ParticipantDashboard implements OnInit {
  private registrationService = inject(RegistrationService);
  private teamService = inject(TeamService);
  private matchService = inject(MatchService);
  auth = inject(AuthService);

  loading = signal(true);
  registrations = signal<Registration[]>([]);
  teams = signal<Team[]>([]);
  matches = signal<Match[]>([]);

  upcomingMatches = computed(() => this.matches().filter((m) => m.status === 'scheduled' || m.status === 'live'));
  recentResults = computed(() => this.matches().filter((m) => m.status === 'completed').slice(-6).reverse());

  stats = computed(() => ({
    registered: this.registrations().filter((r) => r.status !== 'cancelled').length,
    activeTeams: this.teams().length,
    upcomingMatches: this.upcomingMatches().length,
    completed: this.registrations().filter((r) => r.status === 'approved').length,
  }));

  ngOnInit() {
    this.loading.set(true);
    let pending = 3;
    const done = () => { if (--pending === 0) this.loading.set(false); };
    this.registrationService.mine().subscribe({ next: (r) => { this.registrations.set(r.registrations); done(); }, error: done });
    this.teamService.mine().subscribe({ next: (r) => { this.teams.set(r.teams); done(); }, error: done });
    this.matchService.mine().subscribe({ next: (r) => { this.matches.set(r.matches); done(); }, error: done });
  }
}
