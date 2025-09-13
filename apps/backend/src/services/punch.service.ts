import axios from "axios";
import { env } from "../../../env/env.js";
import { promises as fs } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { spawn } from "child_process";

// Get directory paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const cookiesPath = resolve(__dirname, "../../../env/cookies.json");

interface CookieData {
  cookie: string;
  extractedAt: string;
  url: string;
  employeeId?: number;
  employeeName?: string;
  employeeNumber?: string;
}

async function readCookieFromFile(): Promise<string> {
  try {
    const cookieFileContent = await fs.readFile(cookiesPath, 'utf8');
    const cookieData: CookieData = JSON.parse(cookieFileContent);
    
    // Check if cookie key exists and has a valid value
    if (!cookieData.hasOwnProperty('cookie')) {
      console.log('🔄 Cookie key missing in cookies.json, refreshing...');
      return await refreshCookie();
    }
    
    if (!cookieData.cookie || cookieData.cookie.trim() === '' || cookieData.cookie === null || cookieData.cookie === undefined) {
      console.log('🔄 Cookie value is missing/empty/null in cookies.json, refreshing...');
      return await refreshCookie();
    }
    
    // Basic validation - check if cookie looks valid (contains common cookie patterns)
    const cookieStr = cookieData.cookie.toString().trim();
    if (cookieStr.length < 10 || !cookieStr.includes('=')) {
      console.log('🔄 Cookie value appears invalid in cookies.json, refreshing...');
      return await refreshCookie();
    }
    
    return cookieStr;
    
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      console.log('🔄 cookies.json file missing, refreshing...');
    } else {
      console.log('🔄 cookies.json file is invalid/corrupted, refreshing...');
    }
    return await refreshCookie();
  }
}

async function readEmployeeDataFromFile(): Promise<{ employeeId: number; cookie: string }> {
  try {
    // Always read fresh data from file (no caching)
    const cookieFileContent = await fs.readFile(cookiesPath, 'utf8');
    const cookieData: CookieData = JSON.parse(cookieFileContent);
    
    console.log(`📄 Fresh read from cookies.json - Employee ID: ${cookieData.employeeId}`);
    
    // Check for missing/invalid cookie first - refresh if needed
    if (!cookieData.hasOwnProperty('cookie') || 
        !cookieData.cookie || 
        cookieData.cookie.trim() === '' || 
        cookieData.cookie === null || 
        cookieData.cookie === undefined) {
      console.log('🔄 Cookie missing/invalid in readEmployeeDataFromFile, refreshing...');
      await refreshCookie();
      // Re-read the file after refresh
      const refreshedContent = await fs.readFile(cookiesPath, 'utf8');
      const refreshedData: CookieData = JSON.parse(refreshedContent);
      
      if (!refreshedData.employeeId) {
        throw new Error('employeeId not found in cookies.json after refresh');
      }
      
      return {
        employeeId: refreshedData.employeeId,
        cookie: refreshedData.cookie
      };
    }
    
    if (!cookieData.employeeId) {
      throw new Error('employeeId not found in cookies.json');
    }
    
    return {
      employeeId: cookieData.employeeId,
      cookie: cookieData.cookie
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      console.log('🔄 cookies.json file missing in readEmployeeDataFromFile, refreshing...');
      await refreshCookie();
      // Try reading again after refresh
      try {
        const refreshedContent = await fs.readFile(cookiesPath, 'utf8');
        const refreshedData: CookieData = JSON.parse(refreshedContent);
        
        if (!refreshedData.employeeId) {
          throw new Error('employeeId not found in cookies.json after refresh');
        }
        
        return {
          employeeId: refreshedData.employeeId,
          cookie: refreshedData.cookie
        };
      } catch (refreshError) {
        console.error('❌ Failed to read employee data after cookie refresh:', refreshError);
        throw new Error('Failed to read employee data from cookies.json after refresh');
      }
    } else {
      console.error('❌ Could not read employee data from cookies.json:', error);
      throw new Error('Failed to read employee data from cookies.json');
    }
  }
}

async function refreshCookie(): Promise<string> {
  
  return new Promise((promiseResolve, promiseReject) => {
    // Run the get-token script
    const projectRoot = resolve(__dirname, '../../../');
    const getTokenProcess = spawn('npm', ['run', 'get-token'], {
      stdio: 'inherit',
      shell: true,
      cwd: projectRoot
    });

    getTokenProcess.on('close', async (code) => {
      if (code === 0) {
        try {
          const newCookie = await readCookieFromFile();
          promiseResolve(newCookie);
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

export interface Swipe {
  punchDateTime: string;
  inOutIndicator: 0 | 1; // 0 = OUT, 1 = IN (corrected interpretation)
}

export interface SwipeApiResponse {
  swipe: Swipe[];
  swipePairs: Array<{
    inSwipe: string;
    outSwipe: string;
    actualHours: number;
  }>;
  totalActualHours: number;
  showInOutIndicator: boolean;
  autoShiftDetectionEnabled: boolean;
}

export async function fetchSwipes(startDate: string): Promise<Swipe[]> {
  // Get employee data and cookie from JSON file (always fresh read)
  let employeeData = await readEmployeeDataFromFile();
  
  console.log(`🔍 Using Employee ID: ${employeeData.employeeId} for API call`);
  
  // Replace {employeeId} placeholder in SWIPES_URL with actual employeeId
  const swipesUrl = env.SWIPES_URL?.replace('{employeeId}', employeeData.employeeId.toString());
  
  console.log(`🌐 API URL: ${swipesUrl}`);
  
  if (!swipesUrl) {
    throw new Error('SWIPES_URL not configured in environment');
  }
  
  
  try {
    const res = await axios.get<SwipeApiResponse>(swipesUrl, {
      params: {
        startDate,
        endDate: "",
        systemSwipes: true,
        swipePairs: true,
      },
      headers: {
        Cookie: employeeData.cookie,
      },
    });
    
    // Extract the swipes array from the response
    return res.data.swipe || [];
    
  } catch (error: any) {
    // If GreytHR API call fails (any HTTP error or network issue), try to refresh the cookie
    if (error.response || error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      const statusCode = error.response?.status || 'Network Error';
      
      try {
        // Refresh the cookie and get updated employee data
        await refreshCookie();
        employeeData = await readEmployeeDataFromFile();
        
        console.log(`🔄 Retry with fresh Employee ID: ${employeeData.employeeId}`);
        
        // Rebuild the URL with fresh employee ID
        const retrySwipesUrl = env.SWIPES_URL?.replace('{employeeId}', employeeData.employeeId.toString());
        console.log(`🌐 Retry API URL: ${retrySwipesUrl}`);
        
        // Retry the request with the new cookie and fresh employee ID
        const retryRes = await axios.get<SwipeApiResponse>(retrySwipesUrl, {
          params: {
            startDate,
            endDate: "",
            systemSwipes: true,
            swipePairs: true,
          },
          headers: {
            Cookie: employeeData.cookie,
          },
        });
        
        return retryRes.data.swipe || [];
        
      } catch (refreshError) {
        console.error('❌ Cookie refresh failed:', refreshError);
        throw new Error(`GreytHR API call failed (${statusCode}) and cookie refresh unsuccessful`);
      }
    }
    
    // Re-throw other errors (non-HTTP/network errors)
    throw error;
  }
}
