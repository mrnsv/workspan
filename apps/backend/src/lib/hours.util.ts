import { createRequire } from "module";
const requireModule = createRequire(import.meta.url);

const dayjs: any = requireModule("dayjs");
const utc: any = requireModule("dayjs/plugin/utc");
const tz: any = requireModule("dayjs/plugin/timezone");
const weekday: any = requireModule("dayjs/plugin/weekday");
const weekOfYear: any = requireModule("dayjs/plugin/weekOfYear");
import { Swipe } from "../services/punch.service.js";

// Type for dayjs instance
type DayjsInstance = any;

dayjs.extend(utc);
dayjs.extend(tz);
dayjs.extend(weekday);
dayjs.extend(weekOfYear);

const TZ = "Asia/Kolkata";

export interface SwipePair {
  inSwipe: string;
  outSwipe: string;
  actualHours: number;
}

export function createSwipePairs(
  swipes: Swipe[],
  now: DayjsInstance = dayjs().tz(TZ)
): { swipePairs: SwipePair[], totalActualHours: number } {
  // Handle case where swipes might not be an array
  if (!Array.isArray(swipes)) {
    console.warn('Swipes is not an array:', swipes);
    return { swipePairs: [], totalActualHours: 0 };
  }
  
  // Sort swipes chronologically (earliest first)
  const ordered = [...swipes].sort(
    (a, b) =>
      new Date(a.punchDateTime).getTime() -
      new Date(b.punchDateTime).getTime()
  );

  const swipePairs: SwipePair[] = [];
  let totalExactSeconds = 0;
  let lastIn: DayjsInstance | null = null;

  // Check if first swipe is OUT (missing initial IN)
  if (ordered.length > 0 && ordered[0].inOutIndicator === 0) {
    const firstOut = dayjs.utc(ordered[0].punchDateTime).tz(TZ);
    
    // Find the next IN to estimate when work started
    let nextInIndex = -1;
    for (let i = 1; i < ordered.length; i++) {
      if (ordered[i].inOutIndicator === 1) {
        nextInIndex = i;
        break;
      }
    }
    
    if (nextInIndex > 0) {
      const nextIn = dayjs.utc(ordered[nextInIndex].punchDateTime).tz(TZ);
      // Estimate start time as average of available work sessions or 2 hours before first OUT
      const estimatedStartTime = firstOut.subtract(2, 'hour'); // Assume 2-hour morning session
      
      // Create the missing initial pair using GreytHR method (exact seconds)
      const durationMs = firstOut.valueOf() - estimatedStartTime.valueOf();
      const exactSeconds = Math.floor(durationMs / 1000);
      const sessionHours = exactSeconds / 3600; // Convert seconds to hours for display
      
      swipePairs.push({
        inSwipe: estimatedStartTime.utc().format(),
        outSwipe: firstOut.utc().format(),
        actualHours: parseFloat(sessionHours.toFixed(2))
      });
      totalExactSeconds += exactSeconds;
    }
  }

  for (const swipe of ordered) {
    const time = dayjs.utc(swipe.punchDateTime).tz(TZ);

    if (swipe.inOutIndicator === 1) { // IN
      lastIn = time;
    } else if (swipe.inOutIndicator === 0) { // OUT
      if (lastIn && time.isAfter(lastIn)) {
        // We have a valid IN->OUT pair - use GreytHR method (exact seconds)
        const durationMs = time.valueOf() - lastIn.valueOf();
        const exactSeconds = Math.floor(durationMs / 1000);
        const sessionHours = exactSeconds / 3600; // Convert seconds to hours for display
        
        swipePairs.push({
          inSwipe: lastIn.utc().format(),
          outSwipe: time.utc().format(),
          actualHours: parseFloat(sessionHours.toFixed(2))
        });
        totalExactSeconds += exactSeconds;
        lastIn = null;
      }
      // If lastIn is null, this OUT swipe was already handled above
    }
  }

  // Handle ongoing session (last swipe was IN)
  if (lastIn) {
    // Check if this is a past date or current date
    const lastInDate = lastIn.format('YYYY-MM-DD');
    const currentDate = now.format('YYYY-MM-DD');
    
    let estimatedOutTime: DayjsInstance;
    
    if (lastInDate === currentDate) {
      // Same day - use current time (truly ongoing session)
      estimatedOutTime = now;
    } else {
      // Past date - use same time as inSwipe to avoid massive duration
      estimatedOutTime = lastIn;
    }
    
    const durationMs = estimatedOutTime.valueOf() - lastIn.valueOf();
    const exactSeconds = Math.floor(durationMs / 1000);
    const sessionHours = exactSeconds / 3600; // Convert seconds to hours for display
    
    swipePairs.push({
      inSwipe: lastIn.utc().format(),
      outSwipe: estimatedOutTime.utc().format(),
      actualHours: parseFloat(sessionHours.toFixed(2))
    });
    totalExactSeconds += exactSeconds;
  }

  // GreytHR method: Convert total exact seconds to minutes, then round once
  const totalExactMinutes = totalExactSeconds / 60;
  const totalRoundedMinutes = Math.round(totalExactMinutes);
  const totalActualHours = totalRoundedMinutes / 60;
  
  return {
    swipePairs,
    totalActualHours: parseFloat(totalActualHours.toFixed(2))
  };
}

