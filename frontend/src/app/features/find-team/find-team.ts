import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { FindTeamService } from '../../core/services/find-team.service';
import { CompetitionService } from '../../core/services/competition.service';
import { TeamService } from '../../core/services/team.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { Competition, CompetitionCategory, LookingForTeamPost, Team } from '../../core/models';

import { TeamCard } from '../../shared/components/team-card/team-card';
import { EmptyState } from '../../shared/components/empty-state/empty-state';
import { LoadingSpinner } from '../../shared/components/loading-spinner/loading-spinner';

type Tab = 'teams' | 'players';

@Component({
  selector: 'app-find-team',
  standalone: true,
  imports: [FormsModule, TeamCard, EmptyState, LoadingSpinner],
  templateUrl: './find-team.html',
})
export class FindTeam implements OnInit {
  private findTeamService = inject(FindTeamService);
  private competitionService = inject(CompetitionService);
  private teamService = inject(TeamService);
  private toast = inject(ToastService);
  auth = inject(AuthService);

  activeTab = signal<Tab>('teams');
  loading = signal(true);
  competitions = signal<Competition[]>([]);
  teams = signal<Team[]>([]);
  posts = signal<LookingForTeamPost[]>([]);

  filterCompetitionId: number | '' = '';
  filterCategory: CompetitionCategory | '' = '';
  filterRole = '';

  showPostForm = signal(false);
  postCompetitionId: number | '' = '';
  postRole = '';
  postSkills = '';
  postExperience: '' | 'Beginner' | 'Intermediate' | 'Advanced' = '';
  postDescription = '';

  invitingPostId = signal<number | null>(null);

  myTeams = signal<Team[]>([]);

  myTeamsForPost(postId: number): Team[] {
    const post = this.posts().find((p) => p.id === postId);
    if (!post) return [];
    return this.myTeams().filter((t) => t.competition_id === post.competition_id && t.captain_id === this.auth.currentUser()?.id);
  }

  ngOnInit() {
    this.competitionService.list({ status: 'published', limit: 100 }).subscribe((res) => this.competitions.set(res.competitions));
    this.load();
  }

  load() {
    this.loading.set(true);
    if (this.activeTab() === 'teams') {
      this.findTeamService
        .findTeams({ competitionId: this.filterCompetitionId || undefined, category: this.filterCategory || undefined, role: this.filterRole || undefined })
        .subscribe({ next: (res) => { this.teams.set(res.teams); this.loading.set(false); }, error: () => this.loading.set(false) });
    } else {
      this.findTeamService
        .listPosts({ competitionId: this.filterCompetitionId || undefined, category: this.filterCategory || undefined, role: this.filterRole || undefined })
        .subscribe({ next: (res) => { this.posts.set(res.posts); this.loading.set(false); }, error: () => this.loading.set(false) });
    }
  }

  setTab(tab: Tab) {
    this.activeTab.set(tab);
    this.load();
  }

  requestToJoinTeam(team: Team) {
    this.teamService.requestToJoin(team.id).subscribe(() => this.toast.success(`Request sent to ${team.name}`));
  }

  submitPost() {
    if (!this.postCompetitionId || !this.postRole) return;
    this.findTeamService
      .createPost({
        competitionId: Number(this.postCompetitionId),
        role: this.postRole,
        skills: this.postSkills || undefined,
        experience: this.postExperience || undefined,
        description: this.postDescription || undefined,
      })
      .subscribe({
        next: () => {
          this.toast.success('Your post is live');
          this.showPostForm.set(false);
          this.postRole = this.postSkills = this.postDescription = '';
          this.postExperience = '';
          this.load();
        },
      });
  }

  startInvite(post: LookingForTeamPost) {
    if (this.myTeams().length === 0) {
      this.teamService.listForCompetition(post.competition_id).subscribe((res) => {
        this.myTeams.update((list) => [...list, ...res.teams]);
        this.invitingPostId.set(post.id);
      });
    } else {
      this.invitingPostId.set(post.id);
    }
  }

  inviteToTeam(post: LookingForTeamPost, teamId: number) {
    this.teamService.invite(teamId, post.user_id).subscribe(() => {
      this.toast.success(`Invitation sent to ${post.user_name}`);
      this.invitingPostId.set(null);
    });
  }
}
