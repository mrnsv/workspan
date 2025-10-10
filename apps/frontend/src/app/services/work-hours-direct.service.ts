import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, throwError, forkJoin, of } from 'rxjs';
import { map, tap, shareReplay, catchError, switchMap } from 'rxjs/operators';
import { WorkHoursStats, UnifiedWorkHoursResponse } from '../models/work-hours.model';
import { GreytHRService, GreytHRSession } from './greythr.service';

export interface SwipeData {
  punchDateTime: string;
  inOutIndicator: 0 | 1; // 0 = OUT, 1 = IN
}

export interface SwipePair {
  inSwipe: string;
  outSwipe: string;
  actualHours: number;
  duration: string;
  outDuration?: string;
}

export interface WorkSession {
  totalActualHours: number;
  formattedTime: string;
  isCurrentlyWorking: boolean;
  swipePairs: SwipePair[];
}

@Injectable({
  providedIn: 'root'
})
export class WorkHoursDirectService {
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

  constructor(private greythrService: GreytHRService) {}

  /**
   * Clear any existing error state
   */
  clearError(): void {
    this.errorSubject.next(null);
  }

  /**
   * Get work logs data using direct GreytHR API calls
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
    
    // Get session data from GreytHR service
    const session = this.greythrService.getCurrentSession();
    
    if (!session) {
      this.loadingSubject.next(false);
      return throwError(() => new Error('No GreytHR session available. Please authenticate first.'));
    }

    // Clear any existing errors
    this.clearError();

    // Create the HTTP observable with caching
    const workLogsObservable = this.fetchWorkLogsData(session, startDate, endDate, period).pipe(
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
      }),
      shareReplay(1),
      catchError(error => {
        this.loadingSubject.next(false);
        this.errorSubject.next(error.message);
        return throwError(() => error);
      })
    );

    // Cache the observable
    this.unifiedCache.set(cacheKey, workLogsObservable);
    
    // Auto-expire cache after duration
    setTimeout(() => {
      this.unifiedCache.delete(cacheKey);
    }, this.CACHE_DURATION);

    return workLogsObservable;
  }

  /**
   * Fetch work logs data from GreytHR APIs
   */
  private fetchWorkLogsData(session: GreytHRSession, startDate: string, endDate: string, period: string): Observable<UnifiedWorkHoursResponse> {
    if (period === 'day') {
      return this.fetchDailyWorkLogs(session, startDate);
    } else {
      return this.fetchPeriodWorkLogs(session, startDate, endDate, period);
    }
  }

  /**
   * Fetch daily work logs using swipes API
   */
  private fetchDailyWorkLogs(session: GreytHRSession, date: string): Observable<UnifiedWorkHoursResponse> {
    return this.greythrService.getSwipes(session.employeeId, date).pipe(
      map(swipesData => {
        const swipes: SwipeData[] = swipesData.swipe || [];
        const workHours = this.calculateDailyWorkHours(swipes, date);
        
        // Transform swipes data for frontend
        const allSwipes = swipes.map(swipe => ({
          punchDateTime: swipe.punchDateTime,
          inOutIndicator: swipe.inOutIndicator,
          time: new Date(swipe.punchDateTime + 'Z').toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
          type: swipe.inOutIndicator === 1 ? 'IN' as const : 'OUT' as const,
          indicator: swipe.inOutIndicator
        }));

        const sessions: WorkSession = {
          totalActualHours: workHours.totalActualHours,
          formattedTime: workHours.formattedTime,
          isCurrentlyWorking: workHours.isCurrentlyWorking,
          swipePairs: workHours.swipePairs.map(pair => {
            // Calculate precise duration from actual timestamps
            const inTime = new Date(pair.inSwipe);
            const outTime = new Date(pair.outSwipe);
            const durationMs = outTime.getTime() - inTime.getTime();
            const totalSeconds = Math.floor(durationMs / 1000);
            
            // Round to nearest minute (if seconds >= 30, round up)
            const totalMinutes = Math.round(totalSeconds / 60);
            const hours = Math.floor(totalMinutes / 60);
            const minutes = totalMinutes % 60;
            
            return {
              inSwipe: new Date(pair.inSwipe.endsWith('Z') ? pair.inSwipe : pair.inSwipe + 'Z').toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
              outSwipe: new Date(pair.outSwipe.endsWith('Z') ? pair.outSwipe : pair.outSwipe + 'Z').toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
              actualHours: pair.actualHours,
              duration: `${hours}h ${minutes}m`,
              outDuration: pair.outDuration
            };
          })
        };

        const REQUIRED_HOURS = 8;
        const actualHours = workHours.totalActualHours;
        const shortfallHours = Math.max(0, REQUIRED_HOURS - actualHours);
        const excessHours = Math.max(0, actualHours - REQUIRED_HOURS);
        const completionPercentage = REQUIRED_HOURS > 0 ? Math.min(100, (actualHours / REQUIRED_HOURS) * 100) : 100;
        const isComplete = actualHours >= REQUIRED_HOURS;
        const isExcess = actualHours > REQUIRED_HOURS;
        const statusMode = isExcess ? 'excess' : isComplete ? 'complete' : 'incomplete';

        return {
          success: true,
          date: date,
          startDate: date,
          endDate: date,
          period: 'day',
          
          // Raw data
          totalSwipes: allSwipes.length,
          allSwipes,
          
          // Sessions data
          sessions,
          
          // Calculated statistics
          stats: {
            actualHours,
            requiredHours: REQUIRED_HOURS,
            shortfallHours,
            excessHours,
            isComplete,
            completionPercentage,
            statusMode
          },

          // Attendance status information (default for day)
          attendanceStatusInfo: {
            "P": 0.0,
            "H": 0.0,
            "L": 0.0,
            "O": 0.0
          },
          
          // Enhanced Calculation (not applicable for day)
          enhancedCalculation: {
            currentDateInRange: false,
            yesterdayDateInRange: false,
            isBefore1030AM: false,
            achievementTime: null,
            additionalSources: {
              currentActualHours: 0,
              yesterdayActualHours: 0
            }
          },
          
          // UI display data
          display: {
            activeHours: this.formatHours(actualHours),
            requiredHours: this.formatHours(REQUIRED_HOURS),
            actualRequiredHours: this.formatHours(REQUIRED_HOURS),
            excessTime: isExcess ? this.formatHours(excessHours) : null,
            shortfallTime: !isComplete ? this.formatHours(shortfallHours) : null,
            progressPercentage: Math.round(completionPercentage),
            statusMessage: isExcess 
              ? `OVERDRIVE MODE: +${this.formatHours(excessHours)}`
              : isComplete 
                ? 'COMPLETE'
                : `${this.formatHours(shortfallHours)} REMAINING`,
            statusClass: statusMode
          },

          // Additional metadata
          metadata: {
            currentTime: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
            lastUpdated: new Date().toISOString(),
            timezone: 'Asia/Kolkata'
          },
          
          // Employee information
          employee: {
            employeeId: session.employeeId,
            employeeName: session.employeeName,
            employeeNumber: session.employeeNumber
          }
        };
      })
    );
  }

