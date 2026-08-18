import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CompetitionService } from '../../core/services/competition.service';
import { Competition } from '../../core/models';
import { CompetitionCard } from '../../shared/components/competition-card/competition-card';
import { EmptyState } from '../../shared/components/empty-state/empty-state';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, CompetitionCard, EmptyState],
  template: `
    <section class="border-b border-zinc-200 bg-white">
      <div class="max-w-6xl mx-auto px-4 py-16 text-center">
        <h1 class="text-3xl sm:text-4xl font-bold text-zinc-900 tracking-tight">COMPETE. CONNECT. WIN.</h1>
        <p class="text-zinc-500 mt-3 max-w-xl mx-auto">Discover and participate in college competitions — all in one place.</p>
        <div class="flex items-center justify-center gap-3 mt-6">
          <a routerLink="/competitions" class="bg-zinc-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-zinc-800">
            Explore Competitions
          </a>
          <a routerLink="/organize" class="border border-zinc-300 px-4 py-2 rounded-md text-sm font-medium hover:bg-zinc-50">
            Organize an Event
          </a>
        </div>
      </div>
    </section>

    <section class="max-w-6xl mx-auto px-4 py-10 grid grid-cols-1 sm:grid-cols-3 gap-4">
      <a routerLink="/sports" class="border border-zinc-200 rounded-lg p-6 bg-white hover:shadow-md transition-shadow">
        <div class="text-3xl">🏆</div>
        <h2 class="font-semibold text-zinc-900 mt-3">Sports</h2>
        <p class="text-sm text-zinc-500 mt-1">Cricket, football, basketball & more</p>
        <span class="text-sm font-medium mt-3 inline-block text-emerald-700">Explore Sports →</span>
      </a>
      <a routerLink="/academic" class="border border-zinc-200 rounded-lg p-6 bg-white hover:shadow-md transition-shadow">
        <div class="text-3xl">🎓</div>
        <h2 class="font-semibold text-zinc-900 mt-3">Academic</h2>
        <p class="text-sm text-zinc-500 mt-1">Hackathons, quizzes, debates & more</p>
        <span class="text-sm font-medium mt-3 inline-block text-indigo-700">Explore Academic →</span>
      </a>
      <a routerLink="/esports" class="border border-zinc-200 rounded-lg p-6 bg-white hover:shadow-md transition-shadow">
        <div class="text-3xl">🎮</div>
        <h2 class="font-semibold text-zinc-900 mt-3">Esports</h2>
        <p class="text-sm text-zinc-500 mt-1">BGMI, Valorant, FIFA & more</p>
        <span class="text-sm font-medium mt-3 inline-block text-rose-700">Explore Esports →</span>
      </a>
    </section>

    @for (section of sections; track section.title) {
      <section class="max-w-6xl mx-auto px-4 py-6">
        <h2 class="text-lg font-semibold text-zinc-900 mb-4">{{ section.title }}</h2>
        @if (section.items().length === 0) {
          <app-empty-state icon="—" title="Nothing to show yet" />
        } @else {
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            @for (c of section.items(); track c.id) {
              <app-competition-card [competition]="c" />
            }
          </div>
        }
      </section>
    }
  `,
})
export class Home implements OnInit {
  private competitionService = inject(CompetitionService);

  upcoming = signal<Competition[]>([]);
  closingSoon = signal<Competition[]>([]);
  popular = signal<Competition[]>([]);
  recent = signal<Competition[]>([]);

  sections = [
    { title: 'Upcoming Competitions', items: this.upcoming },
    { title: 'Registration Closing Soon', items: this.closingSoon },
    { title: 'Popular Competitions', items: this.popular },
    { title: 'Recently Added', items: this.recent },
  ];

  ngOnInit() {
    this.competitionService.list({ status: 'published', limit: 6 }).subscribe((r) => this.upcoming.set(r.competitions));
    this.competitionService.list({ closingSoonDays: 14, limit: 6 }).subscribe((r) => this.closingSoon.set(r.competitions));
    this.competitionService.list({ sort: 'popular', limit: 6 }).subscribe((r) => this.popular.set(r.competitions));
    this.competitionService.list({ sort: 'recent', limit: 6 }).subscribe((r) => this.recent.set(r.competitions));
  }
}
