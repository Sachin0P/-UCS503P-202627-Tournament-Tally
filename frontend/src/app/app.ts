import { Component, effect, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Navbar } from './shared/components/navbar/navbar';
import { ToastHost } from './shared/components/toast-host/toast-host';
import { AuthService } from './core/services/auth.service';
import { NotificationService } from './core/services/notification.service';
import { SocketService } from './core/services/socket.service';
import { AppNotification } from './core/models';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Navbar, ToastHost],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  private auth = inject(AuthService);
  private notifications = inject(NotificationService);
  private socket = inject(SocketService);

  constructor() {
    effect((onCleanup) => {
      if (!this.auth.isAuthenticated()) return;
      this.notifications.refresh();
      const sub = this.socket.on<AppNotification>('notification').subscribe((n) => this.notifications.prepend(n));
      onCleanup(() => sub.unsubscribe());
    });
  }
}
