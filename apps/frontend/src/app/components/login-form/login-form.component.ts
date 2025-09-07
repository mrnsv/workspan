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
      
      this.authService.refreshCookie(credentials).subscribe({
        next: (response) => {
          this.isRefreshing = false;
          if (response.success) {
            this.showSnackBar('🍪 Cookie refreshed successfully!', 'success');
            this.cookieRefreshed.emit();
          } else {
            this.showSnackBar('❌ Failed to refresh cookie', 'error');
          }
        },
        error: (error) => {
          this.isRefreshing = false;
          console.error('Cookie refresh error:', error);
          this.showSnackBar('❌ Cookie refresh failed', 'error');
        }
      });
    } else {
      this.showSnackBar('⚠️ Please fill in both fields', 'warn');
      this.markFormGroupTouched();
    }
  }

  onQuickRefresh() {
    this.isRefreshing = true;
    
    // Simulate quick refresh without credentials update
    this.authService.refreshCookie().subscribe({
      next: (response) => {
        this.isRefreshing = false;
        this.showSnackBar('🔄 Cookie refreshed with existing credentials', 'success');
        this.cookieRefreshed.emit();
      },
      error: (error) => {
        this.isRefreshing = false;
        this.showSnackBar('❌ Quick refresh failed', 'error');
      }
    });
  }

  private markFormGroupTouched() {
    Object.keys(this.loginForm.controls).forEach(key => {
      this.loginForm.get(key)?.markAsTouched();
    });
  }

  getErrorMessage(fieldName: string): string {
    const control = this.loginForm.get(fieldName);
    
    if (control?.hasError('required')) {
      return `${fieldName === 'loginId' ? 'NEURAL ID' : 'ACCESS CODE'} REQUIRED`;
    }
    
    return '';
  }

  // Cyberpunk UI Methods
  getAuthStatusClass(): string {
    if (this.isRefreshing) return 'syncing';
    if (this.loginForm.valid) return 'ready';
    return 'standby';
  }

  getAuthStatusText(): string {
    if (this.isRefreshing) return 'SYNCING';
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
      panelClass: [`snackbar-${type}`, 'cyberpunk-snackbar'],
      horizontalPosition: 'right' as const,
      verticalPosition: 'bottom' as const
    };
    
    this.snackBar.open(message.toUpperCase(), 'X', config);
  }
}
