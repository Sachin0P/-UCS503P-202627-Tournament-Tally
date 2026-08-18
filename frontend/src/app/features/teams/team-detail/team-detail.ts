import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { TeamService } from '../../../core/services/team.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { Team, TeamJoinRequest } from '../../../core/models';

import { LoadingSpinner } from '../../../shared/components/loading-spinner/loading-spinner';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';
import { ConfirmDialog } from '../../../shared/components/confirm-dialog/confirm-dialog';

@Component({
  selector: 'app-team-detail',
  standalone: true,
  imports: [RouterLink, FormsModule, LoadingSpinner, EmptyState, ConfirmDialog],
  templateUrl: './team-detail.html',
})
export class TeamDetail implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private teamService = inject(TeamService);
  private toast = inject(ToastService);
  auth = inject(AuthService);

  teamId = Number(this.route.snapshot.paramMap.get('id'));
  loading = signal(true);
  team = signal<Team | null>(null);
  joinRequests = signal<TeamJoinRequest[]>([]);
  editing = signal(false);
  confirmDisband = signal(false);

  editName = '';
  editDescription = '';
  editLookingForMembers = false;
  editLookingForRole = '';
  editRequiredSkills = '';
  editMaxMembers = 4;

  isCaptain = computed(() => this.team()?.captain_id === this.auth.currentUser()?.id);
  isMember = computed(() => (this.team()?.members ?? []).some((m) => m.user_id === this.auth.currentUser()?.id));

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.teamService.get(this.teamId).subscribe({
      next: (res) => {
        this.team.set(res.team);
        this.loading.set(false);
        this.resetEditForm();
        if (this.isCaptain()) this.loadJoinRequests();
      },
      error: () => this.loading.set(false),
    });
  }

  resetEditForm() {
    const t = this.team();
    if (!t) return;
    this.editName = t.name;
    this.editDescription = t.description ?? '';
    this.editLookingForMembers = !!t.looking_for_members;
    this.editLookingForRole = t.looking_for_role ?? '';
    this.editRequiredSkills = t.required_skills ?? '';
    this.editMaxMembers = t.max_members;
  }

  loadJoinRequests() {
    this.teamService.listJoinRequests(this.teamId).subscribe((res) => {
      this.joinRequests.set(res.requests.filter((r) => r.status === 'pending'));
    });
  }

  saveEdits() {
    this.teamService
      .update(this.teamId, {
        name: this.editName,
        description: this.editDescription,
        lookingForMembers: this.editLookingForMembers,
        lookingForRole: this.editLookingForRole,
        requiredSkills: this.editRequiredSkills,
        maxMembers: this.editMaxMembers,
      })
      .subscribe({
        next: (res) => {
          this.team.set(res.team);
          this.editing.set(false);
          this.toast.success('Team updated');
        },
      });
  }

  respondToRequest(request: TeamJoinRequest, action: 'accept' | 'reject') {
    this.teamService.respondJoinRequest(this.teamId, request.id, action).subscribe(() => {
      this.toast.success(action === 'accept' ? 'Member added to the team' : 'Request rejected');
      this.load();
    });
  }

  removeMember(userId: number) {
    this.teamService.removeMember(this.teamId, userId).subscribe((res) => {
      this.team.set(res.team);
      this.toast.success('Member removed');
    });
  }

  transferCaptain(userId: number) {
    this.teamService.transferCaptain(this.teamId, userId).subscribe((res) => {
      this.team.set(res.team);
      this.toast.success('Captaincy transferred');
    });
  }

  leaveTeam() {
    this.teamService.leave(this.teamId).subscribe(() => {
      this.toast.success('You left the team');
      this.router.navigateByUrl('/dashboard');
    });
  }

  disbandTeam() {
    this.teamService.remove(this.teamId).subscribe(() => {
      this.toast.success('Team disbanded');
      this.router.navigateByUrl('/dashboard');
    });
  }
}
