import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { OrganizationService } from '../../../core/services/organization.service';
import { CompetitionService } from '../../../core/services/competition.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { CompetitionCategory, CompetitionFormat, Organization } from '../../../core/models';

const SPORTS_ESPORTS_FORMATS: { value: CompetitionFormat; label: string }[] = [
  { value: 'knockout', label: 'Knockout' },
  { value: 'round_robin', label: 'Round Robin' },
  { value: 'league', label: 'League' },
  { value: 'group_knockout', label: 'Group + Knockout' },
  { value: 'single_elimination', label: 'Single Elimination' },
  { value: 'double_elimination', label: 'Double Elimination' },
];

@Component({
  selector: 'app-create-competition',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './create-competition.html',
})
export class CreateCompetition implements OnInit {
  private organizationService = inject(OrganizationService);
  private competitionService = inject(CompetitionService);
  private auth = inject(AuthService);
  private toast = inject(ToastService);
  private router = inject(Router);

  step = signal(1);
  organizations = signal<Organization[]>([]);
  formats = SPORTS_ESPORTS_FORMATS;
  submitting = signal(false);

  form = {
    organizationId: '' as number | '',
    name: '',
    description: '',
    category: 'SPORTS' as CompetitionCategory,
    type: '',
    banner: '',
    startDate: '',
    endDate: '',
    registrationDeadline: '',
    venue: '',
    mode: 'offline' as 'online' | 'offline',
    maxParticipants: null as number | null,
    maxTeams: null as number | null,
    registrationFee: 0,
    rules: '',
    format: 'knockout' as CompetitionFormat,
    stages: 'Registration, Team Formation, Submission, Evaluation, Leaderboard, Results',
  };

  ngOnInit() {
    this.organizationService.list().subscribe((res) => {
      const mine = res.organizations.filter((o) => o.created_by === this.auth.currentUser()?.id);
      this.organizations.set(mine);
      if (mine.length === 1) this.form.organizationId = mine[0].id;
    });
  }

  onCategoryChange() {
    this.form.format = this.form.category === 'ACADEMIC' ? 'staged' : 'knockout';
  }

  next() { if (this.step() < 4) this.step.set(this.step() + 1); }
  back() { if (this.step() > 1) this.step.set(this.step() - 1); }

  private buildPayload(status: 'draft' | 'published') {
    return {
      organizationId: this.form.organizationId,
      name: this.form.name,
      description: this.form.description || undefined,
      category: this.form.category,
      type: this.form.type || undefined,
      banner: this.form.banner || undefined,
      startDate: this.form.startDate,
      endDate: this.form.endDate,
      registrationDeadline: this.form.registrationDeadline,
      venue: this.form.venue || undefined,
      mode: this.form.mode,
      maxParticipants: this.form.maxParticipants || undefined,
      maxTeams: this.form.maxTeams || undefined,
      registrationFee: this.form.registrationFee || 0,
      rules: this.form.rules || undefined,
      format: this.form.format,
      stagesJson: this.form.category === 'ACADEMIC' ? this.form.stages.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
      status,
    };
  }

  submit(status: 'draft' | 'published') {
    if (!this.form.organizationId || !this.form.name || !this.form.startDate || !this.form.endDate || !this.form.registrationDeadline) {
      this.toast.error('Please fill in all required fields');
      return;
    }
    this.submitting.set(true);
    this.competitionService.create(this.buildPayload(status)).subscribe({
      next: (res) => {
        this.toast.success(status === 'published' ? 'Competition published' : 'Draft saved');
        this.router.navigate(['/organizer/competitions', res.competition.id, 'manage']);
      },
      error: () => this.submitting.set(false),
    });
  }
}