export interface WorkHoursResult {
  hours: number;
  minutes: number;
  totalMinutes: number;
  formattedTime: string;
}

export interface DailyWorkHours extends WorkHoursResult {
  date: string;
  isCurrentlyWorking: boolean;
  lastPunchIn?: string;
  totalSwipes: number;
  swipePairs: SwipePair[];
  totalActualHours: number;
}

export interface WeeklyWorkHours extends WorkHoursResult {
  weekStart: string;
  weekEnd: string;
  weekNumber: number;
  year: number;
  dailyBreakdown: DailyWorkHours[];
}

export interface MonthlyWorkHours extends WorkHoursResult {
  month: string;
  year: number;
  totalWorkingDays: number;
  weeklyBreakdown: WeeklyWorkHours[];
}

export function calculateWorkMinutes(
  swipes: Swipe[],
  now: DayjsInstance = dayjs().tz(TZ)
): number {
  // Handle case where swipes might not be an array
  if (!Array.isArray(swipes)) {
    console.warn('Swipes is not an array:', swipes);
    return 0;
  }
  
  const ordered = [...swipes].sort(
    (a, b) =>
      new Date(a.punchDateTime).getTime() -
      new Date(b.punchDateTime).getTime()
  );

  let totalMinutes = 0;
  let lastIn: DayjsInstance | null = null;

  // Check if the first swipe is an OUT (meaning work started before tracking)
  if (ordered.length > 0 && ordered[0].inOutIndicator === 0) {
    const firstOut = dayjs.utc(ordered[0].punchDateTime).tz(TZ);
    
    // Calculate average work session length from available complete sessions
    let sessionCount = 0;
    let totalSessionMinutes = 0;
    let tempLastIn: DayjsInstance | null = null;
    
    for (const swipe of ordered) {
      const time = dayjs.utc(swipe.punchDateTime).tz(TZ);
      if (swipe.inOutIndicator === 1) {
        tempLastIn = time;
      } else if (swipe.inOutIndicator === 0 && tempLastIn) {
        const sessionMinutes = time.diff(tempLastIn, "minute");
        totalSessionMinutes += sessionMinutes;
        sessionCount++;
        tempLastIn = null;
      }
    }
    
    if (sessionCount > 0) {
      // For missing initial session, assume it was a longer morning work session
      // Use either the longest session or minimum 90 minutes (typical morning session)
      const avgSessionMinutes = totalSessionMinutes / sessionCount;
      const estimatedMinutes = Math.max(avgSessionMinutes * 3, 90); // At least 90 minutes
      console.log(`Detected missing initial work session. Estimated: ${Math.floor(estimatedMinutes/60)}h ${Math.floor(estimatedMinutes%60)}m (based on session patterns)`);
      totalMinutes += estimatedMinutes;
    } else {
      // Fallback: assume a 2-hour morning session if no complete sessions available
      const estimatedMinutes = 120;
      console.log(`Detected missing initial work session. Using default estimate: ${Math.floor(estimatedMinutes/60)}h ${estimatedMinutes%60}m`);
      totalMinutes += estimatedMinutes;
    }
  }

  for (const swipe of ordered) {
    const time = dayjs.utc(swipe.punchDateTime).tz(TZ);

    if (swipe.inOutIndicator === 1) {
      // IN
      lastIn = time;
    } else if (swipe.inOutIndicator === 0 && lastIn) {
      // OUT
      if (time.isAfter(lastIn)) {
        totalMinutes += time.diff(lastIn, "minute");
      }
      lastIn = null;
    }
  }

  if (lastIn) {
    totalMinutes += now.diff(lastIn, "minute");
  }

  return totalMinutes;
}

