export interface SwipeData {
  time: string;
  type: 'IN' | 'OUT';
  indicator: 0 | 1;
}

export interface SwipePair {
  inSwipe: string;
  outSwipe: string;
  actualHours: number;
  duration: string;
  outDuration?: string; // Duration of time out of office (between sessions)
}


export interface WorkHoursStats {
  actualHours: number;
  actualRequiredHours: number;
  shortfallHours: number;
  excessHours: number;
  isComplete: boolean;
  completionPercentage: number;
}

export interface UnifiedWorkHoursResponse {
  success: boolean;
  date: string;
  
  // Raw data
  totalSwipes: number;
  allSwipes: SwipeData[];
  
  // Sessions data
  sessions: {
    totalActualHours: number;
    formattedTime: string;
    isCurrentlyWorking: boolean;
    swipePairs: SwipePair[];
  };
  
  // Calculated statistics
  stats: {
    actualHours: number;
    requiredHours: number;
    shortfallHours: number;
    excessHours: number;
    isComplete: boolean;
    completionPercentage: number;
    statusMode: 'excess' | 'complete' | 'incomplete';
  };
  
  // UI display data
  display: {
    activeHours: string;
    requiredHours: string;
    actualRequiredHours: string;
    excessTime: string | null;
    shortfallTime: string | null;
    progressPercentage: number;
    statusMessage: string;
    statusClass: string;
  };
  
  // Additional metadata
  metadata: {
    currentTime: string;
    lastUpdated: string;
    timezone: string;
  };
  
  // Employee information
  employee: {
    employeeId: number;
    employeeName: string;
    employeeNumber: string;
  };

  // Enhanced calculation data
  enhancedCalculation?: {
    currentDateInRange: boolean;
    yesterdayDateInRange: boolean;
    isBefore1030AM: boolean;
    achievementTime: string | null;
    additionalSources: {
      currentActualHours: number;
      yesterdayActualHours: number;
    };
  };
}
