import { Component } from '@angular/core';
import { CategoryLanding } from '../../shared/components/category-landing/category-landing';

@Component({
  selector: 'app-esports',
  standalone: true,
  imports: [CategoryLanding],
  template: `
    <app-category-landing
      category="ESPORTS"
      icon="🎮"
      title="Esports"
      description="BGMI, Valorant, FIFA, CS2 and more — squad up, climb the leaderboard, and take the final."
    />
  `,
})
export class Esports {}
