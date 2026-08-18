import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-organizer-shell',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <div class="max-w-6xl mx-auto px-4 py-8 flex gap-8">
      <aside class="w-48 shrink-0 hidden sm:block">
        <p class="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-3">Organizer</p>
        <nav class="flex flex-col gap-1 text-sm">
          <a routerLink="/organizer" routerLinkActive="bg-zinc-100 text-zinc-900" [routerLinkActiveOptions]="{ exact: true }"
            class="px-3 py-1.5 rounded-md text-zinc-600 hover:bg-zinc-50">Dashboard</a>
          <a routerLink="/organizer/competitions" routerLinkActive="bg-zinc-100 text-zinc-900"
            class="px-3 py-1.5 rounded-md text-zinc-600 hover:bg-zinc-50">My Competitions</a>
          <a routerLink="/organizer/competitions/new" routerLinkActive="bg-zinc-100 text-zinc-900"
            class="px-3 py-1.5 rounded-md text-zinc-600 hover:bg-zinc-50">Create Competition</a>
          <a routerLink="/organizer/settings" routerLinkActive="bg-zinc-100 text-zinc-900"
            class="px-3 py-1.5 rounded-md text-zinc-600 hover:bg-zinc-50">Settings</a>
        </nav>
      </aside>
      <div class="flex-1 min-w-0">
        <router-outlet />
      </div>
    </div>
  `,
})
export class OrganizerShell {}
