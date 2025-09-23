import { Component, OnInit, OnDestroy } from '@angular/core';
import { ThemeService, Theme } from '../../services/theme.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-theme-switcher',
  templateUrl: './theme-switcher.component.html',
  styleUrls: ['./theme-switcher.component.scss']
})
export class ThemeSwitcherComponent implements OnInit, OnDestroy {
  availableThemes: Theme[] = [];
  currentTheme: Theme | null = null;
  isDropdownOpen = false;
  
  private destroy$ = new Subject<void>();

  constructor(private themeService: ThemeService) {}

  ngOnInit(): void {
    this.availableThemes = this.themeService.availableThemes;
    
    this.themeService.currentTheme$
      .pipe(takeUntil(this.destroy$))
      .subscribe(theme => {
        this.currentTheme = theme;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggleDropdown(): void {
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  selectTheme(theme: Theme): void {
    this.themeService.setTheme(theme.name);
    this.isDropdownOpen = false;
  }

  closeDropdown(): void {
    this.isDropdownOpen = false;
  }

  onBlur(): void {
    // Small delay to allow click events to process
    setTimeout(() => {
      this.isDropdownOpen = false;
    }, 200);
  }

  getThemeDescription(themeName: string): string {
    const descriptions: { [key: string]: string } = {
      'cyberpunk': 'Futuristic neon aesthetic',
      'dark': 'Modern dark interface',
      'light': 'Clean bright design',
      'neon': 'Electric retro vibe',
      'forest': 'Natural green tones',
      'ocean': 'Calming blue depths'
    };
    return descriptions[themeName] || 'Custom theme';
  }
}
