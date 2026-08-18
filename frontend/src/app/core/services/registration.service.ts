import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Registration } from '../models';

const compBase = `${environment.apiUrl}/competitions`;
const base = `${environment.apiUrl}/registrations`;

@Injectable({ providedIn: 'root' })
export class RegistrationService {
  constructor(private http: HttpClient) {}

  register(competitionId: number, teamId?: number): Observable<{ registration: Registration }> {
    return this.http.post<{ registration: Registration }>(`${compBase}/${competitionId}/register`, teamId ? { teamId } : {});
  }

  listForCompetition(competitionId: number, status?: string): Observable<{ registrations: Registration[] }> {
    const suffix = status ? `?status=${status}` : '';
    return this.http.get<{ registrations: Registration[] }>(`${compBase}/${competitionId}/registrations${suffix}`);
  }

  mine(): Observable<{ registrations: Registration[] }> {
    return this.http.get<{ registrations: Registration[] }>(`${base}/mine`);
  }

  approve(id: number): Observable<{ registration: Registration }> {
    return this.http.put<{ registration: Registration }>(`${base}/${id}/approve`, {});
  }

  reject(id: number): Observable<{ registration: Registration }> {
    return this.http.put<{ registration: Registration }>(`${base}/${id}/reject`, {});
  }

  cancel(id: number): Observable<void> {
    return this.http.delete<void>(`${base}/${id}`);
  }
}
