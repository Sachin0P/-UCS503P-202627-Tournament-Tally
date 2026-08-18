import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LookingForTeamPost, Team } from '../models';

const base = `${environment.apiUrl}/find-team`;

@Injectable({ providedIn: 'root' })
export class FindTeamService {
  constructor(private http: HttpClient) {}

  findTeams(filters: { competitionId?: number; category?: string; role?: string; skill?: string }): Observable<{ teams: Team[] }> {
    let params = new HttpParams();
    Object.entries(filters).forEach(([k, v]) => { if (v) params = params.set(k, String(v)); });
    return this.http.get<{ teams: Team[] }>(`${base}/teams`, { params });
  }

  listPosts(filters: { competitionId?: number; category?: string; role?: string }): Observable<{ posts: LookingForTeamPost[] }> {
    let params = new HttpParams();
    Object.entries(filters).forEach(([k, v]) => { if (v) params = params.set(k, String(v)); });
    return this.http.get<{ posts: LookingForTeamPost[] }>(`${base}/posts`, { params });
  }

  createPost(payload: { competitionId: number; role: string; skills?: string; experience?: string; description?: string }): Observable<{ post: LookingForTeamPost }> {
    return this.http.post<{ post: LookingForTeamPost }>(`${base}/posts`, payload);
  }

  updatePost(id: number, payload: Record<string, unknown>): Observable<{ post: LookingForTeamPost }> {
    return this.http.put<{ post: LookingForTeamPost }>(`${base}/posts/${id}`, payload);
  }

  deletePost(id: number): Observable<void> {
    return this.http.delete<void>(`${base}/posts/${id}`);
  }
}
