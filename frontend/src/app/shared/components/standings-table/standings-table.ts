import { Component, Input } from '@angular/core';
import { Standing } from '../../../core/models';
import { EmptyState } from '../empty-state/empty-state';

@Component({
  selector: 'app-standings-table',
  standalone: true,
  imports: [EmptyState],
  template: `
    @if (standings.length === 0) {
      <app-empty-state icon="📊" title="No standings yet" subtitle="Standings appear once matches are completed." />
    } @else {
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-left text-zinc-400 border-b border-zinc-200">
              <th class="py-2 pr-4 font-medium">#</th>
              <th class="py-2 pr-4 font-medium">Team</th>
              @if (showMatchColumns) {
                <th class="py-2 pr-4 font-medium text-center">P</th>
                <th class="py-2 pr-4 font-medium text-center">W</th>
                <th class="py-2 pr-4 font-medium text-center">L</th>
                <th class="py-2 pr-4 font-medium text-center">D</th>
                <th class="py-2 pr-4 font-medium text-center">+/-</th>
              }
              <th class="py-2 pr-4 font-medium text-right">Points</th>
            </tr>
          </thead>
          <tbody>
            @for (s of standings; track s.id) {
              <tr class="border-b border-zinc-100">
                <td class="py-2 pr-4 text-zinc-500">{{ s.rank }}</td>
                <td class="py-2 pr-4 font-medium text-zinc-900">{{ s.team_name }}</td>
                @if (showMatchColumns) {
                  <td class="py-2 pr-4 text-center">{{ s.played }}</td>
                  <td class="py-2 pr-4 text-center">{{ s.won }}</td>
                  <td class="py-2 pr-4 text-center">{{ s.lost }}</td>
                  <td class="py-2 pr-4 text-center">{{ s.draw }}</td>
                  <td class="py-2 pr-4 text-center">{{ s.score_difference }}</td>
                }
                <td class="py-2 pr-4 text-right font-semibold text-zinc-900">{{ s.points }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }
  `,
})
export class StandingsTable {
  @Input() standings: Standing[] = [];
  @Input() showMatchColumns = true;
}
