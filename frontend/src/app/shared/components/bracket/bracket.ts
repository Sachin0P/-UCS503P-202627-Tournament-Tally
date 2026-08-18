import { Component, Input, computed, signal } from '@angular/core';
import { Match } from '../../../core/models';
import { StatusBadge } from '../status-badge/status-badge';

@Component({
  selector: 'app-bracket',
  standalone: true,
  imports: [StatusBadge],
  template: `
    <div class="overflow-x-auto pb-2">
      <div class="flex gap-8 min-w-max px-1">
        @for (round of rounds(); track round.name) {
          <div class="flex flex-col justify-around gap-6" style="min-width: 220px">
            <h4 class="text-xs font-medium uppercase tracking-wide text-zinc-400 text-center">{{ round.name }}</h4>
            @for (match of round.matches; track match.id) {
              <div class="border border-zinc-200 rounded-md bg-white text-sm overflow-hidden">
                <div class="flex items-center justify-between px-3 py-1.5" [class.bg-emerald-50]="match.winner_id === match.team_a_id && match.status === 'completed'">
                  <span class="truncate" [class.font-semibold]="match.winner_id === match.team_a_id">{{ match.team_a_name || 'TBD' }}</span>
                  <span class="text-zinc-500 ml-2">{{ match.score_a ?? '' }}</span>
                </div>
                <div class="border-t border-zinc-100 flex items-center justify-between px-3 py-1.5" [class.bg-emerald-50]="match.winner_id === match.team_b_id && match.status === 'completed'">
                  <span class="truncate" [class.font-semibold]="match.winner_id === match.team_b_id">{{ match.team_b_name || 'TBD' }}</span>
                  <span class="text-zinc-500 ml-2">{{ match.score_b ?? '' }}</span>
                </div>
                <div class="px-3 py-1 bg-zinc-50 border-t border-zinc-100">
                  <app-status-badge [status]="match.status" />
                </div>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
})
export class Bracket {
  private matchesSignal = signal<Match[]>([]);
  @Input({ required: true }) set matches(value: Match[]) { this.matchesSignal.set(value ?? []); }

  rounds = computed(() => {
    const byRound = new Map<string, { order: number; matches: Match[] }>();
    for (const m of this.matchesSignal()) {
      const entry = byRound.get(m.round) ?? { order: m.round_order, matches: [] };
      entry.matches.push(m);
      byRound.set(m.round, entry);
    }
    return [...byRound.entries()]
      .sort((a, b) => a[1].order - b[1].order)
      .map(([name, v]) => ({ name, matches: v.matches }));
  });
}
