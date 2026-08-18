import { HttpClient } from '@angular/common/http';
import { Injectable, computed, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { User } from '../models';

const TOKEN_KEY = 'arenasuite_token';
const USER_KEY = 'arenasuite_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly currentUserSignal = signal<User | null>(this.readStoredUser());
  private readonly tokenSignal = signal<string | null>(localStorage.getItem(TOKEN_KEY));

  readonly currentUser = this.currentUserSignal.asReadonly();
  readonly token = this.tokenSignal.asReadonly();
  readonly isAuthenticated = computed(() => !!this.currentUserSignal());
  readonly isOrganizer = computed(() => {
    const role = this.currentUserSignal()?.role;
    return role === 'organizer' || role === 'admin';
  });
  readonly isAdmin = computed(() => this.currentUserSignal()?.role === 'admin');

  constructor(private http: HttpClient, private router: Router) {}

  private readStoredUser(): User | null {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  }

  async loginWithGoogle(idToken: string): Promise<User> {
    const res = await firstValueFrom(
      this.http.post<{ token: string; user: User }>(`${environment.apiUrl}/auth/google`, { idToken })
    );
    this.setSession(res.token, res.user);
    return res.user;
  }

  async refreshMe(): Promise<void> {
    if (!this.tokenSignal()) return;
    try {
      const res = await firstValueFrom(this.http.get<{ user: User }>(`${environment.apiUrl}/auth/me`));
      this.currentUserSignal.set(res.user);
      localStorage.setItem(USER_KEY, JSON.stringify(res.user));
    } catch {
      this.logout();
    }
  }

  setSession(token: string, user: User) {
    this.tokenSignal.set(token);
    this.currentUserSignal.set(user);
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  updateCurrentUser(user: User) {
    this.currentUserSignal.set(user);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  logout() {
    this.tokenSignal.set(null);
    this.currentUserSignal.set(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.router.navigate(['/auth/login']);
  }
}
