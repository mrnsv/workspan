import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';

export interface LoginCredentials {
  loginId: string;
  password: string;
}

export interface CookieRefreshResponse {
  success: boolean;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly API_BASE_URL = 'http://localhost:3000/api';
  
  private refreshingSubject = new BehaviorSubject<boolean>(false);
  public refreshing$ = this.refreshingSubject.asObservable();

  constructor(private http: HttpClient) {}

  refreshCookie(credentials?: LoginCredentials): Observable<CookieRefreshResponse> {
    this.refreshingSubject.next(true);
    
    // For now, we'll call the get-token automation directly
    // In a real implementation, you might want to send credentials to update env vars first
    return new Observable(observer => {
      // Simulate the cookie refresh process
      setTimeout(() => {
        this.refreshingSubject.next(false);
        observer.next({
          success: true,
          message: 'Cookie refreshed successfully'
        });
        observer.complete();
      }, 3000);
    });
  }

  updateCredentials(credentials: LoginCredentials): Observable<any> {
    // This would typically update the environment variables on the backend
    return this.http.post(`${this.API_BASE_URL}/update-credentials`, credentials);
  }

  testConnection(): Observable<any> {
    return this.http.get(`${this.API_BASE_URL}/ping`);
  }
}
