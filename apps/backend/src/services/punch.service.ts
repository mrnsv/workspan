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
    console.log(`🍪 Using cookie from cookies.json (${cookieData.cookie.length} chars)`);
    return cookieData.cookie;
  } catch (error) {
    console.warn('⚠️ Could not read cookies.json, falling back to env COOKIE');
    return env.COOKIE || '';
  }
}

async function readEmployeeDataFromFile(): Promise<{ employeeId: number; cookie: string }> {
  try {
    const cookieFileContent = await fs.readFile(cookiesPath, 'utf8');
    const cookieData: CookieData = JSON.parse(cookieFileContent);
    
    if (!cookieData.employeeId) {
      throw new Error('employeeId not found in cookies.json');
    }
    
    return {
      employeeId: cookieData.employeeId,
      cookie: cookieData.cookie
    };
  } catch (error) {
    console.error('❌ Could not read employee data from cookies.json:', error);
    throw new Error('Failed to read employee data from cookies.json');
  }
}

async function refreshCookie(): Promise<string> {
  console.log('🔄 Refreshing expired cookie...');
  
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
        console.log('✅ Cookie refresh completed successfully');
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
  // Get employee data and cookie from JSON file
  let employeeData = await readEmployeeDataFromFile();
  
  // Replace {employeeId} placeholder in SWIPES_URL with actual employeeId
  const swipesUrl = env.SWIPES_URL?.replace('{employeeId}', employeeData.employeeId.toString());
  
  if (!swipesUrl) {
    throw new Error('SWIPES_URL not configured in environment');
  }
  
  console.log(`🔗 Calling SWIPES API: ${swipesUrl}`);
  
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
      console.log(`🔐 GreytHR API call failed (${statusCode}), attempting to refresh cookie...`);
      
      try {
        // Refresh the cookie and get updated employee data
        await refreshCookie();
        employeeData = await readEmployeeDataFromFile();
        
        // Retry the request with the new cookie
        console.log('🔄 Retrying request with refreshed cookie...');
        const retryRes = await axios.get<SwipeApiResponse>(swipesUrl, {
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
        
        console.log('✅ Request successful after cookie refresh');
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
