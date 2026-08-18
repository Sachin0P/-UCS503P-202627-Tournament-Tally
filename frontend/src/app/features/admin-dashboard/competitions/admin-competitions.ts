import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AdminService } from '../../../core/services/admin.service';
import { ToastService } from '../../../core/services/toast.service';
import { Competition } from '../../../core/models';
import { StatusBadge } from '../../../shared/components/status-badge/status-badge';
import { CategoryTag } from '../../../shared/components/category-tag/category-tag';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';

@Component({
  selector: 'app-admin-competitions',
  standalone: true,
  imports: [RouterLink, StatusBadge, CategoryTag, EmptyState],
  template: `
    <h1 class="text-xl font-semibold text-zinc-900 mb-6">All Competitions</h1>
    @if (competitions().length === 0) {
      <app-empty-state icon="🏁" title="No competitions yet" />
    } @else {
      <div class="space-y-2">
        @for (c of competitions(); track c.id) {
          <div class="border border-zinc-200 rounded-md p-3 bg-white flex items-center justify-between text-sm">
            <div class="flex items-center gap-2">
              <app-category-tag [category]="c.category" />
              <a [routerLink]="['/competitions', c.id]" class="font-medium text-zinc-900 hover:underline">{{ c.name }}</a>
              <span class="text-xs text-zinc-500">{{ c.organizer_name }}</span>
            </div>
            <div class="flex items-center gap-2">
              <app-status-badge [status]="c.status" />
              @if (c.status !== 'cancelled') {
                <button type="button" class="text-xs font-medium border border-red-300 text-red-600 px-2 py-1 rounded hover:bg-red-50" (click)="hide(c)">
                  Hide
                </button>
              }
            </div>
          </div>
        }
      </div>
    }
  `,
})
export class AdminCompetitions implements OnInit {
  private adminService = inject(AdminService);
  private toast = inject(ToastService);
  competitions = signal<Competition[]>([]);

  ngOnInit() { this.load(); }
  load() { this.adminService.listCompetitions().subscribe((res) => this.competitions.set(res.competitions)); }

  hide(c: Competition) {
    this.adminService.hideCompetition(c.id).subscribe(() => { this.toast.success('Competition hidden'); this.load(); });
  }
}
