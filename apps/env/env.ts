import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

// Get current directory in ES modules
const __dirname = dirname(fileURLToPath(import.meta.url));

// Load environment variables from .env in the same directory
dotenv.config({ path: resolve(__dirname, ".env") });

interface Environment {
  // Server Configuration
  PORT?: string;
  FRONTEND_PORT?: string;
  BACKEND_URL?: string;
  FRONTEND_URL?: string;
  ALLOWED_ORIGINS?: string;
  
  // GreytHR API Configuration
  GREYTHR_URL: string;
  SWIPES_URL: string;
  COOKIE: string;
  ATTENDANCE_INFO_URL?: string;
  TOTAL_HOURS_URL?: string;
  INSIGHTS_URL?: string;
}

/**
 * Creates and validates environment configuration
 */
async function createEnvironment(): Promise<Environment> {
  // No longer loading cookies from file - using browser-based sessions
  // Cookies are now provided via frontend authentication
  
  const env: Environment = {
    // Server Configuration
    PORT: process.env.PORT || '3201',
    FRONTEND_PORT: process.env.FRONTEND_PORT || '4201',
    BACKEND_URL: process.env.BACKEND_URL || `http://localhost:${process.env.PORT || '3201'}`,
    FRONTEND_URL: process.env.FRONTEND_URL || `http://localhost:${process.env.FRONTEND_PORT || '4201'}`,
    ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS || `http://localhost:${process.env.FRONTEND_PORT || '4201'},http://127.0.0.1:${process.env.FRONTEND_PORT || '4201'}`,
    
    // GreytHR API Configuration
    GREYTHR_URL: process.env.GREYTHR_URL!,
    SWIPES_URL: process.env.SWIPES_URL!,
    COOKIE: '', // Empty - cookies provided via frontend sessions
    ATTENDANCE_INFO_URL: process.env.ATTENDANCE_INFO_URL,
    TOTAL_HOURS_URL: process.env.TOTAL_HOURS_URL,
    INSIGHTS_URL: process.env.INSIGHTS_URL,
    
    // Authentication removed from environment for security
    // Credentials are now provided via frontend authentication
  };

  // Validate required environment variables
  const requiredVars = ['SWIPES_URL'] as const;
  const missingVars = requiredVars.filter(key => !env[key]);

  if (missingVars.length > 0) {
    console.warn(`⚠️  Missing required environment variables: ${missingVars.join(", ")}`);
  }

  console.log('✅ Environment initialized with browser-based session management');
  return env;
}

// Export validated environment variables
export const env = await createEnvironment();