  /**
   * Fetch period work logs (week/month) using total hours API
   */
  private fetchPeriodWorkLogs(session: GreytHRSession, startDate: string, endDate: string, period: string): Observable<UnifiedWorkHoursResponse> {
    return forkJoin({
      totalHours: this.greythrService.getTotalHours(session.employeeId, startDate, endDate),
      insights: this.greythrService.getInsights(session.employeeId, startDate, endDate).pipe(
        catchError(() => of({ monthlyStatusInfo: { P: 0, H: 0, L: 0, O: 0 } }))
      )
    }).pipe(
      map(({ totalHours, insights }) => {
        // Convert totalProductionHours from minutes to hours
        const totalProductionMinutes = totalHours.totalProductionHours || 0;
        const actualHours = totalProductionMinutes / 60;
        const formattedTime = this.convertMinutesToHoursMinutes(totalProductionMinutes);

        // Calculate required hours based on weekdays in range
        const weekdays = this.calculateWeekdaysInRange(startDate, endDate);
        const REQUIRED_HOURS = 8 * weekdays;

        // Get attendance status info
        const attendanceStatusInfo = insights?.monthlyStatusInfo || { P: 0, H: 0, L: 0, O: 0 };

        // Calculate actual required hours (deduct H/L days)
        const deductionDays = (attendanceStatusInfo.H || 0) + (attendanceStatusInfo.L || 0);
        const deductionHours = deductionDays * 8;
        const actualRequiredHours = Math.max(0, REQUIRED_HOURS - deductionHours);

        const shortfallHours = Math.max(0, actualRequiredHours - actualHours);
        const excessHours = Math.max(0, actualHours - actualRequiredHours);
        const completionPercentage = actualRequiredHours > 0 ? Math.min(100, (actualHours / actualRequiredHours) * 100) : 100;
        const isComplete = actualHours >= actualRequiredHours;
        const isExcess = actualHours > actualRequiredHours;
        const statusMode = isExcess ? 'excess' : isComplete ? 'complete' : 'incomplete';

        return {
          success: true,
          date: startDate,
          startDate,
          endDate,
          period,
          
          // Raw data
          totalSwipes: 0,
          allSwipes: [],
          
          // Sessions data
          sessions: {
            totalActualHours: actualHours,
            formattedTime: formattedTime,
            isCurrentlyWorking: false,
            swipePairs: []
          },
          
          // Calculated statistics
          stats: {
            actualHours,
            requiredHours: REQUIRED_HOURS,
            shortfallHours,
            excessHours,
            isComplete,
            completionPercentage,
            statusMode
          },

          // Attendance status information
          attendanceStatusInfo,
          
          // Enhanced Calculation
          enhancedCalculation: {
            currentDateInRange: false,
            yesterdayDateInRange: false,
            isBefore1030AM: false,
            achievementTime: null,
            additionalSources: {
              currentActualHours: 0,
              yesterdayActualHours: 0
            }
          },
          
          // UI display data
          display: {
            activeHours: this.formatHours(actualHours),
            requiredHours: this.formatHours(REQUIRED_HOURS),
            actualRequiredHours: this.formatHours(actualRequiredHours),
            excessTime: isExcess ? this.formatHours(excessHours) : null,
            shortfallTime: !isComplete ? this.formatHours(shortfallHours) : null,
            progressPercentage: Math.round(completionPercentage),
            statusMessage: isExcess 
              ? `OVERDRIVE MODE: +${this.formatHours(excessHours)}`
              : isComplete 
                ? 'COMPLETE'
                : `${this.formatHours(shortfallHours)} REMAINING`,
            statusClass: statusMode
          },

          // Additional metadata
          metadata: {
            currentTime: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
            lastUpdated: new Date().toISOString(),
            timezone: 'Asia/Kolkata'
          },
          
          // Employee information
          employee: {
            employeeId: session.employeeId,
            employeeName: session.employeeName,
            employeeNumber: session.employeeNumber
          }
        };
      })
    );
  }

