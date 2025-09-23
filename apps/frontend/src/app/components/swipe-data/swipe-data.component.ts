import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { MatButtonToggleChange } from '@angular/material/button-toggle';
import { Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { WorkHoursService } from '../../services/work-hours.service';
import { AuthService } from '../../services/auth.service';
import { SwipeData, SwipePair, UnifiedWorkHoursResponse } from '../../models/work-hours.model';

export type TimePeriod = 'day' | 'week' | 'month';

@Component({
  selector: 'app-swipe-data',
  templateUrl: './swipe-data.component.html',
  styleUrls: ['./swipe-data.component.scss']
})
export class SwipeDataComponent implements OnInit, OnChanges {
  @Input() selectedDate!: Date;
  @Input() selectionMode: TimePeriod = 'day';
  @Output() selectionModeChanged = new EventEmitter<TimePeriod>();
  
  unifiedData: UnifiedWorkHoursResponse | null = null;
  selectedTimePeriod: TimePeriod = 'day';
  error$: Observable<string | null>;
  
  constructor(
    private workHoursService: WorkHoursService,
    private authService: AuthService
  ) {
    // Combine error streams from both services
    this.error$ = combineLatest([
      this.workHoursService.error$,
      this.authService.error$
    ]).pipe(
      map(([workHoursError, authError]) => workHoursError || authError)
    );
  }

  ngOnInit() {
    this.loadSwipeData();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['selectedDate'] && !changes['selectedDate'].firstChange) {
      this.loadSwipeData();
    }
    
    if (changes['selectionMode'] && !changes['selectionMode'].firstChange) {
      this.selectedTimePeriod = this.selectionMode;
      this.loadSwipeData();
    }
  }

  private loadSwipeData() {
    // Delegate to the appropriate period-specific method
    switch (this.selectedTimePeriod) {
      case 'day':
        this.loadDailyData();
        break;
      case 'week':
        this.loadWeeklyData();
        break;
      case 'month':
        this.loadMonthlyData();
        break;
      default:
        this.loadDailyData();
        break;
    }
  }

  private loadDailyData(): void {
    const dateString = this.workHoursService.formatDate(this.selectedDate);
    
    this.workHoursService.getWorkLogs(dateString, 'day').subscribe({
      next: (data) => {
        this.unifiedData = data;
      },
      error: (error) => {
        console.error('Error loading daily work hours:', error);
        this.unifiedData = null;
      }
    });
  }

  getSwipeTypeClass(swipe: SwipeData): string {
    return swipe.type === 'IN' ? 'swipe-in' : 'swipe-out';
  }

  getSwipeTypeIcon(swipe: SwipeData): string {
    return swipe.type === 'IN' ? 'login' : 'logout';
  }


  formatSessionTime(timeString: string): string {
    try {
      // Extract time portion from IST localized format: "28/8/2025, 8:58:07 am" -> "8:58 am"
      const timePart = timeString.split(', ')[1]; // Get "8:58:07 am"
      if (timePart) {
        // Remove seconds and return time in 12-hour format: "8:58:07 am" -> "8:58 am"
        return timePart.replace(/:\d{2}(\s*(am|pm))/i, '$1');
      }
      return timeString;
    } catch (error) {
      return timeString; // Fallback to original string
    }
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


  formatHours(hours: number): string {
    return this.workHoursService.formatHours(hours);
  }

  onRefresh() {
    // Clear errors before retry
    this.workHoursService.clearError();
    this.authService.clearError();
    
    // Clear cache for the current date and period to force fresh data
    const dateString = this.workHoursService.formatDate(this.selectedDate);
    this.workHoursService.clearDateCache(dateString, this.selectedTimePeriod);
    this.loadSwipeData();
  }

  clearErrors(): void {
    this.workHoursService.clearError();
    this.authService.clearError();
  }

  // Cyberpunk UI Methods
  getSessionClass(session: SwipePair): string {
    // Check if session is currently active (no out swipe or out swipe is in the future)
    try {
      const now = new Date();
      const outTime = this.parseLocalizedDateString(session.outSwipe);
      
      if (outTime > now) {
        return 'active';
      }
      
      return '';
    } catch (error) {
      return ''; // Default to inactive if parsing fails
    }
  }

  getRawSwipeClass(swipe: SwipeData): string {
    return swipe.indicator === 1 ? 'in-entry' : 'out-entry';
  }

  formatRawSwipeTime(timeString: string): string {
    try {
      // Extract time portion from IST localized format: "28/8/2025, 8:58:07 am" -> "8:58:07 am"
      const timePart = timeString.split(', ')[1]; // Get "8:58:07 am"
      return timePart || timeString;
    } catch (error) {
      return timeString; // Fallback to original string
    }
  }

  get swipeData(): any | null {
    // Return sessions data from unified response
    const sessions = this.unifiedData?.sessions || null;
    
    // Debug: Log outDuration data
    if (sessions?.swipePairs) {
      console.log('🔍 SwipePairs Debug:', sessions.swipePairs.map((pair: any, index: number) => ({
        index,
        inSwipe: pair.inSwipe,
        outSwipe: pair.outSwipe,
        outDuration: pair.outDuration,
        hasOutDuration: !!pair.outDuration
      })));
    }
    
    return sessions;
  }

  get rawSwipes(): SwipeData[] | null {
    return this.unifiedData?.allSwipes || null;
  }

  onTimePeriodChange(event: MatButtonToggleChange): void {
    const newPeriod = event.value as TimePeriod;
    
    this.selectedTimePeriod = newPeriod;
    this.selectionModeChanged.emit(newPeriod);
    
    // TODO: Implement different data loading logic based on time period
    switch (newPeriod) {
      case 'day':
        this.loadSwipeData(); // Current implementation
        break;
      case 'week':
        // TODO: Implement weekly data loading
        this.loadWeeklyData();
        break;
      case 'month':
        // TODO: Implement monthly data loading
        this.loadMonthlyData();
        break;
    }
  }

  private loadWeeklyData(): void {
    const dateString = this.workHoursService.formatDate(this.selectedDate);
    
    this.workHoursService.getWorkLogs(dateString, 'week').subscribe({
      next: (data) => {
        this.unifiedData = data;
      },
      error: (error) => {
        console.error('Error loading weekly work hours:', error);
        this.unifiedData = null;
      }
    });
  }

  private loadMonthlyData(): void {
    const dateString = this.workHoursService.formatDate(this.selectedDate);
    
    this.workHoursService.getWorkLogs(dateString, 'month').subscribe({
      next: (data) => {
        this.unifiedData = data;
      },
      error: (error) => {
        console.error('Error loading monthly work hours:', error);
        this.unifiedData = null;
      }
    });
  }
}
