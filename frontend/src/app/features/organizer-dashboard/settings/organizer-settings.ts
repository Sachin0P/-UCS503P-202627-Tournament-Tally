import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { OrganizationService } from '../../../core/services/organization.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { Organization } from '../../../core/models';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';

@Component({
  selector: 'app-organizer-settings',
  standalone: true,
  imports: [FormsModule, EmptyState],
  template: `
    <h1 class="text-xl font-semibold text-zinc-900 mb-6">Settings</h1>

    @if (organizations().length === 0) {
      <app-empty-state title="No organizations yet" />
    } @else {
      <div class="space-y-4">
        @for (org of organizations(); track org.id) {
          <div class="border border-zinc-200 rounded-lg p-4 bg-white space-y-2">
            <div class="flex items-center gap-2">
              <p class="font-medium text-zinc-900">{{ org.name }}</p>
              @if (org.verified) {
                <span class="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded">Verified</span>
              } @else {
                <span class="text-xs bg-zinc-100 text-zinc-500 px-2 py-0.5 rounded">Unverified</span>
              }
            </div>
            <input [(ngModel)]="org.name" class="w-full border border-zinc-300 rounded-md px-3 py-2 text-sm" />
            <input [(ngModel)]="org.college" placeholder="College" class="w-full border border-zinc-300 rounded-md px-3 py-2 text-sm" />
            <textarea [(ngModel)]="org.description" placeholder="Description" rows="2" class="w-full border border-zinc-300 rounded-md px-3 py-2 text-sm"></textarea>
            <button type="button" class="text-sm font-medium bg-zinc-900 text-white px-3 py-1.5 rounded-md" (click)="save(org)">Save</button>
          </div>
        }
      </div>
    }
  `,
})
export class OrganizerSettings implements OnInit {
  private organizationService = inject(OrganizationService);
  private auth = inject(AuthService);
  private toast = inject(ToastService);

  organizations = signal<Organization[]>([]);

  ngOnInit() {
    this.organizationService.list().subscribe((res) => {
      this.organizations.set(res.organizations.filter((o) => o.created_by === this.auth.currentUser()?.id));
    });
  }

  save(org: Organization) {
    this.organizationService.update(org.id, { name: org.name, college: org.college ?? undefined, description: org.description ?? undefined }).subscribe(() => {
      this.toast.success('Organization updated');
    });
  }
}
