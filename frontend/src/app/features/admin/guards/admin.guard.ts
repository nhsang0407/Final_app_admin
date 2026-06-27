import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AdminAuthService } from '../services/admin-auth.service';
import { map, filter, take, switchMap, of, interval, timeout, catchError, startWith } from 'rxjs';

export const adminGuard: CanActivateFn = (route, state) => {
  const authService = inject(AdminAuthService);
  const router = inject(Router);

  // Wait for auth service to be initialized (max 5 seconds)
  // This handles page refresh scenarios where user data is being fetched
  return interval(50).pipe(
    startWith(0),
    map(() => authService.isInitialized()),
    filter(initialized => initialized),
    take(1),
    timeout(5000),
    switchMap(() => authService.currentUser$),
    take(1),
    map(currentUser => {
      if (!currentUser) {
        // User not logged in or token invalid
        router.navigate(['/admin/login'], {
          queryParams: { returnUrl: state.url }
        });
        return false;
      }

      if (currentUser.role !== 'admin') {
        // User is not an admin
        authService.logout();
        router.navigate(['/admin/login'], {
          queryParams: { error: 'unauthorized' }
        });
        return false;
      }

      return true;
    }),
    catchError(() => {
      // Timeout or error - redirect to login
      console.warn('Admin guard timeout - redirecting to login');
      router.navigate(['/admin/login'], {
        queryParams: { returnUrl: state.url }
      });
      return of(false);
    })
  );
};
