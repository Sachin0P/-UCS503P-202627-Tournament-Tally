import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { AdminService, Report } from '../../../core/services/admin.service';
import { ToastService } from '../../../core/services/toast.service';
import { StatusBadge } from '../../../shared/components/status-badge/status-badge';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';

@Component({
  selector: 'app-admin-reports',
  standalone: true,
  imports: [DatePipe, StatusBadge, EmptyState],
  template: `
    <h1 class="text-xl font-semibold text-zinc-900 mb-6">Reports</h1>
    @if (reports().length === 0) {
      <app-empty-state icon="🚩" title="No reports" subtitle="Reports raised by users will show up here." />
    } @else {
      <div class="space-y-2">
        @for (r of reports(); track r.id) {
          <div class="border border-zinc-200 rounded-md p-3 bg-white text-sm">
            <div class="flex items-center justify-between">
              <p class="font-medium text-zinc-900 capitalize">{{ r.target_type }} #{{ r.target_id }}</p>
              <app-status-badge [status]="r.status" />
            </div>
            <p class="text-zinc-600 mt-1">{{ r.reason }}</p>
            <p class="text-xs text-zinc-400 mt-1">Reported by {{ r.reporter_name }} · {{ r.created_at | date: 'medium' }}</p>
            @if (r.status === 'open') {
              <div class="flex gap-2 mt-2">
                <button type="button" class="text-xs font-medium bg-zinc-900 text-white px-2 py-1 rounded" (click)="resolve(r, 'resolved')">Resolve</button>
                <button type="button" class="text-xs font-medium border border-zinc-300 px-2 py-1 rounded" (click)="resolve(r, 'dismissed')">Dismiss</button>
              </div>
            }
          </div>
        }
      </div>
    }
  `,
})
export class AdminReports implements OnInit {
  private adminService = inject(AdminService);
  private toast = inject(ToastService);
  reports = signal<Report[]>([]);

  ngOnInit() { this.load(); }
  load() { this.adminService.listReports().subscribe((res) => this.reports.set(res.reports)); }

  resolve(r: Report, status: 'resolved' | 'dismissed') {
    this.adminService.resolveReport(r.id, status).subscribe(() => { this.toast.success('Report updated'); this.load(); });
  }
}
