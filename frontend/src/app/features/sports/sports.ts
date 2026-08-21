import { Component } from '@angular/core';
import { CategoryLanding } from '../../shared/components/category-landing/category-landing';

@Component({
  selector: 'app-sports',
  standalone: true,
  imports: [CategoryLanding],
  template: `
    <app-category-landing
      category="SPORTS"
      title="Sports"
      description="Cricket, football, basketball, badminton and more — register, build a team, and chase the trophy."
    />
  `,
})
export class Sports {}
