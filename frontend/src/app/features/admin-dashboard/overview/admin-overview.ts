import { Component, OnInit, inject, signal } from '@angular/core';
import { AdminService, PlatformStats } from '../../../core/services/admin.service';
import { LoadingSpinner } from '../../../shared/components/loading-spinner/loading-spinner';

@Component({
  selector: 'app-admin-overview',
  standalone: true,
  imports: [LoadingSpinner],
  template: `
    <h1 class="text-xl font-semibold text-zinc-900 mb-6">Platform Overview</h1>
    @if (!stats()) {
      <app-loading-spinner />
    } @else {
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <div class="border border-zinc-200 rounded-lg p-4 bg-white">
          <p class="text-2xl font-semibold text-zinc-900">{{ stats()!.totalUsers }}</p>
          <p class="text-xs text-zinc-500 mt-0.5">Total Users</p>
        </div>
        <div class="border border-zinc-200 rounded-lg p-4 bg-white">
          <p class="text-2xl font-semibold text-zinc-900">{{ stats()!.totalOrganizations }}</p>
          <p class="text-xs text-zinc-500 mt-0.5">Organizations</p>
        </div>
        <div class="border border-zinc-200 rounded-lg p-4 bg-white">
          <p class="text-2xl font-semibold text-zinc-900">{{ stats()!.totalCompetitions }}</p>
          <p class="text-xs text-zinc-500 mt-0.5">Total Competitions</p>
        </div>
        <div class="border border-zinc-200 rounded-lg p-4 bg-white">
          <p class="text-2xl font-semibold text-zinc-900">{{ stats()!.activeCompetitions }}</p>
          <p class="text-xs text-zinc-500 mt-0.5">Active Competitions</p>
        </div>
        <div class="border border-zinc-200 rounded-lg p-4 bg-white">
          <p class="text-2xl font-semibold text-zinc-900">{{ stats()!.totalTeams }}</p>
          <p class="text-xs text-zinc-500 mt-0.5">Total Teams</p>
        </div>
        <div class="border border-zinc-200 rounded-lg p-4 bg-white">
          <p class="text-2xl font-semibold text-zinc-900">{{ stats()!.totalRegistrations }}</p>
          <p class="text-xs text-zinc-500 mt-0.5">Total Registrations</p>
        </div>
        <div class="border border-zinc-200 rounded-lg p-4 bg-white">
          <p class="text-2xl font-semibold text-zinc-900">{{ stats()!.openReports }}</p>
          <p class="text-xs text-zinc-500 mt-0.5">Open Reports</p>
        </div>
      </div>

      <h2 class="font-semibold text-zinc-900 mb-3">By Category</h2>
      <div class="flex gap-3">
        @for (c of stats()!.competitionsByCategory; track c.category) {
          <div class="border border-zinc-200 rounded-lg px-4 py-3 bg-white text-sm">
            <span class="font-medium text-zinc-900">{{ c.category }}</span>
            <span class="text-zinc-500 ml-2">{{ c.n }}</span>
          </div>
        }
      </div>
    }
  `,
})
export class AdminOverview implements OnInit {
  private adminService = inject(AdminService);
  stats = signal<PlatformStats | null>(null);

  ngOnInit() {
    this.adminService.stats().subscribe((res) => this.stats.set(res.stats));
  }
}
