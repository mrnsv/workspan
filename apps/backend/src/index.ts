import express from "express";
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { spawn } from "child_process";
import { calculateDailyWorkHours, calculateRequiredHoursAchievementTime } from "./lib/hours.util.js";

// Browser session data interface
interface BrowserSessionData {
  employeeId: number;
  employeeName: string;
  employeeNumber: string;
  cookie: string;
}

// Get current directory in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import environment configuration
const { env } = await import('../../env/env.js');

const app = express();

// CORS middleware - Allow local network access
app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  // Allow localhost and local network IPs (192.168.x.x, 172.x.x.x, 10.x.x.x)
  const isLocalNetwork = origin && (
    origin.includes('localhost') ||
    origin.includes('127.0.0.1') ||
    origin.match(/^https?:\/\/(192\.168\.|172\.(1[6-9]|2[0-9]|3[01])\.|10\.)/) ||
    origin.match(/^https?:\/\/(172\.(1[6-9]|2[0-9]|3[01])\.)/)
  );
  
  if (isLocalNetwork) {
    res.header('Access-Control-Allow-Origin', origin);
  } else {
    // Fallback to localhost for development
    res.header('Access-Control-Allow-Origin', 'http://localhost:4200');
  }
  
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

app.use(express.json());

// Extract browser session data by running get-token.ts
async function extractBrowserSessionData(loginId: string, password: string): Promise<BrowserSessionData> {
  const originalLoginId = process.env.LOGIN_ID;
  const originalPassword = process.env.PASSWORD;
  
  try {
    // Temporarily set environment variables for the automation script
    process.env.LOGIN_ID = loginId;
    process.env.PASSWORD = password;
    
    // Run the get-token automation script
    await runGetTokenScript();
    
    // Read the generated data
    const cookiesPath = path.resolve(__dirname, '../../env/cookies.json');
    const cookieFileContent = await fs.readFile(cookiesPath, 'utf8');
    const cookieData = JSON.parse(cookieFileContent);
    
    // Delete the temporary file immediately
    try {
      await fs.unlink(cookiesPath);
      console.log(`🗑️ Removed temporary cookies.json for user: ${cookieData.employeeNumber}`);
    } catch (unlinkError) {
      console.warn('⚠️ Could not remove cookies.json:', unlinkError.message);
    }
    
    // Return data for browser storage
    return {
      employeeId: cookieData.employeeId,
      employeeName: cookieData.employeeName,
      employeeNumber: cookieData.employeeNumber,
      cookie: cookieData.cookie
    };
    
  } finally {
    // Restore original environment variables
    if (originalLoginId) {
      process.env.LOGIN_ID = originalLoginId;
    } else {
      delete process.env.LOGIN_ID;
    }
    if (originalPassword) {
      process.env.PASSWORD = originalPassword;
    } else {
      delete process.env.PASSWORD;
    }
  }
}

// Run get-token script
async function runGetTokenScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    const projectRoot = path.resolve(__dirname, '../../../');
    const getTokenProcess = spawn('npm', ['run', 'get-token'], {
      stdio: 'inherit',
      shell: true,
      cwd: projectRoot
    });

    getTokenProcess.on('close', async (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`get-token script failed with code ${code}`));
      }
    });

    getTokenProcess.on('error', (error) => {
      reject(new Error(`Failed to start get-token script: ${error.message}`));
    });
  });
}

