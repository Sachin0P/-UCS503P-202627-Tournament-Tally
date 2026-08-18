import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Match } from '../models';

const compBase = `${environment.apiUrl}/competitions`;
const base = `${environment.apiUrl}/matches`;

@Injectable({ providedIn: 'root' })
export class MatchService {
  constructor(private http: HttpClient) {}

  mine(): Observable<{ matches: Match[] }> {
    return this.http.get<{ matches: Match[] }>(`${base}/mine`);
  }

  listForCompetition(competitionId: number): Observable<{ matches: Match[] }> {
    return this.http.get<{ matches: Match[] }>(`${compBase}/${competitionId}/matches`);
  }

  generateFixtures(competitionId: number, regenerate = false): Observable<{ matches: Match[] }> {
    return this.http.post<{ matches: Match[] }>(`${compBase}/${competitionId}/matches/generate`, { regenerate });
  }

  create(competitionId: number, payload: Record<string, unknown>): Observable<{ match: Match }> {
    return this.http.post<{ match: Match }>(`${compBase}/${competitionId}/matches`, payload);
  }

  update(matchId: number, payload: Record<string, unknown>): Observable<{ match: Match }> {
    return this.http.put<{ match: Match }>(`${base}/${matchId}`, payload);
  }

  remove(matchId: number): Observable<void> {
    return this.http.delete<void>(`${base}/${matchId}`);
  }
}
