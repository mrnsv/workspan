import { Component, Input, OnInit, OnChanges, SimpleChanges, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Observable, Subscription, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { WorkHoursService } from '../../services/work-hours.service';
import { AuthService } from '../../services/auth.service';
import { WorkHoursStats, UnifiedWorkHoursResponse, SwipeData } from '../../models/work-hours.model';
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
  isLoading: boolean = false;
  
  // Scrambling values for loading animation
  scramblingHours: string = '00h 00m';
  scramblingPercentage: number = 0;
  scramblingWte: string = '--:-- --';
  
  // Counter variables for consecutive counting
  private counterMinutes: number = 0;
  private counterHours: number = 0;
  private counterPercentage: number = 0;
  private counterWteMinutes: number = 0;
  private counterWteHours: number = 1;
  private counterWteAmPm: number = 0; // 0 = AM, 1 = PM
  
  private subscriptions = new Subscription();
  private scramblingInterval: any = null;
  private realTimeUpdateInterval: any = null;
  
  // Store base stats from API for real-time calculations
  private baseActualHours: number = 0;
  private baseLastSwipeTime: Date | null = null;
  
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
    
    // Subscribe to loading state
    const loadingSubscription = this.loading$.subscribe(loading => {
      this.isLoading = loading;
      if (loading) {
        this.startScrambling();
      } else {
        this.stopScrambling();
      }
      this.cdr.detectChanges();
    });
    this.subscriptions.add(loadingSubscription);
    
    this.loadWorkHours();
  }

  ngOnChanges(changes: SimpleChanges) {
    // Reload data when either selectedDate or selectionMode changes
    if ((changes['selectedDate'] && !changes['selectedDate'].firstChange) ||
        (changes['selectionMode'] && !changes['selectionMode'].firstChange)) {
      // Stop real-time updates before loading new data
      this.stopRealTimeUpdates();
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
        
        // Store base values for real-time calculations
        this.baseActualHours = data.stats.actualHours;
        this.baseLastSwipeTime = this.getLastSwipeTime(data);
        
        const stats = {
          actualHours: data.stats.actualHours,
          actualRequiredHours: actualRequiredHours,
          shortfallHours: data.stats.shortfallHours,
          excessHours: data.stats.excessHours,
          isComplete: data.stats.isComplete,
          completionPercentage: data.stats.completionPercentage
        };
        this.workHoursStats = stats;
        
        // Start real-time updates after data is loaded
        this.startRealTimeUpdates();
        
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
        return `Great job! ${this.formatHoursWithPadding(this.workHoursStats.excessHours)} overtime`;
      }
      return 'Target achieved! 🎉';
    }
    
    return `${this.formatHoursWithPadding(this.workHoursStats.shortfallHours)} remaining`;
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

  formatHoursWithPadding(hours: number | null | undefined): string {
    if (hours === null || hours === undefined) {
      return '--h --m';
    }
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);
    const paddedHours = String(wholeHours).padStart(2, '0');
    const paddedMinutes = String(minutes).padStart(2, '0');
    return `${paddedHours}h ${paddedMinutes}m`;
  }

  formatAchievementTime(achievementTime: string | null): string {
    if (!achievementTime) {
      return '--:-- --';
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
      return '--:-- --';
    }
  }

  getWteDisplay(): string {
    if (this.isLoading) {
      return this.scramblingWte;
    }
    return this.formatAchievementTime(this.workHoursData?.enhancedCalculation?.achievementTime || null);
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
    if (this.isLoading) {
      return 'SYNCING...';
    }
    if (!this.workHoursStats) return '-';
    
    if (this.workHoursStats.isComplete) {
      if (this.workHoursStats.excessHours > 0) {
        return `OVERDRIVE MODE: +${this.formatHoursWithPadding(this.workHoursStats.excessHours)}`;
      }
      return 'TARGET ACQUIRED';
    }
    
    return `DEFICIT: -${this.formatHoursWithPadding(this.workHoursStats.shortfallHours)}`;
  }

  getActiveHoursDisplay(): string {
    if (this.isLoading) {
      return this.scramblingHours;
    }
    return this.formatHoursWithPadding(this.workHoursStats?.actualHours);
  }

  getCompletionPercentage(): number {
    if (this.isLoading) {
      return this.scramblingPercentage;
    }
    if (!this.workHoursStats) return 0;
    return this.workHoursStats.completionPercentage;
  }

  getCompletionPercentageText(): string {
    if (this.isLoading) {
      return `${Math.round(this.scramblingPercentage)}% COMPLETE`;
    }
    if (!this.workHoursStats) return '-% COMPLETE';
    return `${Math.round(this.workHoursStats.completionPercentage)}% COMPLETE`;
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

  // Helper methods for always-visible stats
  getDefSurLabel(): string {
    if (!this.workHoursStats) return 'DEF';
    if (this.workHoursStats.excessHours > 0) return 'SUR';
    if (this.workHoursStats.shortfallHours > 0) return 'DEF';
    return 'DEF';
  }

  getDefSurValue(): string {
    if (this.isLoading) {
      return this.scramblingHours;
    }
    if (!this.workHoursStats) return '--h --m';
    if (this.workHoursStats.excessHours > 0) {
      return this.formatHoursWithPadding(this.workHoursStats.excessHours);
    }
    if (this.workHoursStats.shortfallHours > 0) {
      return this.formatHoursWithPadding(this.workHoursStats.shortfallHours);
    }
    return '--h --m';
  }

  getDefSurClass(): string {
    if (!this.workHoursStats) return '';
    if (this.workHoursStats.excessHours > 0) return 'success';
    if (this.workHoursStats.shortfallHours > 0) return 'warning';
    return '';
  }

  getDefSurIcon(): string {
    if (!this.workHoursStats) return 'remove';
    if (this.workHoursStats.excessHours > 0) return 'trending_up';
    if (this.workHoursStats.shortfallHours > 0) return 'warning';
    return 'remove';
  }

  getWorkingStatusClass(): string {
    if (!this.workHoursData) return '';
    return this.workHoursData.sessions.isCurrentlyWorking ? 'active' : 'inactive';
  }

  getWorkingStatusIcon(): string {
    if (!this.workHoursData) return 'schedule';
    return this.workHoursData.sessions.isCurrentlyWorking ? 'work' : 'home';
  }

  getWorkingStatusValue(): string {
    if (!this.workHoursData) return '-';
    return this.workHoursData.sessions.isCurrentlyWorking ? 'ON' : 'OFF';
  }

  getRequiredHoursDisplay(): string {
    if (this.isLoading) {
      return this.scramblingHours;
    }
    return this.formatHoursWithPadding(this.workHoursStats?.actualRequiredHours);
  }

  private startScrambling(): void {
    this.stopScrambling(); // Clear any existing interval
    
    // Reset counters
    this.counterMinutes = 0;
    this.counterHours = 0;
    this.counterPercentage = 0;
    this.counterWteMinutes = 0;
    this.counterWteHours = 1;
    this.counterWteAmPm = 0;
    
    // Update values consecutively
    this.scramblingInterval = setInterval(() => {
      // Count minutes (0-59), then increment hours (0-24), then reset
      this.counterMinutes++;
      if (this.counterMinutes >= 60) {
        this.counterMinutes = 0;
        this.counterHours++;
        if (this.counterHours >= 25) {
          this.counterHours = 0;
        }
      }
      this.scramblingHours = `${String(this.counterHours).padStart(2, '0')}h ${String(this.counterMinutes).padStart(2, '0')}m`;
      
      // Count percentage (0-100), then reset
      this.counterPercentage++;
      if (this.counterPercentage > 100) {
        this.counterPercentage = 0;
      }
      this.scramblingPercentage = this.counterPercentage;
      
      // Count WTE time (1-12 hours, 0-59 minutes, AM/PM)
      this.counterWteMinutes++;
      if (this.counterWteMinutes >= 60) {
        this.counterWteMinutes = 0;
        this.counterWteHours++;
        if (this.counterWteHours > 12) {
          this.counterWteHours = 1;
          this.counterWteAmPm = (this.counterWteAmPm + 1) % 2; // Toggle AM/PM
        }
      }
      const amPm = this.counterWteAmPm === 0 ? 'AM' : 'PM';
      this.scramblingWte = `${String(this.counterWteHours).padStart(2, '0')}:${String(this.counterWteMinutes).padStart(2, '0')} ${amPm}`;
      
      this.cdr.detectChanges();
    }, 100); // Update every 100ms for consecutive counting effect
  }

  private stopScrambling(): void {
    if (this.scramblingInterval) {
      clearInterval(this.scramblingInterval);
      this.scramblingInterval = null;
    }
  }

  ngOnDestroy(): void {
    this.stopScrambling();
    this.stopRealTimeUpdates();
    this.subscriptions.unsubscribe();
  }
  
  /**
   * Get the last swipe time from the work hours data
   */
  private getLastSwipeTime(data: UnifiedWorkHoursResponse): Date | null {
    if (!data.allSwipes || data.allSwipes.length === 0) {
      return null;
    }
    
    // Get the most recent swipe
    const lastSwipe = data.allSwipes[data.allSwipes.length - 1];
    if (!lastSwipe || !lastSwipe.time) {
      return null;
    }
    
    try {
      return this.parseLocalizedDateString(lastSwipe.time);
    } catch (error) {
      console.error('Error parsing last swipe time:', error);
      return null;
    }
  }
  
  /**
   * Start real-time updates for stats
   */
  private startRealTimeUpdates(): void {
    this.stopRealTimeUpdates(); // Clear any existing interval
    
    // Check if today is in the selected date range
    const today = new Date();
    const selectedDateStr = this.workHoursService.formatDate(this.selectedDate);
    const todayStr = this.workHoursService.formatDate(today);
    
    let isTodayInRange = false;
    
    if (this.selectionMode === 'day') {
      isTodayInRange = selectedDateStr === todayStr;
    } else if (this.selectionMode === 'week' || this.selectionMode === 'month') {
      // For week/month, check if today is within the range
      // The API response should have startDate and endDate, but we can also check enhancedCalculation
      if (this.workHoursData?.enhancedCalculation?.currentDateInRange) {
        isTodayInRange = true;
      } else {
        // Fallback: check if selected date is today (for week/month, this means today is in the range)
        // This is a simple check - in practice, the API should provide currentDateInRange
        isTodayInRange = selectedDateStr === todayStr || 
                        (this.workHoursData?.date && this.workHoursData.date <= todayStr);
      }
    }
    
    if (!isTodayInRange) {
      // Not viewing a period that includes today, no real-time updates needed
      return;
    }
    
    // Only start real-time updates if user is currently working
    if (!this.workHoursData?.sessions.isCurrentlyWorking) {
      return;
    }
    
    // Update immediately
    this.updateRealTimeStats();
    
    // Update every second for smooth real-time updates
    this.realTimeUpdateInterval = setInterval(() => {
      this.updateRealTimeStats();
    }, 1000);
  }
  
  /**
   * Stop real-time updates
   */
  private stopRealTimeUpdates(): void {
    if (this.realTimeUpdateInterval) {
      clearInterval(this.realTimeUpdateInterval);
      this.realTimeUpdateInterval = null;
    }
  }
  
  /**
   * Calculate and update real-time stats
   */
  private updateRealTimeStats(): void {
    if (!this.workHoursData || !this.workHoursStats) {
      return;
    }
    
    // Only update if currently working
    if (!this.workHoursData.sessions.isCurrentlyWorking) {
      // If user stopped working, recalculate one final time and stop updates
      this.stopRealTimeUpdates();
      return;
    }
    
    // Calculate elapsed time since last swipe
    let elapsedHours = 0;
    if (this.baseLastSwipeTime) {
      const now = new Date();
      const elapsedMs = now.getTime() - this.baseLastSwipeTime.getTime();
      elapsedHours = elapsedMs / (1000 * 60 * 60); // Convert to hours
    }
    
    // Calculate current actual hours (base + elapsed)
    const currentActualHours = this.baseActualHours + elapsedHours;
    
    // Get required hours
    const requiredHours = this.workHoursStats.actualRequiredHours;
    
    // Recalculate shortfall and excess
    const shortfallHours = Math.max(0, requiredHours - currentActualHours);
    const excessHours = Math.max(0, currentActualHours - requiredHours);
    
    // Recalculate completion status
    const isComplete = currentActualHours >= requiredHours;
    const completionPercentage = requiredHours > 0 
      ? Math.min(100, (currentActualHours / requiredHours) * 100) 
      : 100;
    
    // Calculate WTE (When To Exit) - achievement time
    let achievementTime: string | null = null;
    if (!isComplete && this.baseLastSwipeTime) {
      const hoursRemaining = requiredHours - currentActualHours;
      if (hoursRemaining > 0) {
        const now = new Date();
        const achievementDate = new Date(now.getTime() + (hoursRemaining * 60 * 60 * 1000));
        // Format as ISO string for consistency with API format
        achievementTime = achievementDate.toISOString();
      }
    }
    
    // Update stats
    this.workHoursStats = {
      actualHours: currentActualHours,
      actualRequiredHours: requiredHours,
      shortfallHours,
      excessHours,
      isComplete,
      completionPercentage
    };
    
    // Update enhanced calculation achievement time if it exists
    if (this.workHoursData.enhancedCalculation) {
      this.workHoursData.enhancedCalculation.achievementTime = achievementTime;
    }
    
    // Trigger change detection
    this.cdr.detectChanges();
  }

  // Graph properties
  graphWidth: number = 800;
  graphHeight: number = 200;
  timeHours: number[] = [];
  hourScale: number[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

  get rawSwipes(): SwipeData[] | null {
    return this.workHoursData?.allSwipes || null;
  }

  get swipeData(): any | null {
    return this.workHoursData?.sessions || null;
  }

  getSessionLine(session: any): { inX: number; outX: number } | null {
    if (!this.rawSwipes || !session || !session.inSwipe || !session.outSwipe) return null;
    
    try {
      // Parse session times - they might be in different formats
      let inDate: Date;
      let outDate: Date;
      
      // Try parsing as localized string first
      try {
        inDate = this.parseLocalizedDateString(session.inSwipe);
        outDate = this.parseLocalizedDateString(session.outSwipe);
      } catch {
        // Fallback to Date constructor
        inDate = new Date(session.inSwipe);
        outDate = new Date(session.outSwipe);
      }
      
      // Get the time range from processed swipes
      const processed = this.processedSwipes;
      if (processed.length === 0) return null;
      
      // Find min/max times from processed swipes
      const times = processed.map(p => p.date.getTime());
      const minTime = Math.min(...times);
      const maxTime = Math.max(...times);
      const timeRange = maxTime - minTime;
      
      if (timeRange <= 0) return null;
      
      const inOffset = inDate.getTime() - minTime;
      const outOffset = outDate.getTime() - minTime;
      
      const inX = (inOffset / timeRange) * this.graphWidth;
      const outX = (outOffset / timeRange) * this.graphWidth;
      
      return {
        inX: Math.max(0, Math.min(this.graphWidth, inX)),
        outX: Math.max(0, Math.min(this.graphWidth, outX))
      };
    } catch (error) {
      return null;
    }
  }

  get barGraphData(): Array<{ 
    inTime: Date; 
    outTime: Date; 
    inX: number; 
    outX: number; 
    barY: number;
    barHeight: number;
    hours: number; 
    inFormatted: string; 
    outFormatted: string; 
    duration: string;
    sessionNumber: number;
    interval?: string;
    intervalX?: number;
    barWidth: number;
  }> {
    if (!this.swipeData?.swipePairs || this.swipeData.swipePairs.length === 0) {
      this.timeHours = [];
      return [];
    }

    // Parse all session times
    const sessions: Array<{ inTime: Date; outTime: Date; hours: number; inFormatted: string; outFormatted: string; duration: string }> = [];
    
    this.swipeData.swipePairs.forEach((session: any, index: number) => {
      try {
        let inDate: Date;
        let outDate: Date;
        
        try {
          inDate = this.parseLocalizedDateString(session.inSwipe);
          outDate = this.parseLocalizedDateString(session.outSwipe);
        } catch {
          inDate = new Date(session.inSwipe);
          outDate = new Date(session.outSwipe);
        }
        
        const durationMs = outDate.getTime() - inDate.getTime();
        const hours = durationMs / (1000 * 60 * 60);
        const hoursWhole = Math.floor(hours);
        const minutes = Math.floor((hours - hoursWhole) * 60);
        const duration = `${hoursWhole}h ${minutes}m`;
        
        sessions.push({
          inTime: inDate,
          outTime: outDate,
          hours,
          inFormatted: this.formatRawSwipeTime(session.inSwipe),
          outFormatted: this.formatRawSwipeTime(session.outSwipe),
          duration
        });
      } catch (error) {
        console.error('Error parsing session:', error);
      }
    });

    if (sessions.length === 0) {
      this.timeHours = [];
      return [];
    }

    // Find time range
    const allTimes = sessions.flatMap(s => [s.inTime.getTime(), s.outTime.getTime()]);
    const minTime = Math.min(...allTimes);
    const maxTime = Math.max(...allTimes);
    
    const minDate = new Date(minTime);
    const maxDate = new Date(maxTime);
    
    // Set time range to cover the day (6 AM to 10 PM by default, or actual range with padding)
    const minHour = minDate.getHours();
    const maxHour = maxDate.getHours();
    const startHour = Math.max(0, Math.min(6, minHour - 1));
    const endHour = Math.min(23, Math.max(22, maxHour + 2));
    
    const startTime = new Date(minDate);
    startTime.setHours(startHour, 0, 0, 0);
    const endTime = new Date(maxDate);
    endTime.setHours(endHour, 0, 0, 0);
    
    const timeRange = endTime.getTime() - startTime.getTime();
    
    if (timeRange <= 0) {
      this.timeHours = [];
      return [];
    }

    // Generate time hours for grid
    this.timeHours = [];
    for (let hour = startHour; hour <= endHour; hour++) {
      this.timeHours.push(hour);
    }

    // Find max hours for Y-axis scale
    const maxHours = Math.max(...sessions.map(s => s.hours), 0);
    const maxHoursRounded = Math.ceil(maxHours) + 1;
    this.hourScale = [];
    for (let h = 0; h <= maxHoursRounded; h++) {
      this.hourScale.push(h);
    }

    // Create bar data with intervals
    const barData: Array<{ 
      inTime: Date; 
      outTime: Date; 
      inX: number; 
      outX: number; 
      barY: number;
      barHeight: number;
      hours: number; 
      inFormatted: string; 
      outFormatted: string; 
      duration: string;
      sessionNumber: number;
      interval?: string;
      intervalX?: number;
      barWidth: number;
    }> = [];

    // Sort sessions by time
    const sortedSessions = [...sessions].sort((a, b) => a.inTime.getTime() - b.inTime.getTime());
    
    sortedSessions.forEach((session, index) => {
      const inOffset = session.inTime.getTime() - startTime.getTime();
      const outOffset = session.outTime.getTime() - startTime.getTime();
      
      const inX = (inOffset / timeRange) * this.graphWidth;
      const outX = (outOffset / timeRange) * this.graphWidth;
      const barWidth = outX - inX;
      
      // Bar height based on hours worked
      const barY = this.getHoursPosition(session.hours);
      const barHeight = this.getHoursPosition(0) - barY;
      
      // Calculate interval from previous session
      let interval: string | undefined;
      let intervalX: number | undefined;
      if (index > 0) {
        const prevSession = sortedSessions[index - 1];
        const intervalMs = session.inTime.getTime() - prevSession.outTime.getTime();
        if (intervalMs > 0) {
          const intervalMinutes = Math.floor(intervalMs / 60000);
          const intervalHours = Math.floor(intervalMinutes / 60);
          const remainingMinutes = intervalMinutes % 60;
          
          if (intervalHours > 0) {
            interval = `${intervalHours}h ${remainingMinutes}m`;
          } else {
            interval = `${intervalMinutes}m`;
          }
          
          // Position interval label between sessions
          const prevOutX = (prevSession.outTime.getTime() - startTime.getTime()) / timeRange * this.graphWidth;
          intervalX = (prevOutX + inX) / 2;
        }
      }
      
      barData.push({
        inTime: session.inTime,
        outTime: session.outTime,
        inX: Math.max(0, Math.min(this.graphWidth, inX)),
        outX: Math.max(0, Math.min(this.graphWidth, outX)),
        barY,
        barHeight,
        hours: session.hours,
        inFormatted: session.inFormatted,
        outFormatted: session.outFormatted,
        duration: session.duration,
        sessionNumber: index + 1,
        interval,
        intervalX: intervalX ? Math.max(0, Math.min(this.graphWidth, intervalX)) : undefined,
        barWidth: Math.max(0, barWidth)
      });
    });

    return barData;
  }

  getTotalHours(): string {
    if (!this.barGraphData || this.barGraphData.length === 0) return '0h 0m';
    const total = this.barGraphData.reduce((sum, bar) => sum + bar.hours, 0);
    const hours = Math.floor(total);
    const minutes = Math.floor((total - hours) * 60);
    return `${hours}h ${minutes}m`;
  }

  get processedSwipes(): Array<{ x: number; y: number; indicator: number; time: string; date: Date; formattedTime: string; interval?: string; sessionHours?: string }> {
    if (!this.rawSwipes || this.rawSwipes.length === 0) {
      this.timeHours = [];
      return [];
    }

    // Parse all swipe times and find min/max
    const swipeTimes: Date[] = [];
    const parsedSwipes: Array<{ swipe: SwipeData; date: Date }> = [];
    
    this.rawSwipes.forEach(swipe => {
      try {
        const date = this.parseLocalizedDateString(swipe.time);
        swipeTimes.push(date);
        parsedSwipes.push({ swipe, date });
      } catch (error) {
        console.error('Error parsing swipe time:', error);
      }
    });

    if (swipeTimes.length === 0) {
      this.timeHours = [];
      return [];
    }

    const minTime = new Date(Math.min(...swipeTimes.map(d => d.getTime())));
    const maxTime = new Date(Math.max(...swipeTimes.map(d => d.getTime())));
    
    // Set time range to cover the day (6 AM to 10 PM by default, or actual range with padding)
    const minHour = minTime.getHours();
    const maxHour = maxTime.getHours();
    const startHour = Math.max(0, Math.min(6, minHour - 1));
    const endHour = Math.min(23, Math.max(22, maxHour + 2));
    
    const startTime = new Date(minTime);
    startTime.setHours(startHour, 0, 0, 0);
    const endTime = new Date(maxTime);
    endTime.setHours(endHour, 0, 0, 0);
    
    const timeRange = endTime.getTime() - startTime.getTime();
    
    if (timeRange <= 0) {
      this.timeHours = [];
      return [];
    }

    // Generate time hours for grid
    this.timeHours = [];
    for (let hour = startHour; hour <= endHour; hour++) {
      this.timeHours.push(hour);
    }

    // Process swipes to get x/y coordinates with additional info
    return parsedSwipes.map((item, index) => {
      try {
        const swipeDate = item.date;
        const timeOffset = swipeDate.getTime() - startTime.getTime();
        const x = (timeOffset / timeRange) * this.graphWidth;
        const y = item.swipe.indicator === 1 ? 20 : this.graphHeight - 20; // IN at top, OUT at bottom
        
        // Format time for display (extract time part)
        const formattedTime = this.formatRawSwipeTime(item.swipe.time);
        
        // Calculate interval from previous swipe
        let interval: string | undefined;
        if (index > 0) {
          const prevSwipe = parsedSwipes[index - 1];
          const intervalMs = swipeDate.getTime() - prevSwipe.date.getTime();
          const intervalMinutes = Math.floor(intervalMs / 60000);
          const intervalHours = Math.floor(intervalMinutes / 60);
          const remainingMinutes = intervalMinutes % 60;
          
          if (intervalHours > 0) {
            interval = `${intervalHours}h ${remainingMinutes}m`;
          } else {
            interval = `${intervalMinutes}m`;
          }
        }
        
        // Calculate session hours if this is an OUT swipe
        let sessionHours: string | undefined;
        if (item.swipe.indicator === 0 && index > 0) {
          // Find the previous IN swipe
          for (let i = index - 1; i >= 0; i--) {
            if (parsedSwipes[i].swipe.indicator === 1) {
              const inTime = parsedSwipes[i].date;
              const outTime = swipeDate;
              const sessionMs = outTime.getTime() - inTime.getTime();
              const sessionMinutes = Math.floor(sessionMs / 60000);
              const sessionHoursNum = Math.floor(sessionMinutes / 60);
              const sessionMins = sessionMinutes % 60;
              sessionHours = `${sessionHoursNum}h ${sessionMins}m`;
              break;
            }
          }
        }
        
        return {
          x: Math.max(0, Math.min(this.graphWidth, x)),
          y,
          indicator: item.swipe.indicator,
          time: item.swipe.time,
          date: swipeDate,
          formattedTime,
          interval,
          sessionHours
        };
      } catch (error) {
        return null;
      }
    }).filter(swipe => swipe !== null) as Array<{ x: number; y: number; indicator: number; time: string; date: Date; formattedTime: string; interval?: string; sessionHours?: string }>;
  }

  formatRawSwipeTime(timeString: string): string {
    try {
      // Extract time portion from IST localized format: "28/8/2025, 8:58:07 am" -> "8:58 AM"
      const timePart = timeString.split(', ')[1]; // Get "8:58:07 am"
      if (timePart) {
        // Remove seconds and format: "8:58:07 am" -> "8:58 AM"
        return timePart.replace(/:\d{2}(\s*(am|pm))/i, '$1').toUpperCase();
      }
      return timeString;
    } catch (error) {
      return timeString;
    }
  }

  getHourPosition(hour: number): number {
    if (this.timeHours.length === 0) return 0;
    const startHour = this.timeHours[0];
    const endHour = this.timeHours[this.timeHours.length - 1];
    const hourRange = endHour - startHour;
    if (hourRange === 0) return this.graphWidth / 2;
    const position = ((hour - startHour) / hourRange) * this.graphWidth;
    return Math.max(0, Math.min(this.graphWidth, position));
  }

  getHoursPosition(hours: number): number {
    if (this.hourScale.length === 0) return this.graphHeight;
    const maxHours = this.hourScale[this.hourScale.length - 1];
    if (maxHours === 0) return this.graphHeight;
    // Y-axis is inverted (0 at bottom, max at top)
    const position = (hours / maxHours) * this.graphHeight;
    return Math.max(0, Math.min(this.graphHeight, this.graphHeight - position));
  }

  formatHourLabel(hour: number): string {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}${period}`;
  }

  getInMarkerPoints(x: number, y: number): string {
    const size = 8;
    return `${x},${y} ${x - size},${y + size} ${x + size},${y + size}`;
  }

  getOutMarkerPoints(x: number, y: number): string {
    const size = 8;
    return `${x},${y} ${x - size},${y - size} ${x + size},${y - size}`;
  }

  private parseLocalizedDateString(dateString: string): Date {
    // Handle format like "3/9/2025, 9:12:01 am"
    // Split date and time parts
    const [datePart, timePart] = dateString.split(', ');
    
    // Parse date part (d/m/yyyy)
    const [day, month, year] = datePart.split('/').map(Number);
    
    // Parse time part (h:mm:ss am/pm)
    const timeMatch = timePart.match(/(\d+):(\d+):(\d+)\s*(am|pm)/i);
    if (!timeMatch) {
      throw new Error('Invalid time format');
    }
    
    let [, hours, minutes, seconds, ampm] = timeMatch;
    let hour = parseInt(hours);
    
    // Convert to 24-hour format
    if (ampm.toLowerCase() === 'pm' && hour !== 12) {
      hour += 12;
    } else if (ampm.toLowerCase() === 'am' && hour === 12) {
      hour = 0;
    }
    
    return new Date(year, month - 1, day, hour, parseInt(minutes), parseInt(seconds));
  }
}
