import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { UserService } from '../../../core/services/user.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="max-w-md mx-auto px-4 py-10">
      <h1 class="text-2xl font-semibold text-zinc-900 mb-6">Profile</h1>

      @if (!auth.isProfileComplete()) {
        <div class="mb-6 border border-amber-200 bg-amber-50 text-amber-800 text-sm rounded-md px-3 py-2">
          Add your roll number and branch to finish setting up your account.
        </div>
      }

      <div class="flex items-center gap-3 mb-6">
        @if (auth.currentUser()?.profilePicture) {
          <img [src]="auth.currentUser()!.profilePicture" class="h-14 w-14 rounded-full" alt="" />
        } @else {
          <span class="h-14 w-14 rounded-full bg-zinc-900 text-white flex items-center justify-center text-lg">
            {{ auth.currentUser()?.name?.charAt(0) }}
          </span>
        }
        <div>
          <p class="font-medium text-zinc-900">{{ auth.currentUser()?.name }}</p>
          <p class="text-sm text-zinc-500">{{ auth.currentUser()?.email }}</p>
          <span class="inline-block mt-1 text-xs font-medium bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded capitalize">{{ auth.currentUser()?.role }}</span>
        </div>
      </div>

      <div class="space-y-4">
        <div>
          <label class="text-xs text-zinc-500">Roll Number *</label>
          <input [(ngModel)]="rollNumber" placeholder="e.g. 102303001" class="w-full border border-zinc-300 rounded-md px-3 py-2 text-sm mt-1" />
        </div>
        <div>
          <label class="text-xs text-zinc-500">Branch *</label>
          <input [(ngModel)]="branch" placeholder="e.g. Computer Science Engineering" class="w-full border border-zinc-300 rounded-md px-3 py-2 text-sm mt-1" />
        </div>
        <div>
          <label class="text-xs text-zinc-500">College</label>
          <input [(ngModel)]="college" class="w-full border border-zinc-300 rounded-md px-3 py-2 text-sm mt-1" />
        </div>
      </div>

      <button type="button" class="mt-4 text-sm font-medium bg-zinc-900 text-white px-4 py-2 rounded-md" (click)="save()">
        Save Changes
      </button>
    </div>
  `,
})
export class Profile {
  auth = inject(AuthService);
  private userService = inject(UserService);
  private toast = inject(ToastService);
  private router = inject(Router);

  college = this.auth.currentUser()?.college ?? '';
  rollNumber = this.auth.currentUser()?.rollNumber ?? '';
  branch = this.auth.currentUser()?.branch ?? '';

  save() {
    if (!this.rollNumber.trim() || !this.branch.trim()) {
      this.toast.error('Roll number and branch are required');
      return;
    }

    const wasIncomplete = !this.auth.isProfileComplete();
    this.userService.updateMe({ college: this.college, rollNumber: this.rollNumber, branch: this.branch }).subscribe((res) => {
      this.auth.updateCurrentUser(res.user);
      this.toast.success('Profile updated');
      if (wasIncomplete) this.router.navigateByUrl('/dashboard');
    });
  }
}
