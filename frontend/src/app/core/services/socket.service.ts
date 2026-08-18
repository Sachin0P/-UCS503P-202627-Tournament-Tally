import { Injectable, NgZone } from '@angular/core';
import { Socket, io } from 'socket.io-client';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class SocketService {
  private socket: Socket | null = null;
  private joinedRooms = new Set<number>();

  constructor(private auth: AuthService, private zone: NgZone) {}

  private ensureConnected(): Socket {
    if (this.socket?.connected) return this.socket;

    const token = this.auth.token();
    if (!this.socket) {
      this.socket = io(environment.socketUrl, { auth: { token }, autoConnect: false });
    }
    (this.socket.auth as { token: string | null }).token = token;
    if (!this.socket.connected) {
      this.socket.connect();
      this.joinedRooms.forEach((id) => this.socket!.emit('joinCompetition', id));
    }
    return this.socket;
  }

  joinCompetition(competitionId: number) {
    this.joinedRooms.add(competitionId);
    this.ensureConnected().emit('joinCompetition', competitionId);
  }

  leaveCompetition(competitionId: number) {
    this.joinedRooms.delete(competitionId);
    this.socket?.emit('leaveCompetition', competitionId);
  }

  on<T>(event: string): Observable<T> {
    const socket = this.ensureConnected();
    return new Observable<T>((subscriber) => {
      const handler = (payload: T) => this.zone.run(() => subscriber.next(payload));
      socket.on(event, handler);
      return () => socket.off(event, handler);
    });
  }

  disconnect() {
    this.socket?.disconnect();
    this.joinedRooms.clear();
  }
}