  /**
   * Calculate daily work hours from swipes data
   */
  private calculateDailyWorkHours(swipes: SwipeData[], date: string): { totalActualHours: number, formattedTime: string, isCurrentlyWorking: boolean, swipePairs: any[], lastPunchIn: string | null } {
    // This is a simplified version - you might want to port the full logic from your backend
    let totalMinutes = 0;
    let isCurrentlyWorking = false;
    let lastPunchIn: string | null = null;
    const swipePairs: any[] = [];

    // Sort swipes by time
    const sortedSwipes = swipes.sort((a, b) => 
      new Date(a.punchDateTime).getTime() - new Date(b.punchDateTime).getTime()
    );

    let currentInSwipe: SwipeData | null = null;

    for (const swipe of sortedSwipes) {
      if (swipe.inOutIndicator === 1) { // IN
        currentInSwipe = swipe;
        lastPunchIn = swipe.punchDateTime;
        isCurrentlyWorking = true;
      } else if (swipe.inOutIndicator === 0 && currentInSwipe) { // OUT
        const inTime = new Date(currentInSwipe.punchDateTime);
        const outTime = new Date(swipe.punchDateTime);
        const durationMs = outTime.getTime() - inTime.getTime();
        const durationMinutes = Math.round(durationMs / (1000 * 60));
        
        totalMinutes += durationMinutes;
        
        swipePairs.push({
          inSwipe: currentInSwipe.punchDateTime,
          outSwipe: swipe.punchDateTime,
          actualHours: durationMinutes / 60,
          outDuration: `${Math.floor(durationMinutes / 60)}h ${durationMinutes % 60}m`
        });
        
        currentInSwipe = null;
        isCurrentlyWorking = false;
      }
    }

    const totalActualHours = totalMinutes / 60;
    const hours = Math.floor(totalActualHours);
    const minutes = Math.round((totalActualHours - hours) * 60);
    const formattedTime = `${hours}h ${minutes}m`;

    return {
      totalActualHours,
      formattedTime,
      isCurrentlyWorking,
      swipePairs,
      lastPunchIn
    };
  }

  /**
   * Helper methods
   */
  private formatDate(date: Date): string {
    return date.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  }

  private generateCacheKey(date: string, period: string): string {
    return `${date}-${period}`;
  }

  private calculateDateRange(date: string, period: string): { startDate: string, endDate: string } {
    const targetDate = new Date(date);
    
    if (period === 'day') {
      return { startDate: date, endDate: date };
    } else if (period === 'week') {
      const startOfWeek = new Date(targetDate);
      startOfWeek.setDate(targetDate.getDate() - targetDate.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      
      return {
        startDate: startOfWeek.toISOString().split('T')[0],
        endDate: endOfWeek.toISOString().split('T')[0]
      };
    } else { // month
      const startOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
      const endOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0);
      
      return {
        startDate: startOfMonth.toISOString().split('T')[0],
        endDate: endOfMonth.toISOString().split('T')[0]
      };
    }
  }

  private calculateWeekdaysInRange(startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    let weekdays = 0;
    
    const current = new Date(start);
    while (current <= end) {
      const dayOfWeek = current.getDay();
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        weekdays++;
      }
      current.setDate(current.getDate() + 1);
    }
    
    return weekdays;
  }

  private convertMinutesToHoursMinutes(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  }

  private formatHours(hours: number): string {
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);
    return `${wholeHours}h ${minutes}m`;
  }

  private parseHoursFromText(text: string): number {
    const match = text.match(/(\d+)h\s*(\d+)m/);
    if (match) {
      const hours = parseInt(match[1]);
      const minutes = parseInt(match[2]);
      return hours + (minutes / 60);
    }
    return 0;
  }
}
