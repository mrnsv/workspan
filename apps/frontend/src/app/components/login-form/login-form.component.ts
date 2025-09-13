import { Component, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService, LoginCredentials } from '../../services/auth.service';

@Component({
  selector: 'app-login-form',
  templateUrl: './login-form.component.html',
  styleUrls: ['./login-form.component.scss']
})
export class LoginFormComponent {
  @Output() cookieRefreshed = new EventEmitter<void>();
  
  loginForm: FormGroup;
  hidePassword = true;
  isRefreshing = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private snackBar: MatSnackBar
  ) {
    this.loginForm = this.fb.group({
      loginId: ['', [Validators.required]],
      password: ['', [Validators.required]]
    });
  }

  onRefreshCookie() {
    if (this.loginForm.valid) {
      this.isRefreshing = true;
      const credentials: LoginCredentials = this.loginForm.value;
      
      this.authService.login(credentials).subscribe({
        next: (response) => {
          this.isRefreshing = false;
          if (response.success) {
            let successMessage = '✅ Authentication successful!';
            if (response.sessionData) {
              successMessage += ` Welcome, ${response.sessionData.employeeName} (${response.sessionData.employeeNumber})`;
            }
            this.showSnackBar(successMessage, 'success');
            this.cookieRefreshed.emit();
          } else {
            this.showSnackBar('❌ Authentication failed. Please verify your credentials.', 'error');
          }
        },
        error: (error) => {
          this.isRefreshing = false;
          const errorMessage = error.message || 'Authentication failed';
          this.showSnackBar(`❌ ${errorMessage}`, 'error');
        }
      });
    } else {
      this.showSnackBar('⚠️ Please complete all required fields', 'warn');
      this.markFormGroupTouched();
    }
  }

  onQuickRefresh() {
    // Quick refresh not available with simplified authentication
    this.showSnackBar('⚠️ Please enter your credentials to authenticate', 'warn');
  }

  private markFormGroupTouched() {
    Object.keys(this.loginForm.controls).forEach(key => {
      this.loginForm.get(key)?.markAsTouched();
    });
  }

  getErrorMessage(fieldName: string): string {
    const control = this.loginForm.get(fieldName);
    
    if (control?.hasError('required')) {
      return `${fieldName === 'loginId' ? 'Employee ID' : 'Password'} is required`;
    }
    
    return '';
  }

  // Professional Authentication Status Methods
  getAuthStatusClass(): string {
    if (this.isRefreshing) return 'authenticating';
    if (this.loginForm.valid) return 'ready';
    return 'standby';
  }

  getAuthStatusText(): string {
    if (this.isRefreshing) return 'AUTHENTICATING';
    if (this.loginForm.valid) return 'READY';
    return 'STANDBY';
  }

  getSyncProgress(): number {
    // Simulate sync progress for visual effect
    if (!this.isRefreshing) return 0;
    return Math.floor(Math.random() * 3) + 1;
  }

  private showSnackBar(message: string, type: 'success' | 'error' | 'warn' | 'info') {
    const config = {
      duration: 4000,
      panelClass: [`snackbar-${type}`, 'theme-snackbar'],
      horizontalPosition: 'right' as const,
      verticalPosition: 'bottom' as const
    };
    
    this.snackBar.open(message, 'Dismiss', config);
  }
}
