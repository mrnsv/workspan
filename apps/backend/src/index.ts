import express from "express";
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { spawn } from "child_process";
import { fetchSwipes } from "./services/punch.service.js";
import { calculateDailyWorkHours } from "./lib/hours.util.js";

// Get current directory in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Log all requests for debugging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

app.use(express.json());

// Root route
app.get("/", (req, res) => {
  res.json({ message: "Workspan Hours Tracker API" });
});


// Get daily work hours summary
app.get("/api/hours/daily", async (req, res) => {
  try {
    const date = req.query.date as string || new Date().toLocaleDateString('en-CA', {
      timeZone: 'Asia/Kolkata'
    });
    
    console.log(`Calculating hours for ${date}`);
    const swipes = await fetchSwipes(date);
    const workHours = calculateDailyWorkHours(swipes, date);
    
    res.json({
      success: true,
      ...workHours
    });
  } catch (error) {
    console.error('Error in daily hours endpoint:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Helper function to refresh cookie by running get-token script
async function refreshCookieForTotalHours(): Promise<string> {
  console.log('🔄 Refreshing expired cookie for total hours API...');
  
  return new Promise((promiseResolve, promiseReject) => {
    // Run the get-token script
    const projectRoot = path.resolve(__dirname, '../../../');
    const getTokenProcess = spawn('npm', ['run', 'get-token'], {
      stdio: 'inherit',
      shell: true,
      cwd: projectRoot
    });

    getTokenProcess.on('close', async (code) => {
      if (code === 0) {
        console.log('✅ Cookie refresh completed successfully for total hours API');
        try {
          // Read the refreshed cookie from cookies.json
          const cookiesData = JSON.parse(await fs.readFile(path.resolve(__dirname, '../../env/cookies.json'), 'utf8'));
          promiseResolve(cookiesData.cookie);
        } catch (error) {
          promiseReject(new Error('Failed to read refreshed cookie'));
        }
      } else {
        promiseReject(new Error(`Cookie refresh failed with code ${code}`));
      }
    });

    getTokenProcess.on('error', (error) => {
      promiseReject(new Error(`Failed to start cookie refresh: ${error.message}`));
    });
  });
}

// Helper function to fetch total hours from GreytHR API
async function fetchTotalHours(startDate: string, endDate: string): Promise<any> {
  const { env } = await import('../../env/env.js');
  let cookiesData = JSON.parse(await fs.readFile(path.resolve(__dirname, '../../env/cookies.json'), 'utf8'));
  
  if (!env.TOTAL_HOURS_URL) {
    throw new Error('TOTAL_HOURS_URL not configured in environment');
  }
  
  const url = env.TOTAL_HOURS_URL.replace('{employeeId}', cookiesData.employeeId.toString());
  const params = new URLSearchParams({
    startDate,
    endDate
  });
  
  console.log(`Fetching total hours from: ${url}?${params}`);
  
  try {
    const response = await fetch(`${url}?${params}`, {
      headers: {
        'Cookie': cookiesData.cookie,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch total hours: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
    
  } catch (error: any) {
    // If GreytHR API call fails (any HTTP error or network issue), try to refresh the cookie
    console.log(`🔐 Total hours API call failed (${error.message}), attempting to refresh cookie...`);
    
    try {
      // Refresh the cookie
      const newCookie = await refreshCookieForTotalHours();
      
      // Retry the request with the new cookie
      console.log('🔄 Retrying total hours request with refreshed cookie...');
      const retryResponse = await fetch(`${url}?${params}`, {
        headers: {
          'Cookie': newCookie,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      if (!retryResponse.ok) {
        throw new Error(`Retry failed: ${retryResponse.status} ${retryResponse.statusText}`);
      }
      
      console.log('✅ Total hours request successful after cookie refresh');
      return await retryResponse.json();
      
    } catch (refreshError) {
      console.error('❌ Cookie refresh failed for total hours API:', refreshError);
      throw new Error(`Total hours API call failed (${error.message}) and cookie refresh unsuccessful`);
    }
  }
}

async function fetchInsights(startDate: string, endDate: string): Promise<any> {
  const { env } = await import('../../env/env.js');
  let cookiesData = JSON.parse(await fs.readFile(path.resolve(__dirname, '../../env/cookies.json'), 'utf8'));
  
  if (!env.INSIGHTS_URL) {
    throw new Error('INSIGHTS_URL not configured in environment');
  }
  
  const url = env.INSIGHTS_URL.replace('{employeeId}', cookiesData.employeeId.toString());
  const params = new URLSearchParams({
    startDate,
    endDate,
    shiftType: 'regular_shift'
  });
  
  console.log(`Fetching insights from: ${url}?${params}`);
  
  try {
    const response = await fetch(`${url}?${params}`, {
      headers: {
        'Cookie': cookiesData.cookie,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch insights: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
    
  } catch (error: any) {
    // If GreytHR API call fails (any HTTP error or network issue), try to refresh the cookie
    console.log(`🔐 Insights API call failed (${error.message}), attempting to refresh cookie...`);
    
    try {
      // Refresh the cookie
      const newCookie = await refreshCookieForTotalHours();
      
      // Retry the request with the new cookie
      console.log('🔄 Retrying insights request with refreshed cookie...');
      const retryResponse = await fetch(`${url}?${params}`, {
        headers: {
          'Cookie': newCookie,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      if (!retryResponse.ok) {
        throw new Error(`Retry failed: ${retryResponse.status} ${retryResponse.statusText}`);
      }
      
      console.log('✅ Insights request successful after cookie refresh');
      return await retryResponse.json();
      
    } catch (refreshError) {
      console.error('❌ Cookie refresh failed for insights API:', refreshError);
      throw new Error(`Insights API call failed (${error.message}) and cookie refresh unsuccessful`);
    }
  }
}

// Helper function to get week start (Sunday) and end (Saturday) dates
function getWeekDates(date: Date): { startDate: string, endDate: string } {
  const d = new Date(date);
  const day = d.getUTCDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  
  // Calculate start of week (Sunday) using UTC
  const startDate = new Date(d);
  startDate.setUTCDate(d.getUTCDate() - day);
  
  // Calculate end of week (Saturday) using UTC
  const endDate = new Date(d);
  endDate.setUTCDate(d.getUTCDate() + (6 - day));
  
  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0]
  };
}

// Helper function to get month start and end dates
function getMonthDates(date: Date): { startDate: string, endDate: string } {
  const d = new Date(date);
  
  // First day of month (using UTC to avoid timezone issues)
  const startDate = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
  
  // Last day of month (using UTC to avoid timezone issues)
  const endDate = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0));
  
  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0]
  };
}

// Helper function to convert minutes to hours:minutes format
function convertMinutesToHoursMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}

// Enhanced calculation to handle GreytHR delay issues
async function calculateEnhancedActualHours(startDate: string, endDate: string, period: string, greyThrActualHours: number) {
  try {
    // Get current date and time in IST
    const nowIST = new Date().toLocaleString('en-CA', { timeZone: 'Asia/Kolkata' });
    const currentDateIST = nowIST.split(' ')[0].replace(',', ''); // YYYY-MM-DD format, remove any comma
    const currentTimeIST = new Date().toLocaleString('en-US', { 
      timeZone: 'Asia/Kolkata', 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    
    // Calculate previous day in IST
    const previousDate = new Date(currentDateIST);
    previousDate.setDate(previousDate.getDate() - 1);
    const previousDateIST = previousDate.toISOString().split('T')[0];
    
    // Check if it's after 10:30 AM IST (when GreytHR updates previous day data)
    const isAfter1030AM = currentTimeIST >= '10:30';
    
    console.log(`🕐 Enhanced calculation - Current: ${currentDateIST} ${currentTimeIST}, Previous: ${previousDateIST}, After 10:30 AM: ${isAfter1030AM}`);
    
    // Analyze date positions within the range
    const dateAnalysis = analyzeDatePositions(startDate, endDate, currentDateIST, previousDateIST);
    
    let enhancedActualHours = greyThrActualHours;
    let additionalHours = 0;
    let calculationDetails = {
      greyThrHours: greyThrActualHours,
      currentDateInRange: dateAnalysis.currentDateInRange,
      previousDateInRange: dateAnalysis.previousDateInRange,
      currentDatePosition: dateAnalysis.currentDatePosition,
      previousDatePosition: dateAnalysis.previousDatePosition,
      isAfter1030AM: isAfter1030AM,
      additionalSources: [] as string[],
      totalAdditionalHours: 0
    };
    
    // Case 1: Current date is within range - always add current day's live hours
    if (dateAnalysis.currentDateInRange) {
      try {
        const currentDaySwipes = await fetchSwipes(currentDateIST);
        const currentDayHours = calculateDailyWorkHours(currentDaySwipes, currentDateIST);
        additionalHours += currentDayHours.totalActualHours;
        calculationDetails.additionalSources.push(`Current day (${currentDateIST}): ${currentDayHours.totalActualHours.toFixed(2)}h`);
        console.log(`📊 Added current day hours: ${currentDayHours.totalActualHours.toFixed(2)}h from ${currentDaySwipes.length} swipes`);
      } catch (error) {
        console.warn(`⚠️ Could not fetch current day swipes: ${error}`);
      }
    }
    
    // Case 2: Previous date is within range AND it's before 10:30 AM IST
    // (GreytHR hasn't updated previous day data yet)
    if (dateAnalysis.previousDateInRange && !isAfter1030AM) {
      try {
        const previousDaySwipes = await fetchSwipes(previousDateIST);
        const previousDayHours = calculateDailyWorkHours(previousDaySwipes, previousDateIST);
        additionalHours += previousDayHours.totalActualHours;
        calculationDetails.additionalSources.push(`Previous day (${previousDateIST}): ${previousDayHours.totalActualHours.toFixed(2)}h - Not yet in GreytHR`);
        console.log(`📊 Added previous day hours (not in GreytHR yet): ${previousDayHours.totalActualHours.toFixed(2)}h from ${previousDaySwipes.length} swipes`);
      } catch (error) {
        console.warn(`⚠️ Could not fetch previous day swipes: ${error}`);
      }
    }
    
    enhancedActualHours = greyThrActualHours + additionalHours;
    calculationDetails.totalAdditionalHours = additionalHours;
    
    // Determine if we should use enhanced calculation
    const useEnhancedCalculation = additionalHours > 0;
    
    const enhancedFormattedTime = convertMinutesToHoursMinutes(Math.round(enhancedActualHours * 60));
    
    console.log(`🎯 Enhanced calculation result: GreytHR: ${greyThrActualHours.toFixed(2)}h + Additional: ${additionalHours.toFixed(2)}h = Enhanced: ${enhancedActualHours.toFixed(2)}h`);
    
    return {
      enhancedActualHours,
      enhancedFormattedTime,
      useEnhancedCalculation,
      calculationDetails
    };
    
  } catch (error) {
    console.error('❌ Error in enhanced calculation:', error);
    // Fallback to original data
    return {
      enhancedActualHours: greyThrActualHours,
      enhancedFormattedTime: convertMinutesToHoursMinutes(Math.round(greyThrActualHours * 60)),
      useEnhancedCalculation: false,
      calculationDetails: {
        error: error instanceof Error ? error.message : 'Unknown error',
        greyThrHours: greyThrActualHours
      }
    };
  }
}

// Analyze positions of current and previous dates within the date range
function analyzeDatePositions(startDate: string, endDate: string, currentDate: string, previousDate: string) {
  // Use string comparison for date ranges (YYYY-MM-DD format)
  const currentDateInRange = currentDate >= startDate && currentDate <= endDate;
  const previousDateInRange = previousDate >= startDate && previousDate <= endDate;
  
  console.log(`📅 Date analysis: startDate=${startDate}, endDate=${endDate}, currentDate=${currentDate}, previousDate=${previousDate}`);
  console.log(`📅 Current in range: ${currentDateInRange}, Previous in range: ${previousDateInRange}`);
  
  // Determine position within range
  let currentDatePosition = 'outside';
  let previousDatePosition = 'outside';
  
  if (currentDateInRange) {
    if (currentDate === startDate && currentDate === endDate) {
      currentDatePosition = 'single'; // Single day range
    } else if (currentDate === startDate) {
      currentDatePosition = 'start';
    } else if (currentDate === endDate) {
      currentDatePosition = 'end';
    } else {
      currentDatePosition = 'middle';
    }
  }
  
  if (previousDateInRange) {
    if (previousDate === startDate && previousDate === endDate) {
      previousDatePosition = 'single'; // Single day range
    } else if (previousDate === startDate) {
      previousDatePosition = 'start';
    } else if (previousDate === endDate) {
      previousDatePosition = 'end';
    } else {
      previousDatePosition = 'middle';
    }
  }
  
  return {
    currentDateInRange,
    previousDateInRange,
    currentDatePosition,
    previousDatePosition
  };
}

// Work logs endpoint (combines sessions + swipes + calculations)
app.get("/api/hours/worklogs", async (req, res) => {
  try {
    // Read employee information from cookies.json
    const cookiesData = JSON.parse(await fs.readFile(path.resolve(__dirname, '../../env/cookies.json'), 'utf8'));
    const employeeInfo = {
      employeeId: cookiesData.employeeId || null,
      employeeName: cookiesData.employeeName || null,
      employeeNumber: cookiesData.employeeNumber || null
    };
    
    const period = req.query.period as string || 'day'; // 'day', 'week', 'month'
    let startDate: string, endDate: string;
    
    if (period === 'day') {
      // For day period, expect startDate parameter (same as date)
      startDate = req.query.startDate as string || new Date().toLocaleDateString('en-CA', {
        timeZone: 'Asia/Kolkata'
      });
      endDate = startDate; // Same as startDate for day period
    } else if (period === 'week') {
      // For week period, expect both startDate and endDate parameters
      startDate = req.query.startDate as string;
      endDate = req.query.endDate as string;
      
      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          error: 'Week period requires both startDate and endDate parameters'
        });
      }
    } else { // month
      // For month period, expect both startDate and endDate parameters
      startDate = req.query.startDate as string;
      endDate = req.query.endDate as string;
      
      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          error: 'Month period requires both startDate and endDate parameters'
        });
      }
    }
    
    console.log(`Fetching work hours for period: ${period}, startDate: ${startDate}, endDate: ${endDate}`);
    
    let actualHours: number;
    let REQUIRED_HOURS: number;
    let allSwipes: any[] = [];
    let sessions: any = {};
    let formattedTime: string;
    
    // Set required hours based on period
    if (period === 'day') {
      REQUIRED_HOURS = 8;
    } else if (period === 'week') {
      REQUIRED_HOURS = 40;
    } else { // month
      REQUIRED_HOURS = 160;
    }
    
    if (period === 'day') {
      // Existing daily logic
      const swipes = await fetchSwipes(startDate);
      const workHours = calculateDailyWorkHours(swipes, startDate);
      
      // Transform swipes data for frontend
      allSwipes = swipes.map(swipe => ({
        time: new Date(swipe.punchDateTime + 'Z').toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
        type: swipe.inOutIndicator === 1 ? 'IN' : 'OUT',
        indicator: swipe.inOutIndicator
      }));
      
      actualHours = workHours.totalActualHours;
      formattedTime = workHours.formattedTime;
      
      sessions = {
        totalActualHours: actualHours,
      formattedTime: workHours.formattedTime,
      isCurrentlyWorking: workHours.isCurrentlyWorking,
      swipePairs: workHours.swipePairs.map(pair => {
        // Calculate precise duration from actual timestamps
        const inTime = new Date(pair.inSwipe);
        const outTime = new Date(pair.outSwipe);
        const durationMs = outTime.getTime() - inTime.getTime();
        const totalSeconds = Math.floor(durationMs / 1000);
        
        // Round to nearest minute (if seconds >= 30, round up)
        const totalMinutes = Math.round(totalSeconds / 60);
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        
        return {
            inSwipe: new Date(pair.inSwipe.endsWith('Z') ? pair.inSwipe : pair.inSwipe + 'Z').toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
            outSwipe: new Date(pair.outSwipe.endsWith('Z') ? pair.outSwipe : pair.outSwipe + 'Z').toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
          actualHours: pair.actualHours,
          duration: `${hours}h ${minutes}m`
        };
      })
      };
    } else {
      // Weekly or Monthly logic - use provided startDate and endDate
      try {
        // Fetch total hours from GreytHR API
        const totalHoursData = await fetchTotalHours(startDate, endDate);
        
        // Convert totalProductionHours from minutes to hours
        const totalProductionMinutes = totalHoursData.totalProductionHours || 0;
        actualHours = totalProductionMinutes / 60;
        formattedTime = convertMinutesToHoursMinutes(totalProductionMinutes);
      } catch (error) {
        console.error(`Error fetching ${period} data:`, error);
        // Fallback to 0 hours for now
        actualHours = 0;
        formattedTime = '0h 0m';
      }
      
      // For weekly/monthly view, we don't show individual swipes
      allSwipes = [];
      sessions = {
        totalActualHours: actualHours,
        formattedTime: formattedTime,
        isCurrentlyWorking: false,
        swipePairs: []
      };
    }

    // Enhanced Real-time Calculation Logic
    // Handle GreytHR delay: current day hours not included until next day 10:30 AM IST
    const enhancedData = await calculateEnhancedActualHours(startDate, endDate, period, actualHours);
    
    // Add enhanced data to sessions
    sessions.enhancedActualHours = enhancedData.enhancedActualHours;
    sessions.enhancedFormattedTime = enhancedData.enhancedFormattedTime;
    sessions.useEnhancedCalculation = enhancedData.useEnhancedCalculation;
    sessions.calculationDetails = enhancedData.calculationDetails;

    // Fetch attendance status info from insights API
    let attendanceStatusInfo = {
      "P": 0.0,
      "H": 0.0,
      "L": 0.0,
      "O": 0.0
    };
    
    try {
      const insightsData = await fetchInsights(startDate, endDate);
      if (insightsData && insightsData.monthlyStatusInfo) {
        attendanceStatusInfo = {
          "P": insightsData.monthlyStatusInfo.P || 0.0,
          "H": insightsData.monthlyStatusInfo.H || 0.0,
          "L": insightsData.monthlyStatusInfo.L || 0.0,
          "O": insightsData.monthlyStatusInfo.O || 0.0
        };
        console.log(`✅ Attendance status info retrieved:`, attendanceStatusInfo);
      }
    } catch (error) {
      console.warn(`⚠️ Could not fetch attendance status info: ${error}`);
      // Keep default values (all zeros)
    }

    // Calculate actual required hours first
    // For period=day: actualRequiredHours = requiredHours - ((8h 0m) × (H + L + O))
    // For other periods: actualRequiredHours = requiredHours - ((8h 0m) × (H + L))
    let deductionDays, deductionHours, actualRequiredHours;
    
    if (period === 'day') {
      deductionDays = (attendanceStatusInfo.H || 0) + (attendanceStatusInfo.L || 0) + (attendanceStatusInfo.O || 0);
      deductionHours = deductionDays * 8; // 8 hours per H/L/O day
      actualRequiredHours = Math.max(0, REQUIRED_HOURS - deductionHours);
      console.log(`📊 Actual Required Hours calculation (DAY): ${REQUIRED_HOURS}h - (${deductionDays} × 8h) = ${actualRequiredHours}h [H+L+O: ${attendanceStatusInfo.H}+${attendanceStatusInfo.L}+${attendanceStatusInfo.O}]`);
    } else {
      deductionDays = (attendanceStatusInfo.H || 0) + (attendanceStatusInfo.L || 0);
      deductionHours = deductionDays * 8; // 8 hours per H/L day
      actualRequiredHours = Math.max(0, REQUIRED_HOURS - deductionHours);
      console.log(`📊 Actual Required Hours calculation (${period.toUpperCase()}): ${REQUIRED_HOURS}h - (${deductionDays} × 8h) = ${actualRequiredHours}h [H+L: ${attendanceStatusInfo.H}+${attendanceStatusInfo.L}]`);
    }

    // Original calculations using actualRequiredHours
    const shortfallHours = Math.max(0, actualRequiredHours - actualHours);
    const excessHours = Math.max(0, actualHours - actualRequiredHours);
    const completionPercentage = actualRequiredHours > 0 ? Math.min(100, (actualHours / actualRequiredHours) * 100) : 100;

    // Enhanced statistics using enhanced actual hours and actualRequiredHours
    const enhancedActualHours = sessions.enhancedActualHours || actualHours;
    const enhancedShortfallHours = Math.max(0, actualRequiredHours - enhancedActualHours);
    const enhancedExcessHours = Math.max(0, enhancedActualHours - actualRequiredHours);
    const enhancedCompletionPercentage = actualRequiredHours > 0 ? Math.min(100, (enhancedActualHours / actualRequiredHours) * 100) : 100;

    // Format hours helper function
    const formatHours = (hours: number): string => {
      const wholeHours = Math.floor(hours);
      const minutes = Math.round((hours - wholeHours) * 60);
      return `${wholeHours}h ${minutes}m`;
    };

    // Determine status and mode using actualRequiredHours (original)
    const isComplete = actualHours >= actualRequiredHours;
    const isExcess = actualHours > actualRequiredHours;
    const statusMode = isExcess ? 'excess' : isComplete ? 'complete' : 'incomplete';

    // Enhanced status and mode using actualRequiredHours
    const enhancedIsComplete = enhancedActualHours >= actualRequiredHours;
    const enhancedIsExcess = enhancedActualHours > actualRequiredHours;
    const enhancedStatusMode = enhancedIsExcess ? 'excess' : enhancedIsComplete ? 'complete' : 'incomplete';

    // Build unified response
    const unifiedResponse = {
      success: true,
      startDate: startDate,
      endDate: endDate,
      period: period,
      
      // Raw data
      totalSwipes: allSwipes.length,
      allSwipes,
      
      // Sessions data
      sessions,
      
      // Calculated statistics (original GreytHR data)
      stats: {
        actualHours,
        requiredHours: REQUIRED_HOURS,
        shortfallHours,
        excessHours,
        isComplete,
        completionPercentage,
        statusMode
      },

      // Enhanced statistics (real-time calculation)
      enhancedStats: {
        actualHours: enhancedActualHours,
        requiredHours: REQUIRED_HOURS,
        shortfallHours: enhancedShortfallHours,
        excessHours: enhancedExcessHours,
        isComplete: enhancedIsComplete,
        completionPercentage: enhancedCompletionPercentage,
        statusMode: enhancedStatusMode,
        useEnhancedCalculation: sessions.useEnhancedCalculation,
        calculationDetails: sessions.calculationDetails
      },

      // Attendance status information from insights API
      attendanceStatusInfo,
      
      // UI display data (original)
      display: {
        activeHours: formatHours(actualHours),
        requiredHours: formatHours(REQUIRED_HOURS),
        actualRequiredHours: formatHours(actualRequiredHours),
        excessTime: isExcess ? formatHours(excessHours) : null,
        shortfallTime: !isComplete ? formatHours(shortfallHours) : null,
        progressPercentage: Math.round(completionPercentage),
        statusMessage: isExcess 
          ? `OVERDRIVE MODE: +${formatHours(excessHours)}`
          : isComplete 
            ? 'COMPLETE'
            : `${formatHours(shortfallHours)} REMAINING`,
        statusClass: statusMode
      },

      // Enhanced UI display data (real-time)
      enhancedDisplay: {
        activeHours: formatHours(enhancedActualHours),
        requiredHours: formatHours(REQUIRED_HOURS),
        actualRequiredHours: formatHours(actualRequiredHours),
        excessTime: enhancedIsExcess ? formatHours(enhancedExcessHours) : null,
        shortfallTime: !enhancedIsComplete ? formatHours(enhancedShortfallHours) : null,
        progressPercentage: Math.round(enhancedCompletionPercentage),
        statusMessage: enhancedIsExcess 
          ? `OVERDRIVE MODE: +${formatHours(enhancedExcessHours)}`
          : enhancedIsComplete 
            ? 'COMPLETE'
            : `${formatHours(enhancedShortfallHours)} REMAINING`,
        statusClass: enhancedStatusMode,
        useEnhancedCalculation: sessions.useEnhancedCalculation
      },
      
      // Additional metadata
      metadata: {
        currentTime: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
        lastUpdated: new Date().toISOString(),
        timezone: 'Asia/Kolkata'
      },
      
      // Employee information
      employee: {
        employeeId: employeeInfo.employeeId,
        employeeName: employeeInfo.employeeName,
        employeeNumber: employeeInfo.employeeNumber
      }
    };

    res.json(unifiedResponse);
    
  } catch (error) {
    console.error('Error in worklogs endpoint:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      period: req.query.period as string || 'day'
    });
  }
});

// Simple ping endpoint
app.get("/ping", (req, res) => {
  res.json({ pong: true, timestamp: new Date().toISOString() });
});

app.get("/api/ping", (req, res) => {
  res.json({ pong: true, timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log("Routes available:");
  console.log("  GET /");
  console.log("  GET /api/hours/daily?date=YYYY-MM-DD");
  console.log("  GET /api/hours/worklogs?startDate=YYYY-MM-DD&period=day|week|month");
  console.log("  GET /ping");
});
