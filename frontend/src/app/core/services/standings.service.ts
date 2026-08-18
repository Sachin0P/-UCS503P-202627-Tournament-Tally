import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Standing } from '../models';

const compBase = `${environment.apiUrl}/competitions`;

@Injectable({ providedIn: 'root' })
export class StandingsService {
  constructor(private http: HttpClient) {}

  get(competitionId: number): Observable<{ standings: Standing[] }> {
    return this.http.get<{ standings: Standing[] }>(`${compBase}/${competitionId}/standings`);
  }

  recompute(competitionId: number): Observable<{ standings: Standing[] }> {
    return this.http.post<{ standings: Standing[] }>(`${compBase}/${competitionId}/standings/recompute`, {});
  }

  setAcademicScore(competitionId: number, teamId: number, points: number, statsJson?: unknown): Observable<{ standings: Standing[] }> {
    return this.http.put<{ standings: Standing[] }>(`${compBase}/${competitionId}/standings/score`, { teamId, points, statsJson });
  }
}
