import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Competition, CompetitionListFilters, CompetitionStatus } from '../models';

const base = `${environment.apiUrl}/competitions`;

function toParams(filters: CompetitionListFilters = {}): HttpParams {
  let params = new HttpParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') params = params.set(key, String(value));
  });
  return params;
}

@Injectable({ providedIn: 'root' })
export class CompetitionService {
  constructor(private http: HttpClient) {}

  list(filters: CompetitionListFilters = {}): Observable<{ competitions: Competition[] }> {
    return this.http.get<{ competitions: Competition[] }>(base, { params: toParams(filters) });
  }

  get(id: number): Observable<{ competition: Competition }> {
    return this.http.get<{ competition: Competition }>(`${base}/${id}`);
  }

  create(payload: Record<string, unknown>): Observable<{ competition: Competition }> {
    return this.http.post<{ competition: Competition }>(base, payload);
  }

  update(id: number, payload: Record<string, unknown>): Observable<{ competition: Competition }> {
    return this.http.put<{ competition: Competition }>(`${base}/${id}`, payload);
  }

  setStatus(id: number, status: CompetitionStatus): Observable<{ competition: Competition }> {
    return this.http.patch<{ competition: Competition }>(`${base}/${id}/status`, { status });
  }

  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${base}/${id}`);
  }
}
