import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <header class="border-b border-zinc-200 bg-white sticky top-0 z-40">
      <div class="max-w-6xl mx-auto px-4 flex items-center justify-between h-14">
        <div class="flex items-center gap-6">
          <a routerLink="/" class="font-semibold text-zinc-900 tracking-tight">ArenaSuite</a>
          <nav class="hidden md:flex items-center gap-5 text-sm text-zinc-600">
            <a routerLink="/" routerLinkActive="text-zinc-900 font-medium" [routerLinkActiveOptions]="{ exact: true }">Home</a>
            <a routerLink="/sports" routerLinkActive="text-zinc-900 font-medium">Sports</a>
            <a routerLink="/academic" routerLinkActive="text-zinc-900 font-medium">Academic</a>
            <a routerLink="/esports" routerLinkActive="text-zinc-900 font-medium">Esports</a>
            <a routerLink="/find-team" routerLinkActive="text-zinc-900 font-medium">Find a Team</a>
            @if (auth.isAuthenticated()) {
              <a routerLink="/dashboard" routerLinkActive="text-zinc-900 font-medium">My Competitions</a>
            }
            <a routerLink="/organize" routerLinkActive="text-zinc-900 font-medium">Organize</a>
          </nav>
        </div>

        <div class="flex items-center gap-3">
          @if (auth.isAuthenticated()) {
            @if (auth.isOrganizer()) {
              <a routerLink="/organizer" class="hidden md:inline text-sm text-zinc-600 hover:text-zinc-900">Organizer Dashboard</a>
            }
            @if (auth.isAdmin()) {
              <a routerLink="/admin" class="hidden md:inline text-sm text-zinc-600 hover:text-zinc-900">Admin Panel</a>
            }
            <a routerLink="/notifications" class="relative text-zinc-600 hover:text-zinc-900" aria-label="Notifications">
              🔔
              @if (notifications.unreadCount() > 0) {
                <span class="absolute -top-1 -right-1 bg-rose-600 text-white text-[10px] leading-none rounded-full h-4 w-4 flex items-center justify-center">
                  {{ notifications.unreadCount() > 9 ? '9+' : notifications.unreadCount() }}
                </span>
              }
            </a>
            <button type="button" class="hidden sm:flex items-center gap-2" (click)="menuOpen.set(!menuOpen())">
              @if (auth.currentUser()?.profilePicture) {
                <img [src]="auth.currentUser()!.profilePicture" class="h-7 w-7 rounded-full" alt="" />
              } @else {
                <span class="h-7 w-7 rounded-full bg-zinc-900 text-white text-xs flex items-center justify-center">
                  {{ auth.currentUser()?.name?.charAt(0) }}
                </span>
              }
            </button>
            @if (menuOpen()) {
              <div class="absolute right-4 top-14 bg-white border border-zinc-200 rounded-md shadow-md text-sm w-44 py-1">
                <a routerLink="/profile" class="block px-3 py-2 hover:bg-zinc-50" (click)="menuOpen.set(false)">Profile</a>
                <a routerLink="/dashboard" class="block px-3 py-2 hover:bg-zinc-50" (click)="menuOpen.set(false)">Dashboard</a>
                <button type="button" class="block w-full text-left px-3 py-2 hover:bg-zinc-50 text-red-600" (click)="auth.logout()">Sign out</button>
              </div>
            }
          } @else {
            <a routerLink="/auth/login" class="hidden sm:inline-block text-sm font-medium bg-zinc-900 text-white px-3 py-1.5 rounded-md hover:bg-zinc-800">
              Sign in
            </a>
          }

          <button
            type="button"
            class="md:hidden text-zinc-600 hover:text-zinc-900 w-8 h-8 flex items-center justify-center"
            aria-label="Toggle menu"
            (click)="mobileOpen.set(!mobileOpen())"
          >
            {{ mobileOpen() ? '✕' : '☰' }}
          </button>
        </div>
      </div>

      @if (mobileOpen()) {
        <nav class="md:hidden border-t border-zinc-200 px-4 py-2 flex flex-col text-sm text-zinc-700">
          <a routerLink="/" class="py-2" (click)="mobileOpen.set(false)">Home</a>
          <a routerLink="/sports" class="py-2" (click)="mobileOpen.set(false)">🏆 Sports</a>
          <a routerLink="/academic" class="py-2" (click)="mobileOpen.set(false)">🎓 Academic</a>
          <a routerLink="/esports" class="py-2" (click)="mobileOpen.set(false)">🎮 Esports</a>
          <a routerLink="/find-team" class="py-2" (click)="mobileOpen.set(false)">Find a Team</a>
          @if (auth.isAuthenticated()) {
            <a routerLink="/dashboard" class="py-2" (click)="mobileOpen.set(false)">My Competitions</a>
          }
          <a routerLink="/organize" class="py-2" (click)="mobileOpen.set(false)">Organize</a>
          @if (auth.isOrganizer()) {
            <a routerLink="/organizer" class="py-2" (click)="mobileOpen.set(false)">Organizer Dashboard</a>
          }
          @if (auth.isAdmin()) {
            <a routerLink="/admin" class="py-2" (click)="mobileOpen.set(false)">Admin Panel</a>
          }
          @if (auth.isAuthenticated()) {
            <a routerLink="/profile" class="py-2" (click)="mobileOpen.set(false)">Profile</a>
            <button type="button" class="py-2 text-left text-red-600" (click)="auth.logout(); mobileOpen.set(false)">Sign out</button>
          } @else {
            <a routerLink="/auth/login" class="py-2 font-medium" (click)="mobileOpen.set(false)">Sign in</a>
          }
        </nav>
      }
    </header>
  `,
})
export class Navbar {
  auth = inject(AuthService);
  notifications = inject(NotificationService);
  menuOpen = signal(false);
  mobileOpen = signal(false);
}
