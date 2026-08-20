import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { UserRole } from '../models';
import { profileCompletionRedirect } from './auth.guard';

export function roleGuard(...allowed: UserRole[]): CanActivateFn {
  return (route, state) => {
    const auth = inject(AuthService);
    const router = inject(Router);
    const user = auth.currentUser();
    if (!user) return router.createUrlTree(['/auth/login']);
    if (!allowed.includes(user.role)) return router.createUrlTree(['/']);
    return profileCompletionRedirect(auth, router, state) ?? true;
  };
}
