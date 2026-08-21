import { Component, OnInit, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { NotificationService } from '../../core/services/notification.service';
import { EmptyState } from '../../shared/components/empty-state/empty-state';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [DatePipe, EmptyState],
  template: `
    <div class="max-w-2xl mx-auto px-4 py-8">
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-semibold text-zinc-900">Notifications</h1>
        @if (notifications.unreadCount() > 0) {
          <button type="button" class="text-sm text-zinc-600 hover:text-zinc-900" (click)="notifications.markAllRead()">
            Mark all as read
          </button>
        }
      </div>

      @if (notifications.notifications().length === 0) {
        <app-empty-state title="No notifications yet" />
      } @else {
        <div class="space-y-2">
          @for (n of notifications.notifications(); track n.id) {
            <div
              class="border rounded-md px-4 py-3 text-sm flex items-start justify-between gap-3"
              [class.bg-white]="n.is_read"
              [class.border-zinc-200]="n.is_read"
              [class.bg-blue-50]="!n.is_read"
              [class.border-blue-100]="!n.is_read"
            >
              <div>
                <p class="text-zinc-900">{{ n.message }}</p>
                <p class="text-xs text-zinc-400 mt-0.5">{{ n.created_at | date: 'medium' }}</p>
              </div>
              @if (!n.is_read) {
                <button type="button" class="text-xs text-zinc-500 hover:text-zinc-900 whitespace-nowrap" (click)="notifications.markRead(n.id)">
                  Mark read
                </button>
              }
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class Notifications implements OnInit {
  notifications = inject(NotificationService);
  ngOnInit() { this.notifications.refresh(); }
}
