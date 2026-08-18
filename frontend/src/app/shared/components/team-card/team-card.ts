import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Team } from '../../../core/models';

@Component({
  selector: 'app-team-card',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="border border-zinc-200 rounded-lg p-4 bg-white">
      <div class="flex items-start justify-between gap-2">
        <a [routerLink]="['/teams', team.id]" class="font-semibold text-zinc-900 hover:underline">{{ team.name }}</a>
        <span class="text-xs text-zinc-500 whitespace-nowrap">{{ team.member_count }}/{{ team.max_members }} members</span>
      </div>
      @if (team.competition_name) {
        <p class="text-xs text-zinc-500 mt-0.5">{{ team.competition_name }}</p>
      }
      @if (team.looking_for_members) {
        <div class="mt-2 text-sm">
          @if (team.looking_for_role) {
            <p class="text-zinc-700">Looking for: <span class="font-medium">{{ team.looking_for_role }}</span></p>
          }
          @if (team.required_skills) {
            <p class="text-zinc-500 text-xs mt-0.5">Skills: {{ team.required_skills }}</p>
          }
        </div>
      }
      @if (showJoinButton && team.looking_for_members && team.member_count < team.max_members) {
        <button
          type="button"
          class="mt-3 w-full text-sm font-medium border border-zinc-300 rounded-md py-1.5 hover:bg-zinc-50"
          (click)="requestToJoin.emit(team)"
        >
          Request to Join
        </button>
      }
    </div>
  `,
})
export class TeamCard {
  @Input({ required: true }) team!: Team;
  @Input() showJoinButton = true;
  @Output() requestToJoin = new EventEmitter<Team>();
}
