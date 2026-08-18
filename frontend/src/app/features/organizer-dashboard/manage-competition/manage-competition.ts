import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';

import { CompetitionService } from '../../../core/services/competition.service';
import { RegistrationService } from '../../../core/services/registration.service';
import { TeamService } from '../../../core/services/team.service';
import { MatchService } from '../../../core/services/match.service';
import { StandingsService } from '../../../core/services/standings.service';
import { AnnouncementService } from '../../../core/services/announcement.service';
import { ToastService } from '../../../core/services/toast.service';

import { Announcement, Competition, Match, MatchStatus, Registration, Standing, Team } from '../../../core/models';

import { StatusBadge } from '../../../shared/components/status-badge/status-badge';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';
import { LoadingSpinner } from '../../../shared/components/loading-spinner/loading-spinner';
import { StandingsTable } from '../../../shared/components/standings-table/standings-table';

type Tab = 'registrations' | 'teams' | 'matches' | 'standings' | 'announcements';

@Component({
  selector: 'app-manage-competition',
  standalone: true,
  imports: [RouterLink, FormsModule, DatePipe, StatusBadge, EmptyState, LoadingSpinner, StandingsTable],
  templateUrl: './manage-competition.html',
})
export class ManageCompetition implements OnInit {
  private route = inject(ActivatedRoute);
  private competitionService = inject(CompetitionService);
  private registrationService = inject(RegistrationService);
  private teamService = inject(TeamService);
  private matchService = inject(MatchService);
  private standingsService = inject(StandingsService);
  private announcementService = inject(AnnouncementService);
  private toast = inject(ToastService);

  competitionId = Number(this.route.snapshot.paramMap.get('id'));
  loading = signal(true);
  competition = signal<Competition | null>(null);
  activeTab = signal<Tab>('registrations');

  registrations = signal<Registration[]>([]);
  teams = signal<Team[]>([]);
  matches = signal<Match[]>([]);
  standings = signal<Standing[]>([]);
  announcements = signal<Announcement[]>([]);

  generatingFixtures = signal(false);
  matchEdits: Record<number, { scoreA: number | null; scoreB: number | null; status: MatchStatus }> = {};

  academicTeamId: number | '' = '';
  academicPoints: number | null = null;

  newAnnouncementTitle = '';
  newAnnouncementMessage = '';

  ngOnInit() {
    this.competitionService.get(this.competitionId).subscribe({
      next: (res) => { this.competition.set(res.competition); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
    this.loadRegistrations();
    this.loadTeams();
    this.loadMatches();
    this.loadStandings();
    this.loadAnnouncements();
  }

  setTab(tab: Tab) { this.activeTab.set(tab); }

  loadRegistrations() {
    this.registrationService.listForCompetition(this.competitionId).subscribe((res) => this.registrations.set(res.registrations));
  }
  loadTeams() {
    this.teamService.listForCompetition(this.competitionId).subscribe((res) => this.teams.set(res.teams));
  }
  loadMatches() {
    this.matchService.listForCompetition(this.competitionId).subscribe((res) => {
      this.matches.set(res.matches);
      for (const m of res.matches) {
        this.matchEdits[m.id] = { scoreA: m.score_a, scoreB: m.score_b, status: m.status };
      }
    });
  }
  loadStandings() {
    this.standingsService.get(this.competitionId).subscribe((res) => this.standings.set(res.standings));
  }
  loadAnnouncements() {
    this.announcementService.list(this.competitionId).subscribe((res) => this.announcements.set(res.announcements));
  }

  approveRegistration(r: Registration) {
    this.registrationService.approve(r.id).subscribe(() => { this.toast.success('Registration approved'); this.loadRegistrations(); });
  }
  rejectRegistration(r: Registration) {
    this.registrationService.reject(r.id).subscribe(() => { this.toast.success('Registration rejected'); this.loadRegistrations(); });
  }

  generateFixtures(regenerate = false) {
    this.generatingFixtures.set(true);
    this.matchService.generateFixtures(this.competitionId, regenerate).subscribe({
      next: () => { this.toast.success('Fixtures generated'); this.loadMatches(); this.loadStandings(); this.generatingFixtures.set(false); },
      error: () => this.generatingFixtures.set(false),
    });
  }

  saveMatch(match: Match) {
    const edits = this.matchEdits[match.id];
    this.matchService.update(match.id, { scoreA: edits.scoreA, scoreB: edits.scoreB, status: edits.status }).subscribe({
      next: () => { this.toast.success('Match updated'); this.loadMatches(); this.loadStandings(); },
    });
  }

  submitAcademicScore() {
    if (!this.academicTeamId || this.academicPoints === null) return;
    this.standingsService.setAcademicScore(this.competitionId, Number(this.academicTeamId), this.academicPoints).subscribe(() => {
      this.toast.success('Score updated');
      this.academicPoints = null;
      this.loadStandings();
    });
  }

  postAnnouncement() {
    if (!this.newAnnouncementTitle || !this.newAnnouncementMessage) return;
    this.announcementService.create(this.competitionId, this.newAnnouncementTitle, this.newAnnouncementMessage).subscribe(() => {
      this.newAnnouncementTitle = '';
      this.newAnnouncementMessage = '';
      this.toast.success('Announcement published');
      this.loadAnnouncements();
    });
  }
}
