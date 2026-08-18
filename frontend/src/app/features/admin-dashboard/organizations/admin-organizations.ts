import { Component, OnInit, inject, signal } from '@angular/core';
import { AdminService } from '../../../core/services/admin.service';
import { ToastService } from '../../../core/services/toast.service';
import { Organization } from '../../../core/models';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';

@Component({
  selector: 'app-admin-organizations',
  standalone: true,
  imports: [EmptyState],
  template: `
    <h1 class="text-xl font-semibold text-zinc-900 mb-6">Organizations</h1>
    @if (organizations().length === 0) {
      <app-empty-state icon="🏢" title="No organizations yet" />
    } @else {
      <div class="space-y-2">
        @for (o of organizations(); track o.id) {
          <div class="border border-zinc-200 rounded-md p-3 bg-white flex items-center justify-between text-sm">
            <div>
              <p class="font-medium text-zinc-900">{{ o.name }}</p>
              <p class="text-xs text-zinc-500">{{ o.college }} · created by {{ o.created_by_name }}</p>
            </div>
            @if (o.verified) {
              <span class="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded">Verified</span>
            } @else {
              <button type="button" class="text-xs font-medium bg-zinc-900 text-white px-3 py-1.5 rounded" (click)="verify(o)">Verify</button>
            }
          </div>
        }
      </div>
    }
  `,
})
export class AdminOrganizations implements OnInit {
  private adminService = inject(AdminService);
  private toast = inject(ToastService);
  organizations = signal<Organization[]>([]);

  ngOnInit() { this.load(); }
  load() { this.adminService.listOrganizations().subscribe((res) => this.organizations.set(res.organizations)); }

  verify(o: Organization) {
    this.adminService.verifyOrganization(o.id).subscribe(() => { this.toast.success('Organization verified'); this.load(); });
  }
}
