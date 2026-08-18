import { Component, OnDestroy, OnInit, inject, signal, computed } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe, CurrencyPipe } from '@angular/common';

import { CompetitionService } from '../../../core/services/competition.service';
import { TeamService } from '../../../core/services/team.service';
import { MatchService } from '../../../core/services/match.service';
import { StandingsService } from '../../../core/services/standings.service';
import { AnnouncementService } from '../../../core/services/announcement.service';
import { RegistrationService } from '../../../core/services/registration.service';
import { AuthService } from '../../../core/services/auth.service';
import { SocketService } from '../../../core/services/socket.service';
import { ToastService } from '../../../core/services/toast.service';

import { Announcement, Competition, Match, Registration, Standing, Team } from '../../../core/models';

import { StatusBadge } from '../../../shared/components/status-badge/status-badge';
import { CategoryTag } from '../../../shared/components/category-tag/category-tag';
import { LoadingSpinner } from '../../../shared/components/loading-spinner/loading-spinner';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';
import { Bracket } from '../../../shared/components/bracket/bracket';
import { StandingsTable } from '../../../shared/components/standings-table/standings-table';
import { TeamCard } from '../../../shared/components/team-card/team-card';

type Tab = 'overview' | 'teams' | 'matches' | 'standings' | 'announcements';

@Component({
  selector: 'app-competition-details',
  standalone: true,
  imports: [
    RouterLink, FormsModule, DatePipe, CurrencyPipe,
    StatusBadge, CategoryTag, LoadingSpinner, EmptyState, Bracket, StandingsTable, TeamCard,
  ],
  templateUrl: './competition-details.html',
})
export class CompetitionDetails implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private competitionService = inject(CompetitionService);
  private teamService = inject(TeamService);
  private matchService = inject(MatchService);
  private standingsService = inject(StandingsService);
  private announcementService = inject(AnnouncementService);
  private registrationService = inject(RegistrationService);
  private socket = inject(SocketService);
  private toast = inject(ToastService);
  auth = inject(AuthService);

  competitionId = Number(this.route.snapshot.paramMap.get('id'));
  loading = signal(true);
  competition = signal<Competition | null>(null);
  teams = signal<Team[]>([]);
  matches = signal<Match[]>([]);
  standings = signal<Standing[]>([]);
  announcements = signal<Announcement[]>([]);
  myRegistration = signal<Registration | null>(null);

  activeTab = signal<Tab>('overview');
  isRegistering = signal(false);
  newAnnouncementTitle = '';
  newAnnouncementMessage = '';

  showCreateTeam = signal(false);
  creatingTeam = signal(false);
  newTeam = { name: '', description: '', maxMembers: 4, lookingForMembers: false, lookingForRole: '', requiredSkills: '' };

  isKnockout = computed(() => {
    const c = this.competition();
    return !!c && ['knockout', 'single_elimination', 'group_knockout', 'double_elimination'].includes(c.format);
  });

  myTeamsICaptain = computed(() =>
    this.teams().filter((t) => t.captain_id === this.auth.currentUser()?.id)
  );

  isOwner = computed(() => {
    const user = this.auth.currentUser();
    const c = this.competition();
    if (!user || !c) return false;
    return user.role === 'admin' || user.id === c.created_by;
  });

  registrationOpen = computed(() => {
    const c = this.competition();
    if (!c) return false;
    return c.status === 'published' && new Date(c.registration_deadline) >= new Date();
  });

  private subs: { unsubscribe(): void }[] = [];

  ngOnInit() {
    this.loadAll();
    this.socket.joinCompetition(this.competitionId);

    this.subs.push(this.socket.on<Match>('scoreUpdated').subscribe(() => this.loadMatches()));
    this.subs.push(this.socket.on<Match>('matchStatusUpdated').subscribe(() => this.loadMatches()));
    this.subs.push(this.socket.on<unknown>('standingsUpdated').subscribe(() => this.loadStandings()));
    this.subs.push(
      this.socket.on<Announcement>('announcementCreated').subscribe((a) => {
        this.announcements.update((list) => [a, ...list]);
        this.toast.info(`New announcement: ${a.title}`);
      })
    );
  }

  ngOnDestroy() {
    this.socket.leaveCompetition(this.competitionId);
    this.subs.forEach((s) => s.unsubscribe());
  }

  loadAll() {
    this.loading.set(true);
    this.competitionService.get(this.competitionId).subscribe({
      next: (res) => {
        this.competition.set(res.competition);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
    this.loadTeams();
    this.loadMatches();
    this.loadStandings();
    this.loadAnnouncements();
    if (this.auth.isAuthenticated()) this.loadMyRegistration();
  }

  loadTeams() {
    this.teamService.listForCompetition(this.competitionId).subscribe((res) => this.teams.set(res.teams));
  }

  loadMatches() {
    this.matchService.listForCompetition(this.competitionId).subscribe((res) => this.matches.set(res.matches));
  }

  loadStandings() {
    this.standingsService.get(this.competitionId).subscribe((res) => this.standings.set(res.standings));
  }

  loadAnnouncements() {
    this.announcementService.list(this.competitionId).subscribe((res) => this.announcements.set(res.announcements));
  }

  loadMyRegistration() {
    this.registrationService.mine().subscribe((res) => {
      const match = res.registrations.find((r) => r.competition_id === this.competitionId && r.status !== 'cancelled');
      this.myRegistration.set(match ?? null);
    });
  }

  registerIndividually() {
    this.isRegistering.set(true);
    this.registrationService.register(this.competitionId).subscribe({
      next: (res) => {
        this.myRegistration.set(res.registration);
        this.toast.success('Registration submitted — awaiting organizer approval');
        this.isRegistering.set(false);
      },
      error: () => this.isRegistering.set(false),
    });
  }

  registerTeam(teamId: number) {
    this.isRegistering.set(true);
    this.registrationService.register(this.competitionId, teamId).subscribe({
      next: (res) => {
        this.myRegistration.set(res.registration);
        this.toast.success('Team registration submitted — awaiting organizer approval');
        this.isRegistering.set(false);
      },
      error: () => this.isRegistering.set(false),
    });
  }

  createTeam() {
    if (!this.newTeam.name) return;
    this.creatingTeam.set(true);
    this.teamService
      .create(this.competitionId, {
        name: this.newTeam.name,
        description: this.newTeam.description || undefined,
        maxMembers: this.newTeam.maxMembers,
        lookingForMembers: this.newTeam.lookingForMembers,
        lookingForRole: this.newTeam.lookingForRole || undefined,
        requiredSkills: this.newTeam.requiredSkills || undefined,
      })
      .subscribe({
        next: () => {
          this.toast.success('Team created');
          this.showCreateTeam.set(false);
          this.creatingTeam.set(false);
          this.newTeam = { name: '', description: '', maxMembers: 4, lookingForMembers: false, lookingForRole: '', requiredSkills: '' };
          this.loadTeams();
        },
        error: () => this.creatingTeam.set(false),
      });
  }

  requestToJoinTeam(team: Team) {
    this.teamService.requestToJoin(team.id).subscribe({
      next: () => this.toast.success(`Request sent to ${team.name}`),
    });
  }

  postAnnouncement() {
    if (!this.newAnnouncementTitle || !this.newAnnouncementMessage) return;
    this.announcementService.create(this.competitionId, this.newAnnouncementTitle, this.newAnnouncementMessage).subscribe(() => {
      this.newAnnouncementTitle = '';
      this.newAnnouncementMessage = '';
      this.toast.success('Announcement published');
    });
  }
}
