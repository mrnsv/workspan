import { Component, Input, Output, EventEmitter, OnInit, OnChanges } from '@angular/core';
import moment from 'moment';

export type TimePeriod = 'day' | 'week' | 'month';

interface CalendarDay {
  date: moment.Moment;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  isWeekend: boolean;
  isInSelectedWeek?: boolean;
  isInSelectedMonth?: boolean;
  isFuture: boolean;
}

@Component({
  selector: 'app-calendar',
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.scss']
})
export class CalendarComponent implements OnInit, OnChanges {
  @Input() selectedDate: Date | null = null;
  @Input() selectionMode: TimePeriod = 'day';
  @Output() dateSelected = new EventEmitter<Date>();

  currentMonth: moment.Moment = moment();
  calendarDays: CalendarDay[] = [];
  weekDays = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  today = moment();
  
  ngOnInit() {
    this.generateCalendar();
  }

  ngOnChanges() {
    this.generateCalendar();
  }

  generateCalendar() {
    const startOfMonth = this.currentMonth.clone().startOf('month');
    const endOfMonth = this.currentMonth.clone().endOf('month');
    const daysInMonth = endOfMonth.date();
    
    // Calculate the ideal center position for the current month
    // We want the month to appear centered in the 6-week (42-day) grid
    const totalPositions = 42;
    const startDayOfWeek = startOfMonth.day(); // 0 = Sunday, 1 = Monday, etc.
    
    // Calculate how many days from previous month should show
    // to center the current month in the grid
    const weeksNeeded = Math.ceil((daysInMonth + startDayOfWeek) / 7);
    const extraWeeks = 6 - weeksNeeded;
    const topExtraWeeks = Math.floor(extraWeeks / 2);
    const bottomExtraWeeks = extraWeeks - topExtraWeeks;
    
    // Start date calculation for centered layout
    const calendarStart = startOfMonth.clone()
      .subtract(topExtraWeeks, 'weeks')
      .startOf('week');

    this.calendarDays = [];
    const current = calendarStart.clone();

    // Always generate exactly 6 weeks (42 days) for consistent layout
    for (let i = 0; i < 42; i++) {
      const day: CalendarDay = {
        date: current.clone(),
        isCurrentMonth: current.isSame(this.currentMonth, 'month'),
        isToday: current.isSame(this.today, 'day'),
        isSelected: this.isDateSelected(current),
        isWeekend: current.day() === 0 || current.day() === 6,
        isInSelectedWeek: this.isInSelectedWeek(current),
        isInSelectedMonth: this.isInSelectedMonth(current),
        isFuture: current.isAfter(this.today, 'day')
      };
      
      this.calendarDays.push(day);
      current.add(1, 'day');
    }
  }

  selectDate(day: CalendarDay) {
    // Prevent selection of future dates
    if (day.isFuture) {
      return;
    }
    
    // If clicking on a date from previous/next month, navigate to that month
    if (!day.isCurrentMonth) {
      this.currentMonth = day.date.clone();
      this.generateCalendar();
    }
    
    // Always emit the selected date regardless of which month it's from
    this.dateSelected.emit(day.date.toDate());
  }

  previousMonth() {
    this.currentMonth = this.currentMonth.clone().subtract(1, 'month');
    this.generateCalendar();
  }

  nextMonth() {
    // Prevent navigation to future months
    const nextMonth = this.currentMonth.clone().add(1, 'month');
    if (nextMonth.isAfter(this.today, 'month')) {
      return;
    }
    
    this.currentMonth = nextMonth;
    this.generateCalendar();
  }

  goToToday() {
    this.currentMonth = this.today.clone();
    this.generateCalendar();
    this.dateSelected.emit(this.today.toDate());
  }

  getMonthYear(): string {
    return this.currentMonth.format('MMMM YYYY').toUpperCase();
  }

  // Helper methods for future date restrictions
  isNextMonthDisabled(): boolean {
    const nextMonth = this.currentMonth.clone().add(1, 'month');
    return nextMonth.isAfter(this.today, 'month');
  }

  isDateInFuture(date: moment.Moment): boolean {
    return date.isAfter(this.today, 'day');
  }

  private isDateSelected(date: moment.Moment): boolean {
    if (!this.selectedDate) return false;
    
    const selectedMoment = moment(this.selectedDate);
    
    switch (this.selectionMode) {
      case 'day':
        return date.isSame(selectedMoment, 'day');
      case 'week':
        return this.isInSelectedWeek(date);
      case 'month':
        return this.isInSelectedMonth(date);
      default:
        return false;
    }
  }

  private isInSelectedWeek(date: moment.Moment): boolean {
    if (!this.selectedDate) return false;
    
    const selectedMoment = moment(this.selectedDate);
    const weekStart = selectedMoment.clone().startOf('week'); // Sunday
    const weekEnd = selectedMoment.clone().endOf('week'); // Saturday
    
    return date.isBetween(weekStart, weekEnd, 'day', '[]');
  }

  private isInSelectedMonth(date: moment.Moment): boolean {
    if (!this.selectedDate) return false;
    
    const selectedMoment = moment(this.selectedDate);
    return date.isSame(selectedMoment, 'month');
  }

  getDayClass(day: CalendarDay): string {
    const classes = ['calendar-day'];
    
    if (!day.isCurrentMonth) classes.push('other-month');
    if (day.isToday) classes.push('today');
    if (day.isWeekend) classes.push('weekend');
    if (day.isFuture) classes.push('future');
    
    // Handle different selection modes
    switch (this.selectionMode) {
      case 'day':
        if (day.isSelected) classes.push('selected');
        break;
      case 'week':
        // First apply the week range styling
        if (day.isInSelectedWeek) classes.push('selected-week');
        // Then apply the primary selected styling to the specific selected day
        if (day.isSelected) classes.push('selected');
        break;
      case 'month':
        // First apply the month range styling  
        if (day.isInSelectedMonth) classes.push('selected-month');
        // Then apply the primary selected styling to the specific selected day
        if (day.isSelected) classes.push('selected');
        break;
    }
    
    return classes.join(' ');
  }
}