export function formatWorkTime(totalMinutes: number): WorkHoursResult {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const formattedTime = `${hours}h ${minutes}m`;
  
  return {
    hours,
    minutes,
    totalMinutes,
    formattedTime
  };
}

export function isCurrentlyWorking(swipes: Swipe[]): { isWorking: boolean; lastPunchIn?: string } {
  // Handle case where swipes might not be an array
  if (!Array.isArray(swipes)) {
    return { isWorking: false };
  }
  
  const ordered = [...swipes].sort(
    (a, b) =>
      new Date(b.punchDateTime).getTime() - // Sort descending (latest first)
      new Date(a.punchDateTime).getTime()
  );

  if (ordered.length === 0) {
    return { isWorking: false };
  }

  const lastSwipe = ordered[0];
  return {
    isWorking: lastSwipe.inOutIndicator === 1, // 1 = IN
    lastPunchIn: lastSwipe.inOutIndicator === 1 ? lastSwipe.punchDateTime : undefined
  };
}

export function calculateDailyWorkHours(swipes: Swipe[], date: string): DailyWorkHours {
  const now = dayjs().tz(TZ);
  const { swipePairs, totalActualHours } = createSwipePairs(swipes, now);
  // Since createSwipePairs now uses Method 1 (sum of rounded minutes), 
  // totalActualHours already represents the correct rounded total
  const totalMinutes = Math.round(totalActualHours * 60);
  const workTime = formatWorkTime(totalMinutes);
  const workingStatus = isCurrentlyWorking(swipes);

  return {
    date,
    ...workTime,
    isCurrentlyWorking: workingStatus.isWorking,
    lastPunchIn: workingStatus.lastPunchIn,
    totalSwipes: swipes.length,
    swipePairs,
    totalActualHours
  };
}

export function getDateRange(startDate: string, endDate: string): string[] {
  const start = dayjs(startDate);
  const end = dayjs(endDate);
  const dates: string[] = [];
  
  let current = start;
  while (current.isSame(end) || current.isBefore(end)) {
    dates.push(current.format('YYYY-MM-DD'));
    current = current.add(1, 'day');
  }
  
  return dates;
}

export function getWeekDateRange(date: string): { start: string; end: string } {
  const d = dayjs(date);
  const start = d.startOf('week').add(1, 'day'); // Monday as start of week
  const end = d.endOf('week').add(1, 'day');     // Sunday as end of week
  
  return {
    start: start.format('YYYY-MM-DD'),
    end: end.format('YYYY-MM-DD')
  };
}

export function calculateRequiredHoursAchievementTime(
  currentHours: number,
  requiredHours: number,
  isCurrentlyWorking: boolean,
  lastPunchIn?: string,
  now: DayjsInstance = dayjs().tz(TZ)
): { willAchieveAt: string | null; hoursRemaining: number; isAchievable: boolean } {
  // If already achieved, return null
  if (currentHours >= requiredHours) {
    return {
      willAchieveAt: null,
      hoursRemaining: 0,
      isAchievable: true
    };
  }

  const hoursRemaining = requiredHours - currentHours;
  
  // If not currently working, cannot calculate achievement time
  if (!isCurrentlyWorking) {
    return {
      willAchieveAt: null,
      hoursRemaining,
      isAchievable: false
    };
  }

  // If currently working but no last punch in time, cannot calculate
  if (!lastPunchIn) {
    return {
      willAchieveAt: null,
      hoursRemaining,
      isAchievable: false
    };
  }

  try {
    // Calculate when the required hours will be achieved
    const lastPunchInTime = dayjs.utc(lastPunchIn).tz(TZ);
    const achievementTime = lastPunchInTime.add(hoursRemaining, 'hour');
    
    // Format the achievement time in IST
    const achievementTimeIST = achievementTime.format('YYYY-MM-DD HH:mm:ss');
    
    return {
      willAchieveAt: achievementTimeIST,
      hoursRemaining,
      isAchievable: true
    };
  } catch (error) {
    console.error('Error calculating achievement time:', error);
    return {
      willAchieveAt: null,
      hoursRemaining,
      isAchievable: false
    };
  }
}

export function getMonthDateRange(date: string): { start: string; end: string } {
  const d = dayjs(date);
  const start = d.startOf('month');
  const end = d.endOf('month');
  
  return {
    start: start.format('YYYY-MM-DD'),
    end: end.format('YYYY-MM-DD')
  };
}
