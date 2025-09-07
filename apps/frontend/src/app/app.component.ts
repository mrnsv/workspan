import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { WorkHoursService } from './services/work-hours.service';
import { AuthService } from './services/auth.service';
import { TimePeriod } from './components/calendar/calendar.component';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'WORKSPAN NEURAL INTERFACE';
  selectedDate = new Date();
  selectionMode: TimePeriod = 'day';
  dateInputValue = '';
  isDateInputMode = false;
  private timeUpdateInterval: any;
  private employeeSubscription: Subscription = new Subscription();
  
  // Cache values to prevent ExpressionChangedAfterItHasBeenCheckedError
  private cachedWeight: string;
  private cachedCurrency: number;
  
  // Employee data
  employeeData: {employeeId: number, employeeName: string, employeeNumber: string} | null = null;
  
  constructor(
    private workHoursService: WorkHoursService,
    private authService: AuthService,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef
  ) {
    // Initialize cached values once to prevent expression changed errors
    this.initializeCachedValues();
  }

  ngOnInit() {
    try {
      this.initializeDateInput();
      this.testConnection();
      this.startTimeUpdater();
      this.subscribeToEmployeeData();
    } catch (error) {
      console.error('Error during component initialization:', error);
      this.showSnackBar('⚠️ NEURAL INTERFACE INITIALIZATION FAILED', 'error');
    }
  }

  private subscribeToEmployeeData() {
    this.employeeSubscription = this.workHoursService.employee$.subscribe(employee => {
      this.employeeData = employee;
      console.log('👤 Employee data updated:', employee);
    });
  }

  private initializeDateInput() {
    // Initialize date input with current selected date
    this.updateDateInputValue();
  }

  private updateDateInputValue() {
    // Format current selected date to DD/MM/YYYY
    const day = String(this.selectedDate.getDate()).padStart(2, '0');
    const month = String(this.selectedDate.getMonth() + 1).padStart(2, '0');
    const year = this.selectedDate.getFullYear();
    this.dateInputValue = `${day}/${month}/${year}`;
  }

  // Cyberpunk UI Methods - Employee Based
  getEmployeeCode(): string {
    if (!this.employeeData) {
      return '---'; // Loading state
    }
    
    // Extract the numeric part from employee number (e.g., "WI/745" -> "745")
    const empNumber = this.employeeData.employeeNumber;
    const numericPart = empNumber.replace(/\D/g, ''); // Remove non-digits
    return numericPart || '000';
  }

  getEmployeeCodeLabel(): string {
    if (!this.employeeData) {
      return 'ID'; // Loading state
    }
    
    // Extract the prefix from employee number (e.g., "WI/745" -> "WI")
    const empNumber = this.employeeData.employeeNumber;
    const prefix = empNumber.replace(/[0-9\/]/g, ''); // Remove digits and slashes
    return prefix || 'ID';
  }

  getEmployeeRank(): string {
    if (!this.employeeData) {
      return '--'; // Loading state
    }
    
    // Create a cyberpunk rank based on employee name initials
    const name = this.employeeData.employeeName;
    const initials = name.split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase();
    
    return initials;
  }

  getEmployeeRankLabel(): string {
    return 'OPER'; // Operator - fits cyberpunk theme
  }

  private initializeCachedValues(): void {
    // Generate values once to prevent expression changed errors
    const used = Math.floor(Math.random() * 100) + 300;
    const total = 500;
    this.cachedWeight = `${used}/${total}`;
    this.cachedCurrency = Math.floor(Math.random() * 1000) + 500;
  }

  getCurrentWeight(): string {
    // Return cached value to prevent expression changed errors
    return this.cachedWeight;
  }

  getCurrentCurrency(): number {
    // Return cached value to prevent expression changed errors
    return this.cachedCurrency;
  }

  getCurrentTime(): string {
    return new Date().toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit',
      hour12: true 
    });
  }

  getBuildNumber(): string {
    return `v2.${new Date().getFullYear()}.${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  }

  private startTimeUpdater(): void {
    // Update time every second to keep seconds display current
    let updateCounter = 0;
    this.timeUpdateInterval = setInterval(() => {
      // Trigger change detection to update the time display
      this.cdr.detectChanges();
      
      // Update cached stat values every 30 seconds to add some variation
      updateCounter++;
      if (updateCounter >= 30) {
        this.updateCachedValues();
        updateCounter = 0;
      }
    }, 1000);
  }

  private updateCachedValues(): void {
    // Update cached values periodically for some variation
    const used = Math.floor(Math.random() * 100) + 300;
    const total = 500;
    this.cachedWeight = `${used}/${total}`;
    this.cachedCurrency = Math.floor(Math.random() * 1000) + 500;
  }

  // Auth status methods for compact header
  getAuthStatusClass(): string {
    return 'ready'; // Default status
  }

  getAuthStatusText(): string {
    return 'RDY';
  }


  private testConnection() {
    this.authService.testConnection().subscribe({
      next: () => {
        console.log('✅ Neural link established');
        this.showSnackBar('🔗 NEURAL LINK ESTABLISHED', 'success');
      },
      error: (error) => {
        console.error('❌ Neural link failed:', error);
        this.showSnackBar('⚠️ NEURAL LINK COMPROMISED', 'warn');
      }
    });
  }

  onDateChanged(date: Date) {
    this.selectedDate = date;
    this.updateDateInputValue(); // Update input field when date changes from calendar
    
    // Show different toast messages based on selection mode
    const message = this.getDateSelectionMessage(date);
    this.showSnackBar(message, 'info');
  }

  private getDateSelectionMessage(date: Date): string {
    switch (this.selectionMode) {
      case 'day':
        return `📅 TARGET DATE UPDATED: ${this.workHoursService.formatDate(date)}`;
      
      case 'week':
        const weekRange = this.getWeekRange(date);
        return `📅 TARGET WEEK SELECTED: ${weekRange.start} - ${weekRange.end}`;
      
      case 'month':
        const monthName = this.getMonthName(date);
        return `📅 TARGET MONTH SELECTED: ${monthName}`;
      
      default:
        return `📅 TARGET DATE UPDATED: ${this.workHoursService.formatDate(date)}`;
    }
  }

  private getWeekRange(date: Date): { start: string, end: string } {
    // Get Sunday of the week (start of week)
    const sunday = new Date(date);
    const dayOfWeek = sunday.getDay();
    sunday.setDate(sunday.getDate() - dayOfWeek);
    
    // Get Saturday of the week (end of week)
    const saturday = new Date(sunday);
    saturday.setDate(saturday.getDate() + 6);
    
    return {
      start: this.formatDateForDisplay(sunday),
      end: this.formatDateForDisplay(saturday)
    };
  }

  private getMonthName(date: Date): string {
    const monthNames = [
      'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
      'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
    ];
    return monthNames[date.getMonth()];
  }

  private formatDateForDisplay(date: Date): string {
    // Format as DD/MM/YYYY for display
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  onSelectionModeChanged(mode: TimePeriod) {
    console.log('🔄 Selection mode changed to:', mode);
    this.selectionMode = mode;
  }

  enableDateInputMode() {
    this.isDateInputMode = true;
    this.updateDateInputValue(); // Ensure input has current date
    
    // Focus on the input field after Angular updates the DOM
    setTimeout(() => {
      const inputElement = document.querySelector('.date-input') as HTMLInputElement;
      if (inputElement) {
        inputElement.focus();
        inputElement.select(); // Select all text for easy replacement
      }
    }, 0);
  }

  cancelDateInputMode() {
    this.isDateInputMode = false;
    this.updateDateInputValue(); // Reset to current date
  }

  onDateInputSubmit() {
    const parsedDate = this.parseDateInput(this.dateInputValue);
    if (parsedDate) {
      this.selectedDate = parsedDate;
      this.isDateInputMode = false; // Return to heading mode
      this.showSnackBar(`📅 TARGET DATE SET: ${this.workHoursService.formatDate(parsedDate)}`, 'info');
    } else {
      // Reset to current date if invalid
      this.updateDateInputValue();
      this.showSnackBar('❌ INVALID DATE FORMAT. USE DD/MM/YYYY', 'error');
    }
  }

  onDateInputChange(event: Event) {
    const input = event.target as HTMLInputElement;
    let value = input.value.replace(/\D/g, ''); // Remove non-digits
    
    // Auto-format as user types
    if (value.length >= 3 && value.length <= 4) {
      value = value.substring(0, 2) + '/' + value.substring(2);
    } else if (value.length >= 5) {
      value = value.substring(0, 2) + '/' + value.substring(2, 4) + '/' + value.substring(4, 8);
    }
    
    // Update the input value
    this.dateInputValue = value;
  }

  private parseDateInput(dateStr: string): Date | null {
    // Parse DD/MM/YYYY format
    const trimmed = dateStr.trim();
    
    // Check if format matches DD/MM/YYYY pattern
    const datePattern = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
    const match = trimmed.match(datePattern);
    
    if (!match) {
      return null;
    }
    
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const year = parseInt(match[3], 10);
    
    // Validate ranges
    if (month < 1 || month > 12) {
      return null;
    }
    
    if (day < 1 || day > 31) {
      return null;
    }
    
    // Create date (month is 0-indexed in JavaScript)
    const parsedDate = new Date(year, month - 1, day);
    
    // Check if the date is valid (handles invalid dates like 31/02/2023)
    if (parsedDate.getDate() !== day || 
        parsedDate.getMonth() !== month - 1 || 
        parsedDate.getFullYear() !== year) {
      return null;
    }
    
    return parsedDate;
  }

  onCookieRefreshed() {
    console.log('🔄 Cookie refreshed - initiating smooth data reload');
    
    // Show immediate feedback
    this.showSnackBar('🔄 AUTHENTICATION MATRIX REFRESHED - RELOADING DATA...', 'info');
    
    // Clear cache to force fresh data on next component calls (preserves existing data)
    this.workHoursService.clearCache();
    
    // Trigger data reload by updating the selected date (this will cause components to refresh)
    const currentDate = this.selectedDate;
    this.selectedDate = new Date(currentDate.getTime()); // Create new date object to trigger change detection
    
    // Force refresh data for the current date and selection mode
    // Reduced delay for faster response
    setTimeout(() => {
      const dateString = this.workHoursService.formatDate(this.selectedDate);
      this.workHoursService.forceRefresh(dateString, this.selectionMode).subscribe({
        next: (data) => {
          console.log('🔄 Data reloaded after cookie refresh:', data);
          this.showSnackBar('✅ DATA REFRESHED WITH NEW AUTHENTICATION', 'success');
        },
        error: (error) => {
          console.error('❌ Failed to reload data after cookie refresh:', error);
          this.showSnackBar('⚠️ DATA REFRESH FAILED - TRY MANUAL REFRESH', 'warn');
        }
      });
    }, 100); // Reduced delay for smoother experience
  }

  private showSnackBar(message: string, type: 'success' | 'error' | 'warn' | 'info') {
    const config = {
      duration: 4000,
      panelClass: [`snackbar-${type}`, 'cyberpunk-snackbar'],
      horizontalPosition: 'right' as const,
      verticalPosition: 'bottom' as const
    };
    this.snackBar.open(message, 'X', config);
  }

  ngOnDestroy(): void {
    // Clean up the time update interval
    if (this.timeUpdateInterval) {
      clearInterval(this.timeUpdateInterval);
    }
    
    // Clean up employee subscription
    if (this.employeeSubscription) {
      this.employeeSubscription.unsubscribe();
    }
  }
}