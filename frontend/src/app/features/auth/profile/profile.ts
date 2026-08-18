import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
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

      <label class="text-xs text-zinc-500">College</label>
      <input [(ngModel)]="college" class="w-full border border-zinc-300 rounded-md px-3 py-2 text-sm mt-1" />

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

  college = this.auth.currentUser()?.college ?? '';

  save() {
    this.userService.updateMe({ college: this.college }).subscribe((res) => {
      this.auth.updateCurrentUser(res.user);
      this.toast.success('Profile updated');
    });
  }
}
