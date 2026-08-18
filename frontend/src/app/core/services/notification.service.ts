import { HttpClient } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AppNotification } from '../models';

const base = `${environment.apiUrl}/notifications`;

@Injectable({ providedIn: 'root' })
export class NotificationService {
  readonly notifications = signal<AppNotification[]>([]);
  readonly unreadCount = signal(0);

  constructor(private http: HttpClient) {}

  async refresh(): Promise<void> {
    const res = await firstValueFrom(this.http.get<{ notifications: AppNotification[]; unreadCount: number }>(base));
    this.notifications.set(res.notifications);
    this.unreadCount.set(res.unreadCount);
  }

  prepend(notification: AppNotification) {
    this.notifications.update((list) => [notification, ...list]);
    this.unreadCount.update((n) => n + 1);
  }

  async markRead(id: number): Promise<void> {
    await firstValueFrom(this.http.put(`${base}/${id}/read`, {}));
    this.notifications.update((list) => list.map((n) => (n.id === id ? { ...n, is_read: 1 } : n)));
    this.unreadCount.update((n) => Math.max(0, n - 1));
  }

  async markAllRead(): Promise<void> {
    await firstValueFrom(this.http.put(`${base}/read-all`, {}));
    this.notifications.update((list) => list.map((n) => ({ ...n, is_read: 1 })));
    this.unreadCount.set(0);
  }
}
