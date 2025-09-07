import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { map, tap, shareReplay } from 'rxjs/operators';
import { WorkHoursStats, UnifiedWorkHoursResponse } from '../models/work-hours.model';

@Injectable({
  providedIn: 'root'
})
export class WorkHoursService {
  private readonly API_BASE_URL = 'http://localhost:3000/api';
  
  private loadingSubject = new BehaviorSubject<boolean>(false);
  public loading$ = this.loadingSubject.asObservable();
  
  private workHoursSubject = new BehaviorSubject<WorkHoursStats | null>(null);
  public workHours$ = this.workHoursSubject.asObservable();
  
  private employeeSubject = new BehaviorSubject<{employeeId: number, employeeName: string, employeeNumber: string} | null>(null);
  public employee$ = this.employeeSubject.asObservable();

  // Caching mechanism
  private unifiedCache = new Map<string, Observable<UnifiedWorkHoursResponse>>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  constructor(private http: HttpClient) {}

  /**
   * Get work logs data (replaces separate sessions + swipes calls)
   * This single API call returns all data with pre-calculated values
   */
  getWorkLogs(date?: string, period: string = 'day'): Observable<UnifiedWorkHoursResponse> {
    const targetDate = date || this.formatDate(new Date());
    const cacheKey = this.generateCacheKey(targetDate, period);
    
    console.log(`🎯 getWorkLogs called with date: ${date}, period: ${period}, cacheKey: ${cacheKey}`);
    
    // Check if we have a cached observable for this date
    if (this.unifiedCache.has(cacheKey)) {
      console.log(`🟢 Using cached work logs data for ${cacheKey}`);
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
          console.log('📊 Updating workHoursSubject with cached stats:', stats);
          this.workHoursSubject.next(stats);
          
          // Update employee data
          if (response.employee) {
            this.employeeSubject.next(response.employee);
          }
        })
      );
    }

    console.log(`🔵 Fetching work logs data for ${cacheKey}`);
    this.loadingSubject.next(true);
    
    // Calculate startDate and endDate based on period
    const { startDate, endDate } = this.calculateDateRange(targetDate, period);
    
    let params = new HttpParams();
    params = params.set('period', period);
    params = params.set('startDate', startDate);
    if (period !== 'day') {
      params = params.set('endDate', endDate);
    }

    // Create the HTTP observable with caching
    const request$ = this.http.get<UnifiedWorkHoursResponse>(`${this.API_BASE_URL}/hours/worklogs`, { params })
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
          console.log('📊 Updating workHoursSubject with stats:', stats);
          this.workHoursSubject.next(stats);
          
          // Update employee data
          if (response.employee) {
            this.employeeSubject.next(response.employee);
          }
          
          return response;
        }),
        shareReplay(1), // Cache the result and share it among multiple subscribers
        tap(() => {
          // Auto-expire cache after duration
          setTimeout(() => {
            this.unifiedCache.delete(cacheKey);
            console.log(`🗑️ Expired unified cache for ${cacheKey}`);
          }, this.CACHE_DURATION);
        })
      );

    // Store in cache before returning
    this.unifiedCache.set(cacheKey, request$);
    return request$;
  }


  getDailyHours(date?: string): Observable<any> {
    let params = new HttpParams();
    if (date) {
      params = params.set('date', date);
    }

    return this.http.get(`${this.API_BASE_URL}/hours/daily`, { params });
  }

  refreshCookie(): Observable<any> {
    return this.http.post(`${this.API_BASE_URL}/refresh-cookie`, {});
  }

  /**
   * Clear all cached data to force fresh API calls
   */
  clearCache(): void {
    console.log('🗑️ Clearing all cached data');
    this.unifiedCache.clear();
    // Don't reset stats to null - preserve existing data during refresh to prevent UI flicker
    // The new data will update the stats naturally when it arrives
  }

  /**
   * Force refresh data for a specific date and period
   */
  forceRefresh(dateString: string, period: string = 'day'): Observable<UnifiedWorkHoursResponse> {
    console.log(`🔄 Force refreshing data for ${dateString} (${period})`);
    
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
    console.log(`🗑️ Clearing cache for date: ${date}, period: ${period}, cacheKey: ${cacheKey}`);
    this.unifiedCache.delete(cacheKey);
    // Don't reset stats here - let the new data update them naturally
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
   * For week/month modes, use the start date of the period to ensure
   * all dates within the same period use the same cache key
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
