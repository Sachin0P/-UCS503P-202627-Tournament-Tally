import { inject } from '@angular/core';
import { CanActivateFn, Router, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';

/** Sends a signed-in user with a missing roll number/branch to the profile page to finish onboarding. */
export function profileCompletionRedirect(auth: AuthService, router: Router, state: RouterStateSnapshot) {
  if (!auth.isProfileComplete() && !state.url.startsWith('/profile')) {
    return router.createUrlTree(['/profile']);
  }
  return null;
}

export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isAuthenticated()) return router.createUrlTree(['/auth/login']);
  return profileCompletionRedirect(auth, router, state) ?? true;
};
