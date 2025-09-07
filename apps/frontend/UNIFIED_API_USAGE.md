# Unified Work Hours API Usage Guide

## Overview

The unified API endpoint `/api/hours/unified` provides all work hours data in a single call.

This single endpoint returns all work hours data with pre-calculated values, improving performance and enabling better caching.

## API Endpoint

```
GET /api/hours/unified?date=YYYY-MM-DD
```

## Response Structure

```typescript
{
  success: boolean;
  date: string;
  
  // Raw swipes data
  totalSwipes: number;
  allSwipes: SwipeData[];
  
  // Sessions data (calculated work periods)
  sessions: {
    totalActualHours: number;
    formattedTime: string;
    isCurrentlyWorking: boolean;
    swipePairs: SwipePair[];
  };
  
  // Pre-calculated statistics
  stats: {
    actualHours: number;
    requiredHours: number;
    shortfallHours: number;
    excessHours: number;
    isComplete: boolean;
    completionPercentage: number;
    statusMode: 'excess' | 'complete' | 'incomplete';
  };
  
  // Ready-to-use UI display data
  display: {
    activeHours: string;        // "8h 16m"
    requiredHours: string;      // "8h 0m"
    excessTime: string | null;  // "+0h 16m" or null
    shortfallTime: string | null; // "2h 30m" or null
    progressPercentage: number; // 103
    statusMessage: string;      // "OVERDRIVE MODE: +0h 16m"
    statusClass: string;        // "excess" | "complete" | "incomplete"
  };
  
  // Metadata
  metadata: {
    currentTime: string;
    lastUpdated: string;
    timezone: string;
  };
}
```

## Frontend Service Usage

### Using the New Unified Method

```typescript
// Using the unified API (1 API call with everything pre-calculated)
this.workHoursService.getUnifiedWorkHours(date).subscribe(data => {
  // All data available immediately
  console.log('Active Hours:', data.display.activeHours);
  console.log('Progress:', data.display.progressPercentage + '%');
  console.log('Status:', data.display.statusMessage);
  
  // Use in template
  this.workHoursData = data;
});
```

### Component Example

```typescript
export class WorkHoursComponent implements OnInit {
  workHoursData: UnifiedWorkHoursResponse | null = null;
  loading$ = this.workHoursService.loading$;

  constructor(private workHoursService: WorkHoursService) {}

  ngOnInit() {
    this.loadWorkHours();
  }

  loadWorkHours(date?: string) {
    this.workHoursService.getUnifiedWorkHours(date).subscribe({
      next: (data) => {
        this.workHoursData = data;
      },
      error: (error) => {
        console.error('Failed to load work hours:', error);
      }
    });
  }
}
```

### Template Usage

```html
<div *ngIf="workHoursData" class="work-hours-container">
  <!-- Primary Stats Card -->
  <div class="cp-card primary-stats-compact" 
       [ngClass]="workHoursData.display.statusClass">
    
    <div class="stats-header-compact">
      <div class="status-indicator-compact" 
           [ngClass]="workHoursData.display.statusClass">
        <mat-icon>trending_up</mat-icon>
      </div>
      
      <div class="hours-display-compact">
        <span class="hours-value-compact">
          {{ workHoursData.display.activeHours }}
        </span>
        <span class="hours-label-compact">ACTIVE HOURS</span>
      </div>
      
      <div class="status-message-compact">
        {{ workHoursData.display.statusMessage }}
      </div>
    </div>
    
    <div class="progress-compact">
      <mat-progress-bar 
        mode="determinate" 
        [value]="workHoursData.display.progressPercentage">
      </mat-progress-bar>
      <span class="progress-text-compact">
        {{ workHoursData.display.progressPercentage }}% COMPLETE
      </span>
    </div>
  </div>

  <!-- Stats Grid -->
  <div class="stats-grid-compact">
    <div class="stat-card-compact">
      <mat-icon>schedule</mat-icon>
      <div class="stat-data-compact">
        <span class="stat-label-compact">REQ</span>
        <span class="stat-value-compact">
          {{ workHoursData.display.requiredHours }}
        </span>
      </div>
    </div>
    
    <div class="stat-card-compact success" 
         *ngIf="workHoursData.stats.excessHours > 0">
      <mat-icon>trending_up</mat-icon>
      <div class="stat-data-compact">
        <span class="stat-label-compact">SUR</span>
        <span class="stat-value-compact">
          {{ workHoursData.display.excessTime }}
        </span>
      </div>
    </div>
    
    <div class="stat-card-compact inactive">
      <mat-icon>home</mat-icon>
      <div class="stat-data-compact">
        <span class="stat-label-compact">STS</span>
        <span class="stat-value-compact">
          {{ workHoursData.sessions.isCurrentlyWorking ? 'ON' : 'OFF' }}
        </span>
      </div>
    </div>
  </div>
</div>
```

## Benefits

### Performance Improvements
- **50% fewer API calls**: 1 call instead of 2
- **Reduced frontend calculations**: All stats pre-calculated on backend
- **Better caching**: Single cache entry instead of multiple
- **Faster UI updates**: No need to wait for multiple API responses

### Simplified Code
- **Less complex components**: No need to combine multiple data sources
- **Reduced state management**: Single data object instead of multiple
- **Better error handling**: Single error state instead of multiple
- **Cleaner templates**: Direct access to display-ready values

### Better User Experience
- **Faster loading**: Single API call reduces latency
- **Consistent data**: All calculations done server-side
- **Reduced loading states**: No multiple loading indicators needed
- **Improved caching**: Better cache hit rates

## Benefits

The unified API provides:
- **Single API call** instead of multiple requests  
- **Pre-calculated statistics** (no frontend calculations needed)
- **Formatted display values** ready for UI
- **Better performance** through reduced network overhead
- **Simplified caching** with unified cache strategy

### Usage Example

```typescript
ngOnInit() {
  this.workHoursService.getUnifiedWorkHours(this.selectedDate)
    .subscribe(data => {
      this.workHoursData = data; // Everything ready to use
    });
}
```

### Step 2: Update Template
Use pre-calculated display values:

```html
<!-- Before -->
<span>{{ calculateActiveHours() }}</span>
<span>{{ calculateProgress() }}%</span>

<!-- After -->
<span>{{ workHoursData.display.activeHours }}</span>
<span>{{ workHoursData.display.progressPercentage }}%</span>
```

### Step 3: Remove Manual Calculations
Delete helper methods that calculate stats, as they're now provided by the API.

## Caching

The unified API response is cached for 5 minutes, same as the individual endpoints. The cache key is based on the date parameter.

```typescript
// Clear cache when needed
this.workHoursService.clearCache(); // Clear all
this.workHoursService.clearDateCache('2025-09-06'); // Clear specific date
```
