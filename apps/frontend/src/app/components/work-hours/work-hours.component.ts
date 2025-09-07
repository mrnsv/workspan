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
  }

  ngOnInit() {
    // Subscribe to work hours stats
    const statsSubscription = this.workHoursService.workHours$.subscribe(stats => {
      console.log('📈 WorkHours stats updated:', stats);
      this.workHoursStats = stats;
      
      // Trigger change detection to ensure UI updates
      this.cdr.detectChanges();
    });
    this.subscriptions.add(statsSubscription);
    
    this.loadWorkHours();
  }

  ngOnChanges(changes: SimpleChanges) {
    // Only reload if selectedDate changes, not selectionMode
    // The swipe-data component will handle the selectionMode changes
    if (changes['selectedDate'] && !changes['selectedDate'].firstChange) {
      console.log(`🔄 Reloading work hours due to date change: ${changes['selectedDate']?.currentValue}`);
      this.loadWorkHours();
    }
    
    // If only selectionMode changed, don't make a new API call
    // The swipe-data component will handle this and update the shared service
    if (changes['selectionMode'] && !changes['selectionMode'].firstChange && !changes['selectedDate']) {
      console.log(`🔄 Selection mode changed to: ${changes['selectionMode']?.currentValue}, but not making API call (handled by swipe-data component)`);
    }
  }

  private loadWorkHours() {
    const dateString = this.workHoursService.formatDate(this.selectedDate);
    
    console.log(`🗓️ Loading work hours for selectedDate: ${this.selectedDate}, formatted: ${dateString}, selectionMode: ${this.selectionMode}`);
    
    // Only clear cache if this is a refresh action, not on normal date changes
    // this.workHoursService.clearDateCache(dateString);
    
    // Use the work logs API that provides all data in one call
    const apiSubscription = this.workHoursService.getWorkLogs(dateString, this.selectionMode).subscribe({
      next: (data) => {
        console.log('🔄 Unified API response received:', data);
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
        console.log('🎯 Component manually updating stats:', stats);
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
    
    if (this.workHoursStats.isComplete) {
      return this.workHoursStats.excessHours > 0 ? 'trending_up' : 'check_circle';
    }
    
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
    // Clear cache only on explicit refresh
    const dateString = this.workHoursService.formatDate(this.selectedDate);
    this.workHoursService.clearDateCache(dateString);
    this.loadWorkHours();
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
    
    if (this.workHoursStats.isComplete) {
      return this.workHoursStats.excessHours > 0 ? 'excess' : 'complete';
    }
    
    return 'warning';
  }

  private getRandomCookieRefreshMessage(): string {
    const messages = [
      'NEURAL MATRIX REFRESH',
      'AUTHENTICATION OVERRIDE',
      'SECURITY PROTOCOL UPDATE',
      'ACCESS TOKEN REGENERATION',
      'IDENTITY VERIFICATION',
      'CREDENTIAL MATRIX SYNC',
      'BIOMETRIC RECALIBRATION',
      'NEURAL LINK REFRESH',
      'QUANTUM ENCRYPTION UPDATE',
      'CYBERSEC HANDSHAKE'
    ];
    
    const randomIndex = Math.floor(Math.random() * messages.length);
    return messages[randomIndex];
  }

  private getRandomDataSyncMessage(): string {
    const messages = [
      'DATA SYNC',
      'NEURAL INTERFACE SYNC',
      'QUANTUM DATA STREAM',
      'MATRIX SYNCHRONIZATION',
      'CYBER GRID UPDATE',
      'NEURAL NET CALIBRATION',
      'DATA STREAM ANALYSIS',
      'SYSTEM DIAGNOSTICS',
      'MEMORY BANK ACCESS',
      'DIGITAL CORTEX SYNC',
      'BIODATA PROCESSING',
      'NEURAL PATHWAY SCAN',
      'CYBER CONSCIOUSNESS',
      'DATA MATRIX LOADING',
      'VIRTUAL REALITY SYNC'
    ];
    
    const randomIndex = Math.floor(Math.random() * messages.length);
    return messages[randomIndex];
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }
}
