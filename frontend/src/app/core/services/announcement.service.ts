import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Announcement } from '../models';

const compBase = `${environment.apiUrl}/competitions`;

@Injectable({ providedIn: 'root' })
export class AnnouncementService {
  constructor(private http: HttpClient) {}

  list(competitionId: number): Observable<{ announcements: Announcement[] }> {
    return this.http.get<{ announcements: Announcement[] }>(`${compBase}/${competitionId}/announcements`);
  }

  create(competitionId: number, title: string, message: string): Observable<{ announcement: Announcement }> {
    return this.http.post<{ announcement: Announcement }>(`${compBase}/${competitionId}/announcements`, { title, message });
  }

  remove(competitionId: number, id: number): Observable<void> {
    return this.http.delete<void>(`${compBase}/${competitionId}/announcements/${id}`);
  }
}
