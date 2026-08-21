import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="max-w-md mx-auto px-4 py-24 text-center">
      <h1 class="text-xl font-semibold text-zinc-900">Page not found</h1>
      <p class="text-zinc-500 mt-2 text-sm">The page you're looking for doesn't exist.</p>
      <a routerLink="/" class="inline-block mt-5 text-sm font-medium bg-zinc-900 text-white px-4 py-2 rounded-md">Back to home</a>
    </div>
  `,
})
export class NotFound {}
