import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { OrganizationService } from '../../../core/services/organization.service';
import { ToastService } from '../../../core/services/toast.service';
import { Organization } from '../../../core/models';

@Component({
  selector: 'app-organize',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <div class="max-w-lg mx-auto px-4 py-16 text-center">
      <h1 class="text-2xl font-semibold text-zinc-900">Organize an Event</h1>
      <p class="text-zinc-500 mt-2">
        Create competitions, manage registrations, run fixtures, and publish live results — all from one dashboard.
      </p>

      @if (!auth.isAuthenticated()) {
        <a routerLink="/auth/login" class="inline-block mt-6 bg-zinc-900 text-white text-sm font-medium px-5 py-2.5 rounded-md">
          Sign in to Get Started
        </a>
      } @else if (myOrganizations().length > 0) {
        <a routerLink="/organizer" class="inline-block mt-6 bg-zinc-900 text-white text-sm font-medium px-5 py-2.5 rounded-md">
          Go to Organizer Dashboard
        </a>
      } @else {
        <div class="mt-8 border border-zinc-200 rounded-lg p-5 bg-white text-left space-y-3">
          <p class="text-sm font-medium text-zinc-900">Create your organization to get started</p>
          <input [(ngModel)]="name" placeholder="Organization name (e.g. HackTIET)" class="w-full border border-zinc-300 rounded-md px-3 py-2 text-sm" />
          <input [(ngModel)]="college" placeholder="College" class="w-full border border-zinc-300 rounded-md px-3 py-2 text-sm" />
          <textarea [(ngModel)]="description" placeholder="Short description (optional)" rows="2" class="w-full border border-zinc-300 rounded-md px-3 py-2 text-sm"></textarea>
          <button type="button" class="w-full bg-zinc-900 text-white text-sm font-medium py-2 rounded-md" (click)="createOrganization()">
            Create Organization
          </button>
        </div>
      }
    </div>
  `,
})
export class Organize implements OnInit {
  auth = inject(AuthService);
  private organizationService = inject(OrganizationService);
  private toast = inject(ToastService);
  private router = inject(Router);

  myOrganizations = signal<Organization[]>([]);
  name = '';
  college = '';
  description = '';

  ngOnInit() {
    if (!this.auth.isAuthenticated()) return;
    this.organizationService.list().subscribe((res) => {
      this.myOrganizations.set(res.organizations.filter((o) => o.created_by === this.auth.currentUser()?.id));
    });
  }

  createOrganization() {
    if (!this.name || !this.college) return;
    this.organizationService.create({ name: this.name, college: this.college, description: this.description || undefined }).subscribe({
      next: async () => {
        this.toast.success('Organization created — you are now an organizer');
        await this.auth.refreshMe();
        this.router.navigateByUrl('/organizer');
      },
    });
  }
}
