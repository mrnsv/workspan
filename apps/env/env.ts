import * as dotenv from "dotenv";
import * as path from "path";
import { fileURLToPath } from "url";
import { promises as fs } from "fs";

// Get current directory in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env in the same directory
dotenv.config({ path: path.resolve(__dirname, ".env") });

interface Environment {
  GREYTHR_URL: string;
  SWIPES_URL: string;
  COOKIE: string;
  ATTENDANCE_INFO_URL?: string;
  TOTAL_HOURS_URL?: string;
  INSIGHTS_URL?: string;
  LOGIN_ID?: string;
  PASSWORD?: string;
}

async function loadCookieFromFile(): Promise<string | undefined> {
  try {
    const cookiesPath = path.resolve(__dirname, "cookies.json");
    const cookieData = JSON.parse(await fs.readFile(cookiesPath, 'utf8'));
    return cookieData.cookie;
  } catch (error) {
    // Cookie file doesn't exist or is invalid, return undefined
    return undefined;
  }
}

async function validateEnv(): Promise<Environment> {
  // Try to load cookie from cookies.json first, then fall back to .env
  const cookieFromFile = await loadCookieFromFile();
  
  const envVars = {
    GREYTHR_URL: process.env.GREYTHR_URL,
    SWIPES_URL: process.env.SWIPES_URL,
    COOKIE: cookieFromFile || process.env.COOKIE,
    ATTENDANCE_INFO_URL: process.env.ATTENDANCE_INFO_URL,
    TOTAL_HOURS_URL: process.env.TOTAL_HOURS_URL,
    INSIGHTS_URL: process.env.INSIGHTS_URL,
    LOGIN_ID: process.env.LOGIN_ID,
    PASSWORD: process.env.PASSWORD,
  };

  // Only validate required vars for backend API
  const requiredVars = ['SWIPES_URL'];
  const missingVars = requiredVars.filter(key => !envVars[key as keyof typeof envVars]);

  if (missingVars.length > 0) {
    console.warn(
      `Missing required environment variables: ${missingVars.join(", ")}`
    );
  }

  // Warn if no cookie is available from either source
  if (!envVars.COOKIE) {
    console.warn(
      `No COOKIE found in cookies.json or .env file. Run 'npm run get-token' to extract a fresh cookie.`
    );
  }

  return envVars as Environment;
}

// Export validated environment variables
export const env = await validateEnv();
