import { chromium, Browser, Page } from 'playwright';
import { promises as fs } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

// Get directory paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '../../../');
const outputPath = resolve(projectRoot, 'apps/env/cookies.json');

// Import shared environment
const { env } = await import('../../env/env.js');

interface CookieData {
  cookie: string;
  extractedAt: string;
  url: string;
  employeeId?: number;
  employeeName?: string;
  employeeNumber?: string;
}

class CookieExtractor {
  private browser: Browser | null = null;
  private page: Page | null = null;

  async init() {
    console.log('🚀 Initializing browser...');
    this.browser = await chromium.launch({ 
      headless: true,
      slowMo: 0
    });
    this.page = await this.browser.newPage();
    
    await this.page.setExtraHTTPHeaders({
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
  }

  async extractCookie(): Promise<CookieData | null> {
    if (!this.page) throw new Error('Page not initialized');

    const greythrUrl = env.GREYTHR_URL;
    const attendanceInfoUrl = env.ATTENDANCE_INFO_URL;
    const loginId = env.LOGIN_ID;
    const password = env.PASSWORD;

    if (!greythrUrl) {
      throw new Error('GREYTHR_URL not found in environment variables');
    }

    if (!attendanceInfoUrl) {
      throw new Error('ATTENDANCE_INFO_URL not found in environment variables');
    }

    // Set up request interception to capture headers and responses
    let capturedCookie = '';
    let employeeData: { employeeId?: number; employeeName?: string; employeeNumber?: string } = {};
    
    this.page.on('request', request => {
      const url = request.url();
      if (url.includes('swipes')) {
        const headers = request.headers();
        if (headers.cookie) {
          capturedCookie = headers.cookie;
          console.log(`🍪 Cookie captured from swipes API`);
        } else {
          // Fallback: get cookies from browser context
          this.page?.context().cookies().then(cookies => {
            const sessionCookies = cookies.filter(c => 
              c.name.includes('JSESSIONID') || 
              c.name.includes('access_token') ||
              c.name.includes('PLAY_SESSION') ||
              (c.value.length > 100 && !c.name.includes('csrf'))
            );
            
            if (sessionCookies.length > 0) {
              capturedCookie = sessionCookies.map(c => `${c.name}=${c.value}`).join('; ');
              console.log(`🍪 Cookie captured from browser context`);
            }
          });
        }
      }
    });

    // Set up response interception to capture login-status API response
    this.page.on('response', async response => {
      const url = response.url();
      if (url.includes('login-status')) {
        try {
          const responseData = await response.json();
          if (responseData?.user) {
            const user = responseData.user;
            employeeData = {
              employeeId: user.employeeId,
              employeeName: user.actualName,
              employeeNumber: user.userName
            };
            console.log(`👤 Employee data captured: ${user.actualName} (${user.userName})`);
          }
        } catch (error) {
          console.log(`⚠️ Could not parse login-status response`);
        }
      }
    });

    try {
      // Navigate to GREYTHR_URL first
      await this.page.goto(greythrUrl, { 
        waitUntil: 'domcontentloaded',
        timeout: 20000
      });

      const currentUrl = this.page.url();
      console.log(`🔍 Current URL: ${currentUrl}`);

      // Check if we need to login
      const needsLogin = currentUrl.includes('login') || 
                        currentUrl.includes('auth') ||
                        currentUrl === 'https://waydot.greythr.com/';

      if (needsLogin) {
        console.log('🔐 Authentication required');
        
        if (!loginId || !password) {
          throw new Error('LOGIN_ID or PASSWORD not found in environment variables');
        }

        // Navigate to login page if not already there
        if (!currentUrl.includes('login')) {
          await this.page.goto('https://waydot.greythr.com/uas/portal/auth/login', { 
            waitUntil: 'domcontentloaded',
            timeout: 15000 
          });
        }

        await this.performLogin(loginId, password);
        
        // Handle OAuth callback flow
        const postLoginUrl = this.page.url();
        if (postLoginUrl.includes('#access_token=') || postLoginUrl.includes('callback')) {
          console.log('🔄 Completing OAuth callback flow...');
          await this.page.waitForTimeout(1500);
          
          try {
            await this.page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 3000 });
          } catch (error) {
            // Continue if no automatic redirect
          }
        }

        // Wait for login-status API
        await this.page.waitForTimeout(2000);
      }

      // Navigate to ATTENDANCE_INFO_URL to trigger swipes API
      console.log(`📍 Navigating to attendance page`);
      await this.page.goto(attendanceInfoUrl, { 
        waitUntil: 'domcontentloaded',
        timeout: 15000 
      });
      
      // Wait for swipes API to be triggered
      await this.page.waitForTimeout(3000);

      if (capturedCookie) {
        const cookieData: CookieData = {
          cookie: capturedCookie,
          extractedAt: new Date().toISOString(),
          url: this.page.url(),
          ...employeeData
        };

        await this.saveCookie(cookieData);
        console.log('✅ Cookie successfully extracted and saved!');
        
        if (employeeData.employeeId) {
          console.log(`👤 Employee: ${employeeData.employeeName} (${employeeData.employeeNumber})`);
        }
        
        return cookieData;
      } else {
        console.log('❌ No cookie found');
        return null;
      }

    } catch (error) {
      console.error('❌ Error during navigation:', error);
      throw error;
    }
  }

  async performLogin(loginId: string, password: string) {
    if (!this.page) throw new Error('Page not initialized');

    console.log(`🔑 Attempting login with ID: ${loginId}`);

    try {
      // Wait for login form
      await this.page.waitForSelector('input[name="username"]', { timeout: 8000 });

      // Fill login credentials
      await this.page.fill('input[name="username"]', loginId);
      console.log('✅ Login ID filled');

      await this.page.fill('input[name="password"]', password);
      console.log('✅ Password filled');

      // Submit form
      await this.page.click('button[type="submit"]');
      console.log('🔘 Submit button clicked');

      // Wait for navigation after login
      await this.page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 10000 });
      console.log('✅ Login completed successfully');

    } catch (error) {
      console.error('❌ Login failed:', error);
      throw new Error(`Login failed: ${error}`);
    }
  }

  async saveCookie(cookieData: CookieData) {
    try {
      await fs.writeFile(outputPath, JSON.stringify(cookieData, null, 2), 'utf8');
      console.log(`💾 Cookie saved to: ${outputPath}`);
    } catch (error) {
      console.error('❌ Error saving cookie:', error);
      throw error;
    }
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
      console.log('🧹 Browser closed');
    }
  }
}

async function main() {
  const extractor = new CookieExtractor();
  
  try {
    await extractor.init();
    const result = await extractor.extractCookie();
    
    if (result) {
      console.log('🎉 Cookie extraction completed successfully!');
      console.log(`📄 Cookie length: ${result.cookie.length} characters`);
      console.log(`⏰ Extracted at: ${result.extractedAt}`);
    } else {
      console.log('⚠️ Cookie extraction failed');
      process.exit(1);
    }
  } catch (error) {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  } finally {
    await extractor.cleanup();
  }
}

// Run the main function
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