// Helper function to fetch total hours from GreytHR API using browser session
async function fetchTotalHoursWithSession(sessionData: BrowserSessionData, startDate: string, endDate: string): Promise<any> {
  const url = `https://waydot.greythr.com/latte/v3/attendance/info/table/${sessionData.employeeId}/total`;
  const params = new URLSearchParams({
    startDate,
    endDate
  });
  
  console.log(`🔍 Making Total Hours API request to: ${url}?${params}`);
  console.log(`🔍 Employee: ${sessionData.employeeName} (${sessionData.employeeNumber})`);
  
  try {
    const response = await fetch(`${url}?${params}`, {
      headers: {
        'Cookie': sessionData.cookie,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    console.log(`📊 Total Hours API Response Status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      console.error(`❌ Total Hours API Error: ${response.status} ${response.statusText}`);
      console.error(`❌ URL: ${url}?${params}`);
      
      // Try to read the error response
      try {
        const errorText = await response.text();
        console.error(`❌ Error Response: ${errorText.substring(0, 500)}...`);
      } catch (e) {
        console.error(`❌ Could not read error response`);
      }
      
      throw new Error(`Failed to fetch total hours: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    return data;
    
  } catch (error: any) {
    console.error(`❌ Error fetching total hours for ${sessionData.employeeNumber}:`, error);
    throw new Error(`Total hours API call failed: ${error.message}`);
  }
}

// Helper function to fetch insights using browser session
async function fetchInsightsWithSession(sessionData: BrowserSessionData, startDate: string, endDate: string): Promise<any> {
  const url = `https://waydot.greythr.com/latte/v3/attendance/info/${sessionData.employeeId}/insights`;
  const params = new URLSearchParams({
    startDate,
    endDate,
    shiftType: 'regular_shift'
  });
  
  console.log(`🔍 Making Insights API request to: ${url}?${params}`);
  
  try {
    const response = await fetch(`${url}?${params}`, {
      headers: {
        'Cookie': sessionData.cookie,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    console.log(`📊 Insights API Response Status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch insights: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    return data;
    
  } catch (error: any) {
    console.error(`❌ Error fetching insights for ${sessionData.employeeNumber}:`, error);
    throw new Error(`Insights API call failed: ${error.message}`);
  }
}

// Fetch swipes data using browser session
async function fetchSwipesWithSession(sessionData: BrowserSessionData, date: string): Promise<any[]> {
  // Use the correct GreytHR API format based on your cURL example
  const url = `https://waydot.greythr.com/latte/v3/attendance/info/${sessionData.employeeId}/swipes`;
  const params = new URLSearchParams({ 
    startDate: date,
    endDate: '',
    systemSwipes: 'true',
    swipePairs: 'true'
  });
  
  console.log(`🔍 Making API request to: ${url}?${params}`);
  console.log(`🔍 Employee: ${sessionData.employeeName} (${sessionData.employeeNumber})`);
  
  try {
    const response = await fetch(`${url}?${params}`, {
      headers: {
        'Cookie': sessionData.cookie,
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'en,en-IN;q=0.9',
        'X-Requested-With': 'XMLHttpRequest',
        'Referer': 'https://waydot.greythr.com/v3/portal/ess/attendance/attendance-info',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-origin'
      }
    });
    
    console.log(`📊 API Response Status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      console.error(`❌ API Error: ${response.status} ${response.statusText}`);
      console.error(`❌ URL: ${url}?${params}`);
      
      // Try to read the error response
      try {
        const errorText = await response.text();
        console.error(`❌ Error Response: ${errorText.substring(0, 200)}...`);
      } catch (e) {
        console.error(`❌ Could not read error response`);
      }
      
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log(`📊 Swipes Count: ${data.swipe ? data.swipe.length : 'No swipe property'}`);
    
    if (data.swipe && data.swipe.length > 0) {
      console.log(`✅ Found ${data.swipe.length} swipes for ${sessionData.employeeNumber}`);
      console.log(`📊 First swipe sample: ${JSON.stringify(data.swipe[0]).substring(0, 100)}...`);
    } else {
      console.log(`⚠️ No swipes data found for ${sessionData.employeeNumber} on ${date}`);
      console.log(`📊 Full response sample: ${JSON.stringify(data).substring(0, 300)}...`);
    }
    
    return data.swipe || [];
    
  } catch (error) {
    console.error(`❌ Error fetching swipes for ${sessionData.employeeNumber}:`, error);
    throw error;
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

// Helper function to calculate weekdays (Monday-Friday) in a date range
function calculateWeekdaysInRange(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  let weekdays = 0;
  
  // Iterate through each day in the range
  const current = new Date(start);
  while (current <= end) {
    const dayOfWeek = current.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    // Count Monday (1) through Friday (5)
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      weekdays++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return weekdays;
}

// LOGIN endpoint - extracts session data using get-token.ts and returns it for browser storage
app.post("/api/login", async (req, res) => {
  try {
    const { loginId, password } = req.body;
    
    if (!loginId || !password) {
      return res.status(400).json({
        success: false,
        error: 'Missing required credentials: loginId and password'
      });
    }
    
    console.log('🔐 Extracting session data for user:', loginId);
    
    // Extract session data using get-token.ts
    const sessionData = await extractBrowserSessionData(loginId, password);
    
    res.json({
      success: true,
      message: 'Authentication successful',
      sessionData: sessionData
    });
    
  } catch (error) {
    console.error('❌ Authentication failed:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Authentication failed',
      message: 'Failed to extract session data'
    });
  }
});

// Work logs endpoint (combines sessions + swipes + calculations) - OLD implementation with browser sessions
app.post("/api/hours/worklogs", async (req, res) => {
  try {
    const { sessionData, startDate, endDate, period } = req.body;
    
    if (!sessionData) {
      return res.status(400).json({
        success: false,
        error: 'Session data required'
      });
    }
    
    // Validate session data
    if (!sessionData.employeeId || !sessionData.cookie || !sessionData.employeeNumber) {
      return res.status(400).json({
        success: false,
        error: 'Invalid session data'
      });
    }
    
    console.log(`📊 Fetching worklogs for ${sessionData.employeeName} (${sessionData.employeeNumber}) - Period: ${period}`);
    
    const targetPeriod = period || 'day';
    let targetStartDate: string, targetEndDate: string;
    
    if (targetPeriod === 'day') {
      // For day period, expect startDate parameter (same as date)
      targetStartDate = startDate || new Date().toLocaleDateString('en-CA', {
        timeZone: 'Asia/Kolkata'
      });
      targetEndDate = targetStartDate; // Same as startDate for day period
    } else if (targetPeriod === 'week') {
      // For week period, expect both startDate and endDate parameters
      targetStartDate = startDate;
      targetEndDate = endDate;
      
      if (!targetStartDate || !targetEndDate) {
        return res.status(400).json({
          success: false,
          error: 'Week period requires both startDate and endDate parameters'
        });
      }
    } else { // month
      // For month period, expect both startDate and endDate parameters
      targetStartDate = startDate;
      targetEndDate = endDate;
      
      if (!targetStartDate || !targetEndDate) {
        return res.status(400).json({
          success: false,
          error: 'Month period requires both startDate and endDate parameters'
        });
      }
    }
    
    let actualHours: number;
    let REQUIRED_HOURS: number;
    let allSwipes: any[] = [];
    let sessions: any = {};
    let formattedTime: string;
    let achievementTime: string | null = null;
    
    // Set required hours based on period
    if (targetPeriod === 'day') {
      REQUIRED_HOURS = 8;
    } else if (targetPeriod === 'week') {
      // Calculate weekdays in the week range and multiply by 8 hours
      const weekdays = calculateWeekdaysInRange(targetStartDate, targetEndDate);
      REQUIRED_HOURS = 8 * weekdays;
      console.log(`📅 Week period: ${weekdays} weekdays × 8 hours = ${REQUIRED_HOURS} required hours`);
    } else { // month
      // Calculate weekdays in the month range and multiply by 8 hours
      const weekdays = calculateWeekdaysInRange(targetStartDate, targetEndDate);
      REQUIRED_HOURS = 8 * weekdays;
      console.log(`📅 Month period: ${weekdays} weekdays × 8 hours = ${REQUIRED_HOURS} required hours`);
    }
    
    if (targetPeriod === 'day') {
      // Existing daily logic
      const swipes = await fetchSwipesWithSession(sessionData, targetStartDate);
      const workHours = calculateDailyWorkHours(swipes, targetStartDate);
      
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
            duration: `${hours}h ${minutes}m`,
            outDuration: pair.outDuration
          };
        })
      };
      
      // Calculate achievement time for DAY period and current date
      if (targetStartDate === new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })) {
        const achievementResult = calculateRequiredHoursAchievementTime(
          actualHours,
          REQUIRED_HOURS,
          workHours.isCurrentlyWorking,
          workHours.lastPunchIn
        );
        achievementTime = achievementResult.willAchieveAt;
      }
    } else {
        // Weekly or Monthly logic - use provided startDate and endDate
        try {
          console.log(`🔍 Attempting to fetch ${targetPeriod} data from TOTAL_HOURS_URL API`);
          console.log(`📅 Date range: ${targetStartDate} to ${targetEndDate}`);
          
          // Fetch total hours from GreytHR API
          const totalHoursData = await fetchTotalHoursWithSession(sessionData, targetStartDate, targetEndDate);
          
          // Convert totalProductionHours from minutes to hours
          const totalProductionMinutes = totalHoursData.totalProductionHours || 0;
          actualHours = totalProductionMinutes / 60;
          formattedTime = convertMinutesToHoursMinutes(totalProductionMinutes);
          
          console.log(`✅ ${targetPeriod} calculation: ${totalProductionMinutes} minutes = ${actualHours} hours`);
        } catch (error) {
          console.error(`❌ Error fetching ${targetPeriod} data:`, error);
          console.error(`❌ Error details:`, error.message);
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


    // Enhanced Calculation Logic for WEEK and MONTH modes
    let enhancedCalculation = {
      currentDateInRange: false,
      yesterdayDateInRange: false,
      isBefore1030AM: false,
      achievementTime: achievementTime,
      additionalSources: {
        currentActualHours: 0,
        yesterdayActualHours: 0
      }
    };

    if (targetPeriod !== 'day') {
      // Get current date and time in IST
      const nowIST = new Date().toLocaleString('en-CA', { timeZone: 'Asia/Kolkata' });
      const currentDateIST = nowIST.split(' ')[0].replace(',', ''); // YYYY-MM-DD format
      const currentTimeIST = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }).format(new Date());
      
      // Calculate yesterday's date in IST
      const yesterdayDate = new Date(currentDateIST);
      yesterdayDate.setDate(yesterdayDate.getDate() - 1);
      const yesterdayDateIST = yesterdayDate.toISOString().split('T')[0];
      
      // Check if current date is in selected date range
      const currentDateInRange = currentDateIST >= targetStartDate && currentDateIST <= targetEndDate;
      
      // Check if yesterday's date is in selected date range
      const yesterdayDateInRange = yesterdayDateIST >= targetStartDate && yesterdayDateIST <= targetEndDate;
      
      // Check if current time is before 10:30 AM IST
      const isBefore1030AM = currentTimeIST < '10:30';
      
      // Initialize enhanced calculation object
      enhancedCalculation = {
        currentDateInRange: currentDateInRange,
        yesterdayDateInRange: yesterdayDateInRange,
        isBefore1030AM: isBefore1030AM,
        achievementTime: achievementTime,
        additionalSources: {
          currentActualHours: 0,
          yesterdayActualHours: 0
        }
      };
      
      // For WEEK and MONTH periods, fetch current day's actual hours if current date is in range
      if (currentDateInRange) {
        try {
          console.log(`🔍 Fetching current day's swipes for enhanced calculation`);
          const currentDaySwipes = await fetchSwipesWithSession(sessionData, currentDateIST);
          const currentDayWorkHours = calculateDailyWorkHours(currentDaySwipes, currentDateIST);
          enhancedCalculation.additionalSources.currentActualHours = currentDayWorkHours.totalActualHours;
          console.log(`✅ Current day actual hours: ${currentDayWorkHours.totalActualHours}`);
        } catch (error) {
          console.error(`❌ Error fetching current day's swipes:`, error);
          enhancedCalculation.additionalSources.currentActualHours = 0;
        }
      } else {
        enhancedCalculation.additionalSources.currentActualHours = 0;
      }
      
      // Fetch yesterday's actual hours if yesterday is in range AND it's before 10:30 AM
      if (yesterdayDateInRange && isBefore1030AM) {
        try {
          console.log(`🔍 Fetching yesterday's swipes for enhanced calculation`);
          const yesterdaySwipes = await fetchSwipesWithSession(sessionData, yesterdayDateIST);
          const yesterdayWorkHours = calculateDailyWorkHours(yesterdaySwipes, yesterdayDateIST);
          enhancedCalculation.additionalSources.yesterdayActualHours = yesterdayWorkHours.totalActualHours;
          console.log(`✅ Yesterday actual hours: ${yesterdayWorkHours.totalActualHours}`);
        } catch (error) {
          console.error(`❌ Error fetching yesterday's swipes:`, error);
          enhancedCalculation.additionalSources.yesterdayActualHours = 0;
        }
      } else {
        enhancedCalculation.additionalSources.yesterdayActualHours = 0;
      }
    }

    // Fetch attendance status info from insights API
    let attendanceStatusInfo = {
      "P": 0.0,
      "H": 0.0,
      "L": 0.0,
      "O": 0.0
    };
    
    try {
      const insightsData = await fetchInsightsWithSession(sessionData, targetStartDate, targetEndDate);
      if (insightsData && insightsData.monthlyStatusInfo) {
        attendanceStatusInfo = {
          "P": insightsData.monthlyStatusInfo.P || 0.0,
          "H": insightsData.monthlyStatusInfo.H || 0.0,
          "L": insightsData.monthlyStatusInfo.L || 0.0,
          "O": insightsData.monthlyStatusInfo.O || 0.0
        };
      }
    } catch (error) {
      // Keep default values (all zeros)
    }

    // Calculate actual required hours first
    // For period=day: actualRequiredHours = requiredHours - ((8h 0m) × (H + L + O))
    // For other periods: actualRequiredHours = requiredHours - ((8h 0m) × (H + L))
    let deductionDays, deductionHours, actualRequiredHours;
    
    if (targetPeriod === 'day') {
      deductionDays = (attendanceStatusInfo.H || 0) + (attendanceStatusInfo.L || 0) + (attendanceStatusInfo.O || 0);
      deductionHours = deductionDays * 8; // 8 hours per H/L/O day
      actualRequiredHours = Math.max(0, REQUIRED_HOURS - deductionHours);
    } else {
      deductionDays = (attendanceStatusInfo.H || 0) + (attendanceStatusInfo.L || 0);
      deductionHours = deductionDays * 8; // 8 hours per H/L day
      actualRequiredHours = Math.max(0, REQUIRED_HOURS - deductionHours);
    }

    // Calculate enhanced actual hours for WEEK and MONTH modes
    let enhancedActualHours = actualHours;
    
    if (targetPeriod !== 'day') {
      // Add current date actual hours if current date is in range
      if (enhancedCalculation.currentDateInRange && enhancedCalculation.additionalSources.currentActualHours) {
        enhancedActualHours += enhancedCalculation.additionalSources.currentActualHours;
      }
      
      // Add yesterday's actual hours if yesterday is in range AND it's before 10:30 AM
      if (enhancedCalculation.yesterdayDateInRange && enhancedCalculation.isBefore1030AM && enhancedCalculation.additionalSources.yesterdayActualHours) {
        enhancedActualHours += enhancedCalculation.additionalSources.yesterdayActualHours;
      }
    }

    // Use enhanced hours for WEEK/MONTH, original hours for DAY
    const finalActualHours = targetPeriod === 'day' ? actualHours : enhancedActualHours;

    // Original calculations using actualRequiredHours
    const shortfallHours = Math.max(0, actualRequiredHours - finalActualHours);
    const excessHours = Math.max(0, finalActualHours - actualRequiredHours);
    const completionPercentage = actualRequiredHours > 0 ? Math.min(100, (finalActualHours / actualRequiredHours) * 100) : 100;

    // Format hours helper function
    const formatHours = (hours: number): string => {
      const wholeHours = Math.floor(hours);
      const minutes = Math.round((hours - wholeHours) * 60);
      return `${wholeHours}h ${minutes}m`;
    };

    // Determine status and mode using enhanced hours for WEEK/MONTH, original for DAY
    const isComplete = finalActualHours >= actualRequiredHours;
    const isExcess = finalActualHours > actualRequiredHours;
    const statusMode = isExcess ? 'excess' : isComplete ? 'complete' : 'incomplete';

    // Build unified response
    const unifiedResponse = {
      success: true,
      startDate: targetStartDate,
      endDate: targetEndDate,
      period: targetPeriod,
      
      // Raw data
      totalSwipes: allSwipes.length,
      allSwipes,
      
      // Sessions data
      sessions,
      
      // Calculated statistics (enhanced for WEEK/MONTH, original for DAY)
      stats: {
        actualHours: finalActualHours,
        requiredHours: REQUIRED_HOURS,
        shortfallHours,
        excessHours,
        isComplete,
        completionPercentage,
        statusMode
      },

      // Attendance status information from insights API
      attendanceStatusInfo,
      
      // Enhanced Calculation (WEEK and MONTH modes only)
      enhancedCalculation,
      
      // UI display data (enhanced for WEEK/MONTH, original for DAY)
      display: {
        activeHours: formatHours(finalActualHours),
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

      // Additional metadata
      metadata: {
        currentTime: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
        lastUpdated: new Date().toISOString(),
        timezone: 'Asia/Kolkata'
      },
      
      // Employee information
      employee: {
        employeeId: sessionData.employeeId,
        employeeName: sessionData.employeeName,
        employeeNumber: sessionData.employeeNumber
      }
    };

    res.json(unifiedResponse);
    
  } catch (error) {
    console.error('Error in worklogs endpoint:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      period: req.body.period || 'day'
    });
  }
});

const PORT = Number(env.PORT) || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Workspan Backend Server running on port ${PORT}`);
  console.log(`📍 Backend URL: ${env.BACKEND_URL || `http://localhost:${PORT}`}`);
  console.log(`🌐 Frontend URL: ${env.FRONTEND_URL || 'http://localhost:4200'}`);
  
  console.log("\n📋 Available Routes:");
  console.log("  POST /api/login - Extract session data using get-token.ts");
  console.log("  POST /api/hours/worklogs - Get work logs");
  
  console.log("\n🔧 Implementation Details:");
  console.log("  📊 DAY: Single swipes API call");
  console.log("  📊 WEEK/MONTH: Single total-hours API call + enhanced calculations");
  console.log("  🔐 Session Management: Browser-based (localStorage)");
  console.log("  ⚡ Performance: Optimized with single API calls for week/month");
});