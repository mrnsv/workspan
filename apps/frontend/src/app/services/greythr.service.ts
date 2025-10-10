import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

export interface GreytHRSession {
  employeeId: number;
  employeeName: string;
  employeeNumber: string;
  cookies: string;
  domain: string;
  extractedAt: string;
}

export interface GreytHRApiResponse {
  success: boolean;
  data?: any;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class GreytHRService {
  private readonly GREYTHR_DOMAIN = 'https://waydot.greythr.com';
  private readonly GREYTHR_LOGIN_URL = `${this.GREYTHR_DOMAIN}/uas/portal/auth/login`;                                                                       
  private readonly GREYTHR_ATTENDANCE_URL = `${this.GREYTHR_DOMAIN}/v3/portal/ess/attendance/attendance-info`;
  
  private sessionSubject = new BehaviorSubject<GreytHRSession | null>(null);
  public session$ = this.sessionSubject.asObservable();
  
  private currentSession: GreytHRSession | null = null;

  constructor(private http: HttpClient) {
    this.loadSessionFromStorage();
  }

  /**
   * Open GreytHR login in popup and detect login success
   */
  async authenticateWithPopup(): Promise<GreytHRSession> {
    return new Promise((resolve, reject) => {
      // Open popup window
      const popup = window.open(
        this.GREYTHR_LOGIN_URL,
        'greythr-login',
        'width=800,height=600,scrollbars=yes,resizable=yes'
      );

      if (!popup) {
        reject(new Error('Popup blocked. Please allow popups for this site.'));
        return;
      }

      console.log('🔐 GreytHR popup opened, monitoring for login success...');

      let loginDetected = false;
      let attempts = 0;
      const maxAttempts = 60; // 60 seconds

      // Monitor popup URL changes (this works across origins)
      const checkInterval = setInterval(() => {
        attempts++;
        
        try {
          // Check if popup is closed
          if (popup.closed) {
            clearInterval(checkInterval);
            reject(new Error('Login cancelled by user'));
            return;
          }

          // Try to access popup URL (this might fail due to CORS, but we can try)
          let currentUrl = '';
          try {
            currentUrl = popup.location.href;
          } catch (e) {
            // CORS error - this is expected, continue monitoring
            console.log('🔍 Check #' + attempts + ' - CORS blocked, continuing...');
          }

          console.log('🔍 Check #' + attempts + ' - URL:', currentUrl);

          // Check if we're on a logged-in page
          if (currentUrl.includes('/portal/') || currentUrl.includes('/ess/') || 
              currentUrl.includes('/attendance/') || currentUrl.includes('/dashboard') ||
              currentUrl.includes('/home') || currentUrl.includes('/profile')) {
            
            if (!loginDetected) {
              console.log('✅ Login success detected! Showing cookie capture modal...');
              loginDetected = true;
              clearInterval(checkInterval);
              
              // Show manual cookie capture modal
              this.showCookieCaptureModal(popup, resolve, reject);
            }
          }

          // Stop checking after max attempts
          if (attempts >= maxAttempts) {
            console.log('⏰ Max attempts reached, showing manual capture option...');
            clearInterval(checkInterval);
            
            // Show manual capture modal as fallback
            this.showCookieCaptureModal(popup, resolve, reject);
          }

        } catch (error) {
          console.log('⚠️ Error in monitoring loop:', error);
        }
      }, 1000);

      // Timeout after 5 minutes
      setTimeout(() => {
        clearInterval(checkInterval);
        if (!popup.closed && !loginDetected) {
          console.log('⏰ Timeout reached, showing manual capture...');
          this.showCookieCaptureModal(popup, resolve, reject);
        }
      }, 300000);
    });
  }

  /**
   * Show cookie capture modal when login is detected
   */
  private showCookieCaptureModal(popup: Window, resolve: Function, reject: Function): void {
    console.log('📋 Showing cookie capture modal...');
    
    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      z-index: 10000;
      display: flex;
      justify-content: center;
      align-items: center;
    `;

    // Create modal content
    const modal = document.createElement('div');
    modal.style.cssText = `
      background: white;
      padding: 2rem;
      border-radius: 12px;
      max-width: 600px;
      width: 90%;
      max-height: 80vh;
      overflow-y: auto;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    `;

    modal.innerHTML = `
      <h2 style="margin-top: 0; color: #333;">🍪 Cookie Capture Required</h2>
      <div style="background: #e8f5e8; padding: 1rem; border-radius: 8px; margin-bottom: 1rem; border-left: 4px solid #28a745;">
        <strong>✅ Login Successful!</strong><br>
        Now we need to capture your session cookies to access your work hours data.
      </div>
      
      <div style="background: #f0f8ff; padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">
        <strong>📋 Quick Steps:</strong><br>
        1. In the popup window, press <strong>F12</strong> to open Developer Tools<br>
        2. Go to <strong>Application</strong> tab → <strong>Cookies</strong> → <strong>https://waydot.greythr.com</strong><br>
        3. Copy ALL cookie values (right-click → Copy)<br>
        4. Paste them below and fill in your details
      </div>
      
      <div style="margin-bottom: 1rem;">
        <label style="display: block; margin-bottom: 0.5rem; font-weight: bold;">🍪 Session Cookies:</label>
        <textarea id="cookieInput" placeholder="JSESSIONID=abc123; access_token=xyz789; PLAY_SESSION=def456; ..." 
                  style="width: 100%; height: 120px; padding: 0.5rem; border: 1px solid #ccc; border-radius: 4px; font-family: monospace; font-size: 12px;"></textarea>
        <small style="color: #666;">Include ALL cookies separated by semicolons</small>
      </div>
      
      <div style="margin-bottom: 1rem;">
        <label style="display: block; margin-bottom: 0.5rem; font-weight: bold;">👤 Employee ID:</label>
        <input type="number" id="employeeId" placeholder="12345" 
               style="width: 100%; padding: 0.5rem; border: 1px solid #ccc; border-radius: 4px;">
        <small style="color: #666;">Your employee ID number</small>
      </div>
      
      <div style="margin-bottom: 1rem;">
        <label style="display: block; margin-bottom: 0.5rem; font-weight: bold;">👤 Employee Name:</label>
        <input type="text" id="employeeName" placeholder="John Doe" 
               style="width: 100%; padding: 0.5rem; border: 1px solid #ccc; border-radius: 4px;">
        <small style="color: #666;">Your full name as shown in GreytHR</small>
      </div>
      
      <div style="margin-bottom: 1rem;">
        <label style="display: block; margin-bottom: 0.5rem; font-weight: bold;">👤 Employee Number:</label>
        <input type="text" id="employeeNumber" placeholder="EMP001" 
               style="width: 100%; padding: 0.5rem; border: 1px solid #ccc; border-radius: 4px;">
        <small style="color: #666;">Your employee code/number</small>
      </div>
      
      <div style="display: flex; gap: 1rem; justify-content: flex-end;">
        <button id="cancelBtn" style="padding: 0.5rem 1rem; border: 1px solid #ccc; background: white; border-radius: 4px; cursor: pointer;">Cancel</button>
        <button id="submitBtn" style="padding: 0.5rem 1rem; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">Submit & Connect</button>
      </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Add event listeners
    const cookieInput = modal.querySelector('#cookieInput') as HTMLTextAreaElement;
    const employeeIdInput = modal.querySelector('#employeeId') as HTMLInputElement;
    const employeeNameInput = modal.querySelector('#employeeName') as HTMLInputElement;
    const employeeNumberInput = modal.querySelector('#employeeNumber') as HTMLInputElement;
    const cancelBtn = modal.querySelector('#cancelBtn') as HTMLButtonElement;
    const submitBtn = modal.querySelector('#submitBtn') as HTMLButtonElement;

    const cleanup = () => {
      document.body.removeChild(overlay);
      if (!popup.closed) {
        popup.close();
      }
    };

    cancelBtn.onclick = () => {
      cleanup();
      reject(new Error('Authentication cancelled by user'));
    };

    submitBtn.onclick = () => {
      const cookies = cookieInput.value.trim();
      const employeeId = parseInt(employeeIdInput.value.trim());
      const employeeName = employeeNameInput.value.trim();
      const employeeNumber = employeeNumberInput.value.trim();

      if (!cookies || !employeeId || !employeeName || !employeeNumber) {
        alert('Please fill in all fields');
        return;
      }

      try {
        const session: GreytHRSession = {
          employeeId,
          employeeName,
          employeeNumber,
          cookies,
          domain: this.GREYTHR_DOMAIN,
          extractedAt: new Date().toISOString()
        };

        console.log('✅ Session created:', session);
        this.saveSession(session);
        cleanup();
        resolve(session);
      } catch (error) {
        alert('Invalid session data. Please check your input.');
      }
    };

    // Close popup when modal is closed
    overlay.onclick = (e) => {
      if (e.target === overlay) {
        cleanup();
        reject(new Error('Authentication cancelled by user'));
      }
    };
  }


  /**
   * Make direct API call to GreytHR swipes endpoint
   */
  getSwipes(employeeId: number, startDate: string, endDate: string = ''): Observable<any> {
    if (!this.currentSession) {
      return throwError(() => new Error('No active session. Please login first.'));
    }

    const url = `${this.GREYTHR_DOMAIN}/latte/v3/attendance/info/${employeeId}/swipes`;
    const params = new URLSearchParams({
      startDate,
      endDate,
      systemSwipes: 'true',
      swipePairs: 'true'
    });

    const headers = new HttpHeaders({
      'Cookie': this.currentSession.cookies,
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
      'Accept': 'application/json',
      'Accept-Language': 'en,en-IN;q=0.9',
      'X-Requested-With': 'XMLHttpRequest',
      'Referer': this.GREYTHR_ATTENDANCE_URL,
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'same-origin'
    });

    return this.http.get(`${url}?${params}`, { headers }).pipe(
      catchError(error => {
        console.error('GreytHR Swipes API Error:', error);
        if (error.status === 403 || error.status === 401) {
          // Session expired, clear it
          this.clearSession();
          return throwError(() => new Error('Session expired. Please login again.'));
        }
        return throwError(() => new Error(`API call failed: ${error.status} ${error.statusText}`));
      })
    );
  }

  /**
   * Make direct API call to GreytHR total hours endpoint
   */
  getTotalHours(employeeId: number, startDate: string, endDate: string): Observable<any> {
    if (!this.currentSession) {
      return throwError(() => new Error('No active session. Please login first.'));
    }

    const url = `${this.GREYTHR_DOMAIN}/latte/v3/attendance/info/table/${employeeId}/total`;
    const params = new URLSearchParams({ startDate, endDate });

    const headers = new HttpHeaders({
      'Cookie': this.currentSession.cookies,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    });

    return this.http.get(`${url}?${params}`, { headers }).pipe(
      catchError(error => {
        console.error('GreytHR Total Hours API Error:', error);
        if (error.status === 403 || error.status === 401) {
          this.clearSession();
          return throwError(() => new Error('Session expired. Please login again.'));
        }
        return throwError(() => new Error(`API call failed: ${error.status} ${error.statusText}`));
      })
    );
  }

  /**
   * Make direct API call to GreytHR insights endpoint
   */
  getInsights(employeeId: number, startDate: string, endDate: string): Observable<any> {
    if (!this.currentSession) {
      return throwError(() => new Error('No active session. Please login first.'));
    }

    const url = `${this.GREYTHR_DOMAIN}/latte/v3/attendance/info/${employeeId}/insights`;
    const params = new URLSearchParams({
      startDate,
      endDate,
      shiftType: 'regular_shift'
    });

    const headers = new HttpHeaders({
      'Cookie': this.currentSession.cookies,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    });

    return this.http.get(`${url}?${params}`, { headers }).pipe(
      catchError(error => {
        console.error('GreytHR Insights API Error:', error);
        if (error.status === 403 || error.status === 401) {
          this.clearSession();
          return throwError(() => new Error('Session expired. Please login again.'));
        }
        return throwError(() => new Error(`API call failed: ${error.status} ${error.statusText}`));
      })
    );
  }

  /**
   * Get current session data
   */
  getCurrentSession(): GreytHRSession | null {
    return this.currentSession;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.currentSession !== null;
  }

  /**
   * Save session to localStorage
   */
  public saveSession(session: GreytHRSession): void {
    localStorage.setItem('greythr_session', JSON.stringify(session));
    this.currentSession = session;
    this.sessionSubject.next(session);
  }

  /**
   * Load session from localStorage
   */
  private loadSessionFromStorage(): void {
    try {
      const stored = localStorage.getItem('greythr_session');
      if (stored) {
        const session: GreytHRSession = JSON.parse(stored);
        // Check if session is not too old (e.g., 24 hours)
        const sessionAge = Date.now() - new Date(session.extractedAt).getTime();
        if (sessionAge < 24 * 60 * 60 * 1000) {
          this.currentSession = session;
          this.sessionSubject.next(session);
        } else {
          this.clearSession();
        }
      }
    } catch (error) {
      console.warn('Failed to load GreytHR session from storage:', error);
      this.clearSession();
    }
  }

  /**
   * Test API connection with current session
   */
  testConnection(): Observable<any> {
    if (!this.currentSession) {
      return throwError(() => new Error('No active session. Please authenticate first.'));
    }

    // Try to make a simple API call to test the connection
    return this.getSwipes(this.currentSession.employeeId, new Date().toISOString().split('T')[0]).pipe(
      catchError(error => {
        console.error('Connection test failed:', error);
        return throwError(() => new Error(`Connection test failed: ${error.message}`));
      })
    );
  }

  /**
   * Get employee information from GreytHR (helper method)
   */
  getEmployeeInfo(): Observable<any> {
    if (!this.currentSession) {
      return throwError(() => new Error('No active session. Please authenticate first.'));
    }

    // This would typically call a user profile API endpoint
    // For now, we'll return the session data
    return of({
      employeeId: this.currentSession.employeeId,
      employeeName: this.currentSession.employeeName,
      employeeNumber: this.currentSession.employeeNumber
    });
  }

  /**
   * Clear session data
   */
  clearSession(): void {
    localStorage.removeItem('greythr_session');
    this.currentSession = null;
    this.sessionSubject.next(null);
  }
}
