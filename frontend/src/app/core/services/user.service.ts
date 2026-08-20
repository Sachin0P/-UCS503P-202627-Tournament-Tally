import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { User } from '../models';

const base = `${environment.apiUrl}/users`;

@Injectable({ providedIn: 'root' })
export class UserService {
  constructor(private http: HttpClient) {}

  get(id: number): Observable<{ user: User }> {
    return this.http.get<{ user: User }>(`${base}/${id}`);
  }

  updateMe(payload: { college?: string; rollNumber?: string; branch?: string }): Observable<{ user: User }> {
    return this.http.put<{ user: User }>(`${base}/me`, payload);
  }
}
