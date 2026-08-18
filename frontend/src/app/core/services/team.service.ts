import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Team, TeamInvitation, TeamJoinRequest } from '../models';

const base = `${environment.apiUrl}/teams`;
const compBase = `${environment.apiUrl}/competitions`;

@Injectable({ providedIn: 'root' })
export class TeamService {
  constructor(private http: HttpClient) {}

  mine(): Observable<{ teams: Team[] }> {
    return this.http.get<{ teams: Team[] }>(`${base}/mine`);
  }

  listForCompetition(competitionId: number, lookingForMembers = false): Observable<{ teams: Team[] }> {
    const suffix = lookingForMembers ? '?lookingForMembers=true' : '';
    return this.http.get<{ teams: Team[] }>(`${compBase}/${competitionId}/teams${suffix}`);
  }

  get(teamId: number): Observable<{ team: Team }> {
    return this.http.get<{ team: Team }>(`${base}/${teamId}`);
  }

  create(competitionId: number, payload: Record<string, unknown>): Observable<{ team: Team }> {
    return this.http.post<{ team: Team }>(`${compBase}/${competitionId}/teams`, payload);
  }

  update(teamId: number, payload: Record<string, unknown>): Observable<{ team: Team }> {
    return this.http.put<{ team: Team }>(`${base}/${teamId}`, payload);
  }

  remove(teamId: number): Observable<void> {
    return this.http.delete<void>(`${base}/${teamId}`);
  }

  leave(teamId: number): Observable<void> {
    return this.http.post<void>(`${base}/${teamId}/leave`, {});
  }

  transferCaptain(teamId: number, userId: number): Observable<{ team: Team }> {
    return this.http.post<{ team: Team }>(`${base}/${teamId}/transfer-captain`, { userId });
  }

  removeMember(teamId: number, userId: number): Observable<{ team: Team }> {
    return this.http.delete<{ team: Team }>(`${base}/${teamId}/members/${userId}`);
  }

  requestToJoin(teamId: number, message?: string): Observable<{ request: TeamJoinRequest }> {
    return this.http.post<{ request: TeamJoinRequest }>(`${base}/${teamId}/join-request`, { message });
  }

  listJoinRequests(teamId: number): Observable<{ requests: TeamJoinRequest[] }> {
    return this.http.get<{ requests: TeamJoinRequest[] }>(`${base}/${teamId}/join-requests`);
  }

  respondJoinRequest(teamId: number, requestId: number, action: 'accept' | 'reject'): Observable<{ request: TeamJoinRequest }> {
    return this.http.put<{ request: TeamJoinRequest }>(`${base}/${teamId}/join-requests/${requestId}`, { action });
  }

  cancelJoinRequest(teamId: number, requestId: number): Observable<void> {
    return this.http.delete<void>(`${base}/${teamId}/join-requests/${requestId}`);
  }

  invite(teamId: number, userId: number): Observable<{ invitation: TeamInvitation }> {
    return this.http.post<{ invitation: TeamInvitation }>(`${base}/${teamId}/invite`, { userId });
  }

  myInvitations(): Observable<{ invitations: TeamInvitation[] }> {
    return this.http.get<{ invitations: TeamInvitation[] }>(`${base}/invitations/mine`);
  }

  respondInvitation(invitationId: number, action: 'accept' | 'reject'): Observable<{ invitation: TeamInvitation }> {
    return this.http.put<{ invitation: TeamInvitation }>(`${base}/invitations/${invitationId}`, { action });
  }

  cancelInvitation(invitationId: number): Observable<void> {
    return this.http.delete<void>(`${base}/invitations/${invitationId}`);
  }
}
