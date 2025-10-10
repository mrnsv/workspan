import { Component, OnInit } from '@angular/core';
import { GreytHRService } from '../../services/greythr.service';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-greythr-auth',
  templateUrl: './greythr-auth.component.html',
  styleUrls: ['./greythr-auth.component.scss']
})
export class GreytHRAuthComponent implements OnInit {
  authStatus$: Observable<{ isAuthenticated: boolean; session: any }>;
  isAuthenticating = false;
  errorMessage = '';

  constructor(private greythrService: GreytHRService) {
    this.authStatus$ = this.greythrService.session$.pipe(
      map(session => ({
        isAuthenticated: !!session,
        session: session
      }))
    );
  }

  ngOnInit(): void {
    // Component initialization
  }

  async authenticate(): Promise<void> {
    this.isAuthenticating = true;
    this.errorMessage = '';

    try {
      await this.greythrService.authenticateWithPopup();
      // Test the connection after authentication
      this.testConnection();
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'Authentication failed';
      console.error('Authentication error:', error);
    } finally {
      this.isAuthenticating = false;
    }
  }

  // Manual capture method as fallback
  async manualCapture(): Promise<void> {
    this.isAuthenticating = true;
    this.errorMessage = '';

    try {
      // Open popup and show manual capture modal
      const popup = window.open(
        'https://waydot.greythr.com/uas/portal/auth/login',
        'greythr-login',
        'width=800,height=600,scrollbars=yes,resizable=yes'
      );

      if (!popup) {
        throw new Error('Popup blocked. Please allow popups for this site.');
      }

      // Show manual capture modal after 3 seconds
      setTimeout(() => {
        this.showManualCaptureModal(popup);
      }, 3000);

    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'Manual capture failed';
    } finally {
      this.isAuthenticating = false;
    }
  }

  private showManualCaptureModal(popup: Window): void {
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
      <h2 style="margin-top: 0; color: #333;">🔐 Manual Cookie Capture</h2>
      <div style="background: #f0f8ff; padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">
        <strong>Instructions:</strong><br>
        1. Complete login in the popup window<br>
        2. Press F12 → Application → Cookies → waydot.greythr.com<br>
        3. Copy ALL cookies and paste below<br>
        4. Fill in your employee details
      </div>
      
      <div style="margin-bottom: 1rem;">
        <label style="display: block; margin-bottom: 0.5rem; font-weight: bold;">Cookies:</label>
        <textarea id="cookieInput" placeholder="JSESSIONID=abc123; access_token=xyz789; ..." 
                  style="width: 100%; height: 120px; padding: 0.5rem; border: 1px solid #ccc; border-radius: 4px; font-family: monospace; font-size: 12px;"></textarea>
      </div>
      
      <div style="margin-bottom: 1rem;">
        <label style="display: block; margin-bottom: 0.5rem; font-weight: bold;">Employee ID:</label>
        <input type="number" id="employeeId" placeholder="12345" 
               style="width: 100%; padding: 0.5rem; border: 1px solid #ccc; border-radius: 4px;">
      </div>
      
      <div style="margin-bottom: 1rem;">
        <label style="display: block; margin-bottom: 0.5rem; font-weight: bold;">Employee Name:</label>
        <input type="text" id="employeeName" placeholder="John Doe" 
               style="width: 100%; padding: 0.5rem; border: 1px solid #ccc; border-radius: 4px;">
      </div>
      
      <div style="margin-bottom: 1rem;">
        <label style="display: block; margin-bottom: 0.5rem; font-weight: bold;">Employee Number:</label>
        <input type="text" id="employeeNumber" placeholder="EMP001" 
               style="width: 100%; padding: 0.5rem; border: 1px solid #ccc; border-radius: 4px;">
      </div>
      
      <div style="display: flex; gap: 1rem; justify-content: flex-end;">
        <button id="cancelBtn" style="padding: 0.5rem 1rem; border: 1px solid #ccc; background: white; border-radius: 4px; cursor: pointer;">Cancel</button>
        <button id="submitBtn" style="padding: 0.5rem 1rem; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">Submit</button>
      </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

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
        const session = {
          employeeId,
          employeeName,
          employeeNumber,
          cookies,
          domain: 'https://waydot.greythr.com',
          extractedAt: new Date().toISOString()
        };

        this.greythrService.saveSession(session);
        cleanup();
        this.testConnection();
      } catch (error) {
        alert('Invalid session data. Please check your input.');
      }
    };

    overlay.onclick = (e) => {
      if (e.target === overlay) {
        cleanup();
      }
    };
  }

  testConnection(): void {
    this.greythrService.testConnection().subscribe({
      next: () => {
        console.log('✅ Connection test successful');
      },
      error: (error) => {
        console.error('❌ Connection test failed:', error);
        this.errorMessage = 'Connection test failed. Please check your cookies and try again.';
      }
    });
  }

  logout(): void {
    this.greythrService.clearSession();
  }

  clearError(): void {
    this.errorMessage = '';
  }

  get isAuthenticated(): boolean {
    return this.greythrService.isAuthenticated();
  }

  showHelp(): void {
    const helpContent = `
🔐 GreytHR Authentication Help

AUTOMATIC AUTHENTICATION PROCESS:

STEP 1: Click "Connect to GreytHR"
• Opens a popup window with GreytHR login
• No manual steps required!

STEP 2: Complete Login
• Enter your GreytHR credentials
• Complete any 2FA if required
• The system automatically detects successful login

STEP 3: Automatic Capture
• Session cookies are automatically captured
• Employee information is extracted from the page
• Popup closes automatically when done

STEP 4: Ready to Use!
• You're now authenticated
• Work hours data will load automatically
• Session is stored securely in your browser

⚠️ IMPORTANT:
• Make sure popups are allowed for this site
• Complete the full login process in the popup
• Don't close the popup manually - let it close automatically

💡 TIPS:
• If authentication fails, try refreshing the page
• Check browser console for detailed logs
• Session expires after 24 hours for security
    `;

    alert(helpContent);
  }

  getSessionExpiry(extractedAt: string): string {
    if (!extractedAt) return 'Unknown';
    
    const extracted = new Date(extractedAt);
    const expiry = new Date(extracted.getTime() + 24 * 60 * 60 * 1000); // 24 hours
    return expiry.toLocaleString();
  }
}
