// This script runs in the GreytHR popup window
// It captures cookies and employee data after successful login

interface EmployeeData {
  employeeId: number;
  employeeName: string;
  employeeNumber: string;
}

interface CapturedSession {
  employeeId: number;
  employeeName: string;
  employeeNumber: string;
  cookies: string;
  domain: string;
  extractedAt: string;
}

class GreytHRPopupAuth {
  private readonly GREYTHR_DOMAIN = 'https://waydot.greythr.com';
  private readonly ATTENDANCE_INFO_URL = `${this.GREYTHR_DOMAIN}/v3/portal/ess/attendance/attendance-info`;

  constructor() {
    this.init();
  }

  private init(): void {
    console.log('🔐 GreytHR Popup Auth initialized');
    
    // Listen for successful login
    this.monitorLoginSuccess();
    
    // Monitor URL changes for successful authentication
    this.monitorUrlChanges();
  }

  private monitorLoginSuccess(): void {
    // Listen for login-status API response
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      
      if (args[0] && typeof args[0] === 'string' && args[0].includes('login-status')) {
        try {
          const responseClone = response.clone();
          const data = await responseClone.json();
          
          if (data?.user) {
            console.log('👤 Login successful, capturing session...');
            await this.captureSession(data.user);
          }
        } catch (error) {
          console.log('⚠️ Could not parse login-status response');
        }
      }
      
      return response;
    };
  }

  private monitorUrlChanges(): void {
    let currentUrl = window.location.href;
    
    const checkUrl = () => {
      if (window.location.href !== currentUrl) {
        currentUrl = window.location.href;
        
        // Check if we're on the attendance page (indicates successful login)
        if (currentUrl.includes('/attendance/attendance-info')) {
          console.log('📍 On attendance page, attempting to capture session...');
          this.attemptSessionCapture();
        }
      }
    };

    // Check URL every 500ms
    setInterval(checkUrl, 500);
  }

  private async attemptSessionCapture(): Promise<void> {
    try {
      // Wait a bit for the page to fully load
      await this.sleep(2000);
      
      // Try to get employee data from the page
      const employeeData = await this.extractEmployeeData();
      
      if (employeeData) {
        await this.captureSession(employeeData);
      } else {
        console.log('⚠️ Could not extract employee data from page');
      }
    } catch (error) {
      console.error('❌ Error capturing session:', error);
    }
  }

  private async extractEmployeeData(): Promise<EmployeeData | null> {
    try {
      // Try to extract employee data from various sources on the page
      
      // Method 1: Look for employee data in script tags
      const scripts = document.querySelectorAll('script');
      for (const script of scripts) {
        const content = script.textContent || '';
        if (content.includes('employeeId') && content.includes('actualName')) {
          try {
            // Try to parse JSON from script content
            const match = content.match(/\{.*"employeeId".*\}/);
            if (match) {
              const data = JSON.parse(match[0]);
              if (data.employeeId && data.actualName && data.userName) {
                return {
                  employeeId: data.employeeId,
                  employeeName: data.actualName,
                  employeeNumber: data.userName
                };
              }
            }
          } catch (e) {
            // Continue to next script
          }
        }
      }

      // Method 2: Look for data attributes
      const employeeElement = document.querySelector('[data-employee-id]');
      if (employeeElement) {
        const employeeId = employeeElement.getAttribute('data-employee-id');
        const employeeName = employeeElement.getAttribute('data-employee-name');
        const employeeNumber = employeeElement.getAttribute('data-employee-number');
        
        if (employeeId && employeeName && employeeNumber) {
          return {
            employeeId: parseInt(employeeId),
            employeeName: employeeName,
            employeeNumber: employeeNumber
          };
        }
      }

      // Method 3: Look for common patterns in the DOM
      const nameElements = document.querySelectorAll('[class*="name"], [class*="employee"]');
      for (const element of nameElements) {
        const text = element.textContent || '';
        if (text.includes('Employee') || text.includes('Name')) {
          // Try to extract employee info from text
          const match = text.match(/(\w+)\s*\((\d+)\)/);
          if (match) {
            // This is a fallback - we'll need the actual employee ID from API
            return {
              employeeId: 0, // Will be updated from API
              employeeName: match[1],
              employeeNumber: match[2]
            };
          }
        }
      }

      return null;
    } catch (error) {
      console.error('❌ Error extracting employee data:', error);
      return null;
    }
  }

  private async captureSession(employeeData: EmployeeData): Promise<void> {
    try {
      console.log('🍪 Capturing session cookies...');
      
      // Get all cookies for the current domain
      const cookies = document.cookie;
      
      if (!cookies) {
        throw new Error('No cookies found');
      }

      // Create session object
      const session: CapturedSession = {
        employeeId: employeeData.employeeId,
        employeeName: employeeData.employeeName,
        employeeNumber: employeeData.employeeNumber,
        cookies: cookies,
        domain: this.GREYTHR_DOMAIN,
        extractedAt: new Date().toISOString()
      };

      console.log('✅ Session captured:', {
        employeeName: session.employeeName,
        employeeNumber: session.employeeNumber,
        cookieLength: session.cookies.length
      });

      // Send session data to parent window
      if (window.opener) {
        window.opener.postMessage({
          type: 'GREYTHR_SESSION_CAPTURED',
          session: session
        }, '*');
        
        // Close the popup
        setTimeout(() => {
          window.close();
        }, 1000);
      } else {
        throw new Error('No parent window found');
      }

    } catch (error) {
      console.error('❌ Error capturing session:', error);
      
      // Send error to parent window
      if (window.opener) {
        window.opener.postMessage({
          type: 'GREYTHR_AUTH_ERROR',
          error: error.message
        }, '*');
      }
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new GreytHRPopupAuth();
  });
} else {
  new GreytHRPopupAuth();
}
