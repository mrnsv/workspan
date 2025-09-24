import { Component, Input, OnInit, OnChanges, SimpleChanges, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Observable, Subscription, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { WorkHoursService } from '../../services/work-hours.service';
import { AuthService } from '../../services/auth.service';
import { WorkHoursStats, UnifiedWorkHoursResponse } from '../../models/work-hours.model';
import { TimePeriod } from '../swipe-data/swipe-data.component';

@Component({
  selector: 'app-work-hours',
  templateUrl: './work-hours.component.html',
  styleUrls: ['./work-hours.component.scss']
})
export class WorkHoursComponent implements OnInit, OnChanges, OnDestroy {
  @Input() selectedDate!: Date;
  @Input() selectionMode: TimePeriod = 'day';
  
  workHoursData: UnifiedWorkHoursResponse | null = null;
  workHoursStats: WorkHoursStats | null = null;
  loading$: Observable<boolean>;
  loadingMessage$: Observable<string>;
  error$: Observable<string | null>;
  
  private subscriptions = new Subscription();
  
  constructor(
    private workHoursService: WorkHoursService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {
    this.loading$ = combineLatest([
      this.workHoursService.loading$,
      this.authService.refreshing$
    ]).pipe(
      map(([dataLoading, cookieRefreshing]) => dataLoading || cookieRefreshing)
    );

    this.loadingMessage$ = combineLatest([
      this.workHoursService.loading$,
      this.authService.refreshing$
    ]).pipe(
      map(([dataLoading, cookieRefreshing]) => {
        if (cookieRefreshing) {
          return this.getRandomCookieRefreshMessage();
        } else if (dataLoading) {
          return this.getRandomDataSyncMessage();
        }
        return 'DATA SYNC';
      })
    );

    // Combine error streams from both services
    this.error$ = combineLatest([
      this.workHoursService.error$,
      this.authService.error$
    ]).pipe(
      map(([workHoursError, authError]) => workHoursError || authError)
    );
  }

  ngOnInit() {
    // Subscribe to work hours stats
    const statsSubscription = this.workHoursService.workHours$.subscribe(stats => {
      this.workHoursStats = stats;
      
      // Trigger change detection to ensure UI updates
      this.cdr.detectChanges();
    });
    this.subscriptions.add(statsSubscription);
    
    this.loadWorkHours();
  }

  ngOnChanges(changes: SimpleChanges) {
    // Reload data when either selectedDate or selectionMode changes
    if ((changes['selectedDate'] && !changes['selectedDate'].firstChange) ||
        (changes['selectionMode'] && !changes['selectionMode'].firstChange)) {
      this.loadWorkHours();
    }
  }

  private loadWorkHours() {
    const dateString = this.workHoursService.formatDate(this.selectedDate);
    
    
    // Only clear cache if this is a refresh action, not on normal date changes
    // this.workHoursService.clearDateCache(dateString);
    
    // Use the work logs API that provides all data in one call
    const apiSubscription = this.workHoursService.getWorkLogs(dateString, this.selectionMode).subscribe({
      next: (data) => {
        this.workHoursData = data;
        
        // Manually update stats to ensure they're always current (even from cache)
        // Parse actualRequiredHours from display format (e.g., "24h 0m" -> 24)
        const actualRequiredHoursText = data.display.actualRequiredHours;
        const actualRequiredHours = this.parseHoursFromText(actualRequiredHoursText);
        
        const stats = {
          actualHours: data.stats.actualHours,
          actualRequiredHours: actualRequiredHours,
          shortfallHours: data.stats.shortfallHours,
          excessHours: data.stats.excessHours,
          isComplete: data.stats.isComplete,
          completionPercentage: data.stats.completionPercentage
        };
        this.workHoursStats = stats;
        
        // Trigger change detection to ensure UI updates
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading unified work hours:', error);
        this.workHoursData = null;
        this.workHoursStats = null;
      }
    });
    this.subscriptions.add(apiSubscription);
  }

  getStatusClass(): string {
    if (!this.workHoursStats) return 'neutral';
    
    if (this.workHoursStats.isComplete) {
      return this.workHoursStats.excessHours > 0 ? 'excess' : 'complete';
    }
    
    return 'shortfall';
  }

  getStatusIcon(): string {
    if (!this.workHoursStats) return 'schedule';
    
    // If time achieved (complete or excess), show trending_up
    if (this.workHoursStats.isComplete) {
      return 'trending_up';
    }
    
    // If time not achieved, check working status
    if (this.workHoursData) {
      // If currently working (ON), show schedule
      if (this.workHoursData.sessions.isCurrentlyWorking) {
        return 'schedule';
      }
      // If not working (OFF), show warning
      else {
        return 'warning';
      }
    }
    
    // Fallback to schedule if no work data available
    return 'schedule';
  }

  getStatusMessage(): string {
    if (!this.workHoursStats) return 'Loading...';
    
    if (this.workHoursStats.isComplete) {
      if (this.workHoursStats.excessHours > 0) {
        return `Great job! ${this.workHoursService.formatHours(this.workHoursStats.excessHours)} overtime`;
      }
      return 'Target achieved! 🎉';
    }
    
    return `${this.workHoursService.formatHours(this.workHoursStats.shortfallHours)} remaining`;
  }

  getProgressBarColor(): string {
    if (!this.workHoursStats) return 'primary';
    
    if (this.workHoursStats.completionPercentage >= 100) return 'accent';
    if (this.workHoursStats.completionPercentage >= 75) return 'primary';
    return 'warn';
  }

  formatHours(hours: number): string {
    return this.workHoursService.formatHours(hours);
  }

  formatAchievementTime(achievementTime: string | null): string {
    if (!achievementTime) {
      return 'N/A';
    }
    
    try {
      // Parse the achievement time and format it for display
      const date = new Date(achievementTime);
      const timeString = date.toLocaleTimeString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
      
      return timeString; // Return only the time without date
    } catch (error) {
      console.error('Error formatting achievement time:', error);
      return 'Invalid';
    }
  }

  private parseHoursFromText(hoursText: string): number {
    // Parse format like "24h 30m" or "8h 0m" to decimal hours
    const match = hoursText.match(/(\d+)h\s*(\d+)m/);
    if (match) {
      const hours = parseInt(match[1], 10);
      const minutes = parseInt(match[2], 10);
      return hours + (minutes / 60);
    }
    return 0;
  }

  onRefresh() {
    // Clear errors before retry
    this.workHoursService.clearError();
    this.authService.clearError();
    
    // Clear cache only on explicit refresh
    const dateString = this.workHoursService.formatDate(this.selectedDate);
    this.workHoursService.clearDateCache(dateString);
    this.loadWorkHours();
  }

  clearErrors(): void {
    this.workHoursService.clearError();
    this.authService.clearError();
  }

  // Cyberpunk UI Methods
  getCyberpunkStatusClass(): string {
    if (!this.workHoursStats) return 'neutral';
    
    if (this.workHoursStats.isComplete) {
      return this.workHoursStats.excessHours > 0 ? 'excess-mode' : 'complete-mode';
    }
    
    return 'deficit-mode';
  }

  getCyberpunkStatusMessage(): string {
    if (!this.workHoursStats) return 'INITIALIZING...';
    
    if (this.workHoursStats.isComplete) {
      if (this.workHoursStats.excessHours > 0) {
        return `OVERDRIVE MODE: +${this.workHoursService.formatHours(this.workHoursStats.excessHours)}`;
      }
      return 'TARGET ACQUIRED';
    }
    
    return `DEFICIT: -${this.workHoursService.formatHours(this.workHoursStats.shortfallHours)}`;
  }

  getStatusIndicatorClass(): string {
    if (!this.workHoursStats) return 'neutral';
    
    // If time achieved (complete or excess), show success (green)
    if (this.workHoursStats.isComplete) {
      return 'excess'; // Use excess class for green color
    }
    
    // If time not achieved, check working status
    if (this.workHoursData) {
      // If currently working (ON), show warning (yellow)
      if (this.workHoursData.sessions.isCurrentlyWorking) {
        return 'warning';
      }
      // If not working (OFF), show deficit (red)
      else {
        return 'deficit';
      }
    }
    
    // Fallback to warning if no work data available
    return 'warning';
  }

  private getRandomCookieRefreshMessage(): string {
    const messages = [
      'ACCESS TOKEN REGENERATION'
    ];
    
    const randomIndex = Math.floor(Math.random() * messages.length);
    return messages[randomIndex];
  }

  private getRandomDataSyncMessage(): string {
    const messages = [
      'DATA SYNC'
    ];
    
    const randomIndex = Math.floor(Math.random() * messages.length);
    return messages[randomIndex];
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }
}
