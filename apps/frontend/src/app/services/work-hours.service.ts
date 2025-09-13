import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { map, tap, shareReplay, catchError } from 'rxjs/operators';
import { WorkHoursStats, UnifiedWorkHoursResponse } from '../models/work-hours.model';
import { EnvironmentService } from '../config/environment.config';
import { AuthService, BrowserSessionData } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class WorkHoursService {
  private readonly environmentService = EnvironmentService.getInstance();
  
  private get API_BASE_URL(): string {
    return this.environmentService.getApiBaseUrl();
  }
  
  private loadingSubject = new BehaviorSubject<boolean>(false);
  public loading$ = this.loadingSubject.asObservable();
  
  private workHoursSubject = new BehaviorSubject<WorkHoursStats | null>(null);
  public workHours$ = this.workHoursSubject.asObservable();
  
  private employeeSubject = new BehaviorSubject<{employeeId: number, employeeName: string, employeeNumber: string} | null>(null);
  public employee$ = this.employeeSubject.asObservable();

  private errorSubject = new BehaviorSubject<string | null>(null);
  public error$ = this.errorSubject.asObservable();

  // Caching mechanism
  private unifiedCache = new Map<string, Observable<UnifiedWorkHoursResponse>>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  /**
   * Handle HTTP errors
   */
  private handleHttpError(error: HttpErrorResponse): Observable<never> {
    this.loadingSubject.next(false);
    
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
    
    console.error('API Error:', {
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

  /**
   * Get work logs data using session data stored in browser
   */
  getWorkLogs(date?: string, period: string = 'day'): Observable<UnifiedWorkHoursResponse> {
    const targetDate = date || this.formatDate(new Date());
    const cacheKey = this.generateCacheKey(targetDate, period);
    
    // Check if we have a cached observable for this date
    if (this.unifiedCache.has(cacheKey)) {
      const cachedObservable = this.unifiedCache.get(cacheKey)!;
      
      // Ensure stats are updated even when using cached data
      return cachedObservable.pipe(
        tap(response => {
          const stats: WorkHoursStats = {
            actualHours: response.stats.actualHours,
            actualRequiredHours: this.parseHoursFromText(response.display.actualRequiredHours),
            shortfallHours: response.stats.shortfallHours,
            excessHours: response.stats.excessHours,
            isComplete: response.stats.isComplete,
            completionPercentage: response.stats.completionPercentage
          };
          this.workHoursSubject.next(stats);
          
          // Update employee data
          if (response.employee) {
            this.employeeSubject.next(response.employee);
          }
        })
      );
    }

    this.loadingSubject.next(true);
    
    // Calculate startDate and endDate based on period
    const { startDate, endDate } = this.calculateDateRange(targetDate, period);
    
    // Get session data from AuthService
    const sessionData = this.authService.getSessionData();
    
    if (!sessionData) {
      this.loadingSubject.next(false);
      return throwError(() => new Error('No session data available. Please login first.'));
    }

    // Clear any existing errors
    this.clearError();

    // Prepare request body with session data
    const requestBody = {
      sessionData: sessionData,
      startDate: startDate,
      endDate: endDate,
      period: period
    };

    // Create the HTTP observable with caching
    const request$ = this.http.post<UnifiedWorkHoursResponse>(`${this.API_BASE_URL}/hours/worklogs`, requestBody)
      .pipe(
        map(response => {
          this.loadingSubject.next(false);
          // Update the work hours stats subject with the calculated stats
          const stats: WorkHoursStats = {
            actualHours: response.stats.actualHours,
            actualRequiredHours: this.parseHoursFromText(response.display.actualRequiredHours),
            shortfallHours: response.stats.shortfallHours,
            excessHours: response.stats.excessHours,
            isComplete: response.stats.isComplete,
            completionPercentage: response.stats.completionPercentage
          };
          this.workHoursSubject.next(stats);
          
          // Update employee data
          if (response.employee) {
            this.employeeSubject.next(response.employee);
          }
          
          return response;
        }),
        catchError(error => this.handleHttpError(error)),
        shareReplay(1), // Cache the result and share it among multiple subscribers
        tap(() => {
          // Auto-expire cache after duration
          setTimeout(() => {
            this.unifiedCache.delete(cacheKey);
          }, this.CACHE_DURATION);
        })
      );

    // Store in cache before returning
    this.unifiedCache.set(cacheKey, request$);
    return request$;
  }

  /**
   * Clear all cached data to force fresh API calls
   */
  clearCache(): void {
    this.unifiedCache.clear();
  }

  /**
   * Force refresh data for a specific date and period
   */
  forceRefresh(dateString: string, period: string = 'day'): Observable<UnifiedWorkHoursResponse> {
    // Clear specific cache entry
    this.clearDateCache(dateString, period);
    
    // Immediately fetch fresh data
    return this.getWorkLogs(dateString, period);
  }

  /**
   * Clear cache for a specific date and period
   */
  clearDateCache(date: string, period: string = 'day'): void {
    const cacheKey = this.generateCacheKey(date, period);
    this.unifiedCache.delete(cacheKey);
  }

  formatHours(hours: number): string {
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);
    return `${wholeHours}h ${minutes}m`;
  }

  formatDate(date: Date | any): string {
    if (!date) {
      return new Date().toISOString().split('T')[0]; // fallback to today
    }
    
    // Handle Moment objects (from Angular Material Moment adapter)
    if (date && typeof date.format === 'function') {
      return date.format('YYYY-MM-DD');
    }
    
    // Handle native Date objects
    if (date instanceof Date) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    
    // Handle string dates
    if (typeof date === 'string') {
      const parsedDate = new Date(date);
      if (!isNaN(parsedDate.getTime())) {
        const year = parsedDate.getFullYear();
        const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
        const day = String(parsedDate.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
    }
    
    // Fallback to today's date
    return new Date().toISOString().split('T')[0];
  }

  /**
   * Calculate startDate and endDate based on period type
   */
  private calculateDateRange(dateString: string, period: string): { startDate: string, endDate: string } {
    const date = new Date(dateString);
    
    if (period === 'day') {
      return {
        startDate: dateString,
        endDate: dateString
      };
    }
    
    if (period === 'week') {
      // Calculate week start (Sunday) and end (Saturday)
      const weekStart = new Date(date);
      weekStart.setUTCDate(date.getUTCDate() - date.getUTCDay());
      
      const weekEnd = new Date(date);
      weekEnd.setUTCDate(date.getUTCDate() + (6 - date.getUTCDay()));
      
      return {
        startDate: weekStart.toISOString().split('T')[0],
        endDate: weekEnd.toISOString().split('T')[0]
      };
    }
    
    if (period === 'month') {
      // Calculate month start and end
      const monthStart = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
      const monthEnd = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));
      
      return {
        startDate: monthStart.toISOString().split('T')[0],
        endDate: monthEnd.toISOString().split('T')[0]
      };
    }
    
    // Fallback for unknown periods
    return {
      startDate: dateString,
      endDate: dateString
    };
  }

  /**
   * Generate cache key based on period type
   */
  private generateCacheKey(dateString: string, period: string): string {
    const { startDate } = this.calculateDateRange(dateString, period);
    return `${startDate}-${period}`;
  }

  /**
   * Parse hours from formatted text like "24h 30m" to decimal hours
   */
  private parseHoursFromText(hoursText: string): number {
    const match = hoursText.match(/(\d+)h\s*(\d+)m/);
    if (match) {
      const hours = parseInt(match[1], 10);
      const minutes = parseInt(match[2], 10);
      return hours + (minutes / 60);
    }
    return 0;
  }
}