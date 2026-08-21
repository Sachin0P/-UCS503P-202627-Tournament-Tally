import { Component } from '@angular/core';
import { CategoryLanding } from '../../shared/components/category-landing/category-landing';

@Component({
  selector: 'app-academic',
  standalone: true,
  imports: [CategoryLanding],
  template: `
    <app-category-landing
      category="ACADEMIC"
      title="Academic"
      description="Hackathons, coding contests, quizzes, debates and case competitions — form a team and get evaluated."
    />
  `,
})
export class Academic {}
