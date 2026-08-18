import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { GoogleSigninButton } from '../../../shared/components/google-signin-button/google-signin-button';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [GoogleSigninButton],
  template: `
    <div class="max-w-sm mx-auto px-4 py-20 text-center">
      <h1 class="text-2xl font-semibold text-zinc-900">Sign in to ArenaSuite</h1>
      <p class="text-zinc-500 mt-2 text-sm">Use your college Google account to continue.</p>

      @if (isConfigured) {
        <div class="mt-8 flex justify-center">
          <app-google-signin-button (credential)="onCredential($event)" />
        </div>
      } @else {
        <p class="text-xs text-amber-600 mt-8">Google Sign-In isn't configured yet — set GOOGLE_CLIENT_ID.</p>
      }
    </div>
  `,
})
export class Login {
  private auth = inject(AuthService);
  private toast = inject(ToastService);
  private router = inject(Router);

  isConfigured = !environment.googleClientId.startsWith('REPLACE_WITH');

  async onCredential(idToken: string) {
    try {
      await this.auth.loginWithGoogle(idToken);
      this.toast.success('Signed in successfully');
      this.router.navigateByUrl('/dashboard');
    } catch {
      // errorInterceptor already surfaces a toast
    }
  }
}
