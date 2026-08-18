import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Competition, Organization } from '../models';

const base = `${environment.apiUrl}/organizations`;

@Injectable({ providedIn: 'root' })
export class OrganizationService {
  constructor(private http: HttpClient) {}

  list(): Observable<{ organizations: Organization[] }> {
    return this.http.get<{ organizations: Organization[] }>(base);
  }

  get(id: number): Observable<{ organization: Organization; upcomingCompetitions: Competition[]; pastCompetitions: Competition[] }> {
    return this.http.get<{ organization: Organization; upcomingCompetitions: Competition[]; pastCompetitions: Competition[] }>(`${base}/${id}`);
  }

  create(payload: Partial<Organization>): Observable<{ organization: Organization }> {
    return this.http.post<{ organization: Organization }>(base, payload);
  }

  update(id: number, payload: Partial<Organization>): Observable<{ organization: Organization }> {
    return this.http.put<{ organization: Organization }>(`${base}/${id}`, payload);
  }
}
