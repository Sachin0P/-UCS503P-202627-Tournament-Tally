import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Competition, Organization, User } from '../models';

const base = `${environment.apiUrl}/admin`;

export interface PlatformStats {
  totalUsers: number;
  totalOrganizations: number;
  totalCompetitions: number;
  activeCompetitions: number;
  totalTeams: number;
  totalRegistrations: number;
  openReports: number;
  competitionsByCategory: { category: string; n: number }[];
}

export interface Report {
  id: number;
  reporter_id: number;
  reporter_name: string;
  target_type: string;
  target_id: number;
  reason: string;
  status: 'open' | 'resolved' | 'dismissed';
  created_at: string;
  resolved_at: string | null;
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  constructor(private http: HttpClient) {}

  stats(): Observable<{ stats: PlatformStats }> {
    return this.http.get<{ stats: PlatformStats }>(`${base}/stats`);
  }

  listUsers(filters: { role?: string; status?: string; q?: string } = {}): Observable<{ users: User[] }> {
    let params = new HttpParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params = params.set(key, value);
    });
    return this.http.get<{ users: User[] }>(`${base}/users`, { params });
  }

  setUserStatus(id: number, status: 'active' | 'suspended'): Observable<{ user: User }> {
    return this.http.put<{ user: User }>(`${base}/users/${id}/status`, { status });
  }

  setUserRole(id: number, role: 'participant' | 'organizer' | 'admin'): Observable<{ user: User }> {
    return this.http.put<{ user: User }>(`${base}/users/${id}/role`, { role });
  }

  listOrganizations(): Observable<{ organizations: Organization[] }> {
    return this.http.get<{ organizations: Organization[] }>(`${base}/organizations`);
  }

  verifyOrganization(id: number): Observable<{ organization: Organization }> {
    return this.http.put<{ organization: Organization }>(`${base}/organizations/${id}/verify`, {});
  }

  listCompetitions(): Observable<{ competitions: Competition[] }> {
    return this.http.get<{ competitions: Competition[] }>(`${base}/competitions`);
  }

  hideCompetition(id: number): Observable<{ competition: Competition }> {
    return this.http.put<{ competition: Competition }>(`${base}/competitions/${id}/hide`, {});
  }

  listReports(status?: string): Observable<{ reports: Report[] }> {
    return this.http.get<{ reports: Report[] }>(`${base}/reports`, { params: status ? { status } : {} });
  }

  resolveReport(id: number, status: 'resolved' | 'dismissed'): Observable<{ report: Report }> {
    return this.http.put<{ report: Report }>(`${base}/reports/${id}`, { status });
  }
}
