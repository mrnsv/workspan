import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { MatButtonToggleChange } from '@angular/material/button-toggle';
import { WorkHoursService } from '../../services/work-hours.service';
import { SwipeData, SwipePair, UnifiedWorkHoursResponse } from '../../models/work-hours.model';

export type TimePeriod = 'day' | 'week' | 'month';

@Component({
  selector: 'app-swipe-data',
  templateUrl: './swipe-data.component.html',
  styleUrls: ['./swipe-data.component.scss']
})
export class SwipeDataComponent implements OnInit, OnChanges {
  @Input() selectedDate!: Date;
  @Output() selectionModeChanged = new EventEmitter<TimePeriod>();
  
  unifiedData: UnifiedWorkHoursResponse | null = null;
  selectedTimePeriod: TimePeriod = 'day';
  
  constructor(private workHoursService: WorkHoursService) {
  }

  ngOnInit() {
    this.loadSwipeData();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['selectedDate'] && !changes['selectedDate'].firstChange) {
      this.loadSwipeData();
    }
  }

  private loadSwipeData() {
    const dateString = this.workHoursService.formatDate(this.selectedDate);
    
    // Use the work logs API that provides all data in one call
    this.workHoursService.getWorkLogs(dateString, this.selectedTimePeriod).subscribe({
      next: (data) => {
        this.unifiedData = data;
      },
      error: (error) => {
        console.error('Error loading unified work hours:', error);
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
      console.warn('Error extracting time from string:', timeString, error);
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
    // Clear cache for the current date and period to force fresh data
    const dateString = this.workHoursService.formatDate(this.selectedDate);
    this.workHoursService.clearDateCache(dateString, this.selectedTimePeriod);
    this.loadSwipeData();
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
      console.warn('Error parsing session outSwipe date:', session.outSwipe, error);
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
      console.warn('Error extracting time from string:', timeString, error);
      return timeString; // Fallback to original string
    }
  }

  get swipeData(): any | null {
    // Return sessions data from unified response
    return this.unifiedData?.sessions || null;
  }

  get rawSwipes(): SwipeData[] | null {
    return this.unifiedData?.allSwipes || null;
  }

  onTimePeriodChange(event: MatButtonToggleChange): void {
    const newPeriod = event.value as TimePeriod;
    console.log(`🔄 Time period changed from ${this.selectedTimePeriod} to ${newPeriod}`);
    
    this.selectedTimePeriod = newPeriod;
    this.selectionModeChanged.emit(newPeriod);
    
    // TODO: Implement different data loading logic based on time period
    switch (newPeriod) {
      case 'day':
        console.log('📅 Loading daily data for:', this.selectedDate);
        this.loadSwipeData(); // Current implementation
        break;
      case 'week':
        console.log('📅 Loading weekly data for week containing:', this.selectedDate);
        // TODO: Implement weekly data loading
        this.loadWeeklyData();
        break;
      case 'month':
        console.log('📅 Loading monthly data for month containing:', this.selectedDate);
        // TODO: Implement monthly data loading
        this.loadMonthlyData();
        break;
    }
  }

  private loadWeeklyData(): void {
    const dateString = this.workHoursService.formatDate(this.selectedDate);
    console.log('📅 Loading weekly data for week containing:', this.selectedDate);
    
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
    console.log('📅 Loading monthly data for month containing:', this.selectedDate);
    
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
