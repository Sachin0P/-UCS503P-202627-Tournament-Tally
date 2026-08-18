import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { CompetitionService } from '../../../core/services/competition.service';
import { ToastService } from '../../../core/services/toast.service';
import { Competition } from '../../../core/models';
import { StatusBadge } from '../../../shared/components/status-badge/status-badge';
import { CategoryTag } from '../../../shared/components/category-tag/category-tag';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';
import { LoadingSpinner } from '../../../shared/components/loading-spinner/loading-spinner';

@Component({
  selector: 'app-organizer-competitions',
  standalone: true,
  imports: [RouterLink, DatePipe, StatusBadge, CategoryTag, EmptyState, LoadingSpinner],
  templateUrl: './organizer-competitions.html',
})
export class OrganizerCompetitions implements OnInit {
  private competitionService = inject(CompetitionService);
  private toast = inject(ToastService);

  loading = signal(true);
  competitions = signal<Competition[]>([]);

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.competitionService.list({ mine: 'true', limit: 100 }).subscribe({
      next: (res) => { this.competitions.set(res.competitions); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  publish(c: Competition) {
    this.competitionService.setStatus(c.id, 'published').subscribe(() => { this.toast.success('Competition published'); this.load(); });
  }

  unpublish(c: Competition) {
    this.competitionService.setStatus(c.id, 'draft').subscribe(() => { this.toast.success('Competition moved back to draft'); this.load(); });
  }

  cancel(c: Competition) {
    this.competitionService.setStatus(c.id, 'cancelled').subscribe(() => { this.toast.success('Competition cancelled'); this.load(); });
  }
}
