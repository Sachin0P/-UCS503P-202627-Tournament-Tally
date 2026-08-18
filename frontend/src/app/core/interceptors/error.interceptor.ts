import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const toast = inject(ToastService);

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      const message = err.error?.error || err.message || 'Something went wrong';

      if (err.status === 401) {
        toast.error('Your session has expired. Please sign in again.');
        auth.logout();
      } else if (err.status !== 0) {
        toast.error(message);
      } else {
        toast.error('Cannot reach the server. Please check your connection.');
      }

      return throwError(() => err);
    })
  );
};
