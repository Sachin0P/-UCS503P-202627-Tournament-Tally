import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-admin-shell',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <div class="max-w-6xl mx-auto px-4 py-8 flex gap-8">
      <aside class="w-48 shrink-0 hidden sm:block">
        <p class="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-3">Admin</p>
        <nav class="flex flex-col gap-1 text-sm">
          <a routerLink="/admin" routerLinkActive="bg-zinc-100 text-zinc-900" [routerLinkActiveOptions]="{ exact: true }"
            class="px-3 py-1.5 rounded-md text-zinc-600 hover:bg-zinc-50">Dashboard</a>
          <a routerLink="/admin/users" routerLinkActive="bg-zinc-100 text-zinc-900"
            class="px-3 py-1.5 rounded-md text-zinc-600 hover:bg-zinc-50">Users</a>
          <a routerLink="/admin/organizations" routerLinkActive="bg-zinc-100 text-zinc-900"
            class="px-3 py-1.5 rounded-md text-zinc-600 hover:bg-zinc-50">Organizations</a>
          <a routerLink="/admin/competitions" routerLinkActive="bg-zinc-100 text-zinc-900"
            class="px-3 py-1.5 rounded-md text-zinc-600 hover:bg-zinc-50">Competitions</a>
          <a routerLink="/admin/reports" routerLinkActive="bg-zinc-100 text-zinc-900"
            class="px-3 py-1.5 rounded-md text-zinc-600 hover:bg-zinc-50">Reports</a>
        </nav>
      </aside>
      <div class="flex-1 min-w-0">
        <router-outlet />
      </div>
    </div>
  `,
})
export class AdminShell {}
