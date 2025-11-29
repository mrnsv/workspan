import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { EnvironmentService } from '../config/environment.config';

export interface LoginCredentials {
  loginId: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  sessionData?: {
    employeeId: number;
    employeeName: string;
    employeeNumber: string;
    cookie: string;
  };
}

export interface BrowserSessionData {
  employeeId: number;
  employeeName: string;
  employeeNumber: string;
  cookie: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly environmentService = EnvironmentService.getInstance();
  
  private get API_BASE_URL(): string {
    return this.environmentService.getApiBaseUrl();
  }
  
  private refreshingSubject = new BehaviorSubject<boolean>(false);
  public refreshing$ = this.refreshingSubject.asObservable();

  private errorSubject = new BehaviorSubject<string | null>(null);
  public error$ = this.errorSubject.asObservable();

  // Browser session management
  private currentSessionData: BrowserSessionData | null = null;
  private sessionDataSubject = new BehaviorSubject<BrowserSessionData | null>(null);
  public sessionData$ = this.sessionDataSubject.asObservable();

  constructor(private http: HttpClient) {
    // Load session from localStorage on service initialization
    this.loadSessionFromStorage();
  }

  // Browser storage methods
  private saveSessionToStorage(sessionData: BrowserSessionData): void {
    localStorage.setItem('workspan_session', JSON.stringify(sessionData));
    this.currentSessionData = sessionData;
    this.sessionDataSubject.next(sessionData);
  }

  private loadSessionFromStorage(): void {
    try {
      const stored = localStorage.getItem('workspan_session');
      if (stored) {
        const sessionData: BrowserSessionData = JSON.parse(stored);
        this.currentSessionData = sessionData;
        this.sessionDataSubject.next(sessionData);
      }
    } catch (error) {
      console.warn('Failed to load session from storage:', error);
      this.clearSessionStorage();
    }
  }

  private clearSessionStorage(): void {
    localStorage.removeItem('workspan_session');
    this.currentSessionData = null;
    this.sessionDataSubject.next(null);
  }

  /**
   * Handle HTTP errors
   */
  private handleHttpError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An unexpected error occurred';
    
    if (error.error instanceof ErrorEvent) {
      // Client-side or network error
      errorMessage = `Network error: ${error.error.message}`;
    } else {
      // Backend returned an unsuccessful response code
      if (typeof error.error === 'string' && error.error.includes('<html')) {
        // HTML response detected (likely an error page)
        if (error.status === 500) {
          errorMessage = 'Server configuration error. Please check backend setup and environment variables.';
        } else if (error.status === 403) {
          errorMessage = 'Authentication failed. Please refresh your session or check credentials.';
        } else if (error.status === 404) {
          errorMessage = 'API endpoint not found. Please check backend configuration.';
        } else {
          errorMessage = `Server error (${error.status}). Please check backend configuration.`;
        }
      } else if (error.error && typeof error.error === 'object' && error.error.message) {
        // JSON error response
        errorMessage = error.error.message;
      } else {
        // Other types of errors
        errorMessage = `HTTP ${error.status}: ${error.statusText || 'Unknown error'}`;
      }
    }
    
    console.error('Auth API Error:', {
      status: error.status,
      statusText: error.statusText,
      error: error.error,
      message: errorMessage
    });
    
    this.errorSubject.next(errorMessage);
    return throwError(() => new Error(errorMessage));
  }

  /**
   * Clear any existing error state
   */
  clearError(): void {
    this.errorSubject.next(null);
  }

  // Main login method - triggers get-token.ts and stores session data in browser
  login(credentials: LoginCredentials): Observable<LoginResponse> {
    this.clearError();
    this.refreshingSubject.next(true);
    
    return this.http.post<LoginResponse>(`${this.API_BASE_URL}/login`, credentials)
      .pipe(
        catchError(error => {
          this.refreshingSubject.next(false);
          return this.handleHttpError(error);
        }),
        tap({
          next: (response) => {
            this.refreshingSubject.next(false);
            if (response.success && response.sessionData) {
              this.saveSessionToStorage(response.sessionData);
            }
          },
          error: () => this.refreshingSubject.next(false)
        })
      );
  }

  // Get current session data for API calls
  getSessionData(): BrowserSessionData | null {
    return this.currentSessionData;
  }

  // Check if user is logged in
  isLoggedIn(): boolean {
    return this.currentSessionData !== null;
  }

  // Clear session data (logout)
  logout(): void {
    this.clearSessionStorage();
  }

  /**
   * Refresh session by re-logging in with stored credentials
   * Note: This requires credentials to be stored, which may not be available
   * For now, this will clear the session and require manual re-login
   */
  refreshSession(): Observable<boolean> {
    // Since we don't store credentials, we can't auto-refresh
    // Clear the session and return false to indicate refresh is not possible
    this.clearSessionStorage();
    return throwError(() => new Error('Session expired. Please login again.'));
  }
}