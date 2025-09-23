import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface Theme {
  name: string;
  displayName: string;
  cssClass: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    warning: string;
    success: string;
    error: string;
    bgPrimary: string;
    bgSecondary: string;
    bgTertiary: string;
    border: string;
    borderAccent: string;
    glass: string;
    glassHover: string;
    text: string;
    selectedText: string;
    // Additional color variants for specific use cases
    glowPrimary: string;
    glowSecondary: string;
    glowAccent: string;
    shadowPrimary: string;
    shadowSecondary: string;
    shadowAccent: string;
      overlayDark: string;
      overlayLight: string;
      progressBarBackground: string;
      progressBarFill: string;
      progressBarFillSecondary: string;
      // Notification/Toast styling
      notificationBackground: string;
      notificationText: string;
      notificationBorder: string;
      notificationShadow: string;
      notificationSuccessBorder: string;
      notificationSuccessShadow: string;
      notificationErrorBorder: string;
      notificationErrorShadow: string;
      notificationWarningBorder: string;
      notificationWarningShadow: string;
      notificationInfoBorder: string;
      notificationInfoShadow: string;
      notificationActionHover: string;
      // Additional component-specific colors
      componentAccent: string;
      componentAccentHover: string;
      componentAccentLight: string;
      componentSuccess: string;
      componentSuccessLight: string;
      componentError: string;
      componentErrorLight: string;
      componentWarning: string;
      componentWarningLight: string;
      componentInfo: string;
      componentInfoLight: string;
      componentBorder: string;
      componentShadow: string;
      componentShadowHover: string;
      componentGlow: string;
      componentGlowHover: string;
      // Tooltip styling
      tooltipBackground: string;
      tooltipText: string;
      tooltipBorder: string;
      tooltipShadow: string;
  };
  typography: {
    fontFamily: string;
    fontFamilySecondary: string;
    fontSizeXs: string;
    fontSizeSm: string;
    fontSizeBase: string;
    fontSizeLg: string;
    fontSizeXl: string;
    fontSize2xl: string;
    fontSize3xl: string;
    fontSize4xl: string;
    fontWeightNormal: string;
    fontWeightMedium: string;
    fontWeightBold: string;
    fontWeightBlack: string;
    letterSpacingTight: string;
    letterSpacingNormal: string;
    letterSpacingWide: string;
    lineHeightTight: string;
    lineHeightNormal: string;
    lineHeightRelaxed: string;
    // Notification/Toast typography
    notificationFontFamily: string;
    notificationFontWeight: string;
    notificationFontSize: string;
    notificationLetterSpacing: string;
    notificationTextTransform: string;
    notificationActionFontWeight: string;
    notificationActionFontSize: string;
    // Additional component-specific typography
    componentFontFamily: string;
    componentFontWeightLight: string;
    componentFontWeightMedium: string;
    componentFontWeightSemiBold: string;
    componentFontWeightBold: string;
    componentFontWeightExtraBold: string;
    componentFontSizeXs: string;
    componentFontSizeSm: string;
    componentFontSizeMd: string;
    componentFontSizeLg: string;
    componentFontSizeXl: string;
    componentFontSize2xl: string;
    componentFontSize3xl: string;
    componentLetterSpacingTight: string;
    componentLetterSpacingNormal: string;
    componentLetterSpacingWide: string;
    componentLetterSpacingWider: string;
      componentLineHeightTight: string;
      componentLineHeightNormal: string;
      componentLineHeightRelaxed: string;
      componentLineHeightLoose: string;
      // Tooltip typography
      tooltipFontFamily: string;
      tooltipFontWeight: string;
      tooltipFontSize: string;
      tooltipLetterSpacing: string;
      tooltipLineHeight: string;
  };
}

export const AVAILABLE_THEMES: Theme[] = [
  {
    name: 'light',
    displayName: 'Light',
    cssClass: 'theme-light',
    colors: {
      primary: '#2563eb',
      secondary: '#64748b',
      accent: '#dc2626',
      warning: '#f59e0b',
      success: '#059669',
      error: '#dc2626',
      bgPrimary: '#ffffff',
      bgSecondary: '#f8fafc',
      bgTertiary: '#f1f5f9',
      border: 'rgba(15, 23, 42, 0.08)',
      borderAccent: 'rgba(37, 99, 235, 0.2)',
      glass: 'rgba(15, 23, 42, 0.02)',
      glassHover: 'rgba(15, 23, 42, 0.05)',
      text: '#0f172a',
      selectedText: '#ffffff',
      glowPrimary: 'rgba(37, 99, 235, 0.15)',
      glowSecondary: 'rgba(100, 116, 139, 0.15)',
      glowAccent: 'rgba(220, 38, 38, 0.15)',
      shadowPrimary: 'rgba(37, 99, 235, 0.1)',
      shadowSecondary: 'rgba(100, 116, 139, 0.1)',
      shadowAccent: 'rgba(220, 38, 38, 0.1)',
      overlayDark: 'rgba(15, 23, 42, 0.75)',
      overlayLight: 'rgba(15, 23, 42, 0.05)',
      progressBarBackground: 'rgba(15, 23, 42, 0.15)',
      progressBarFill: '#1d4ed8',
      progressBarFillSecondary: '#3b82f6',
      // Notification/Toast styling
      notificationBackground: 'rgba(255, 255, 255, 0.95)',
      notificationText: '#0f172a',
      notificationBorder: 'rgba(37, 99, 235, 0.2)',
      notificationShadow: '0 4px 20px rgba(0, 0, 0, 0.1), 0 0 10px rgba(37, 99, 235, 0.1)',
      notificationSuccessBorder: '#059669',
      notificationSuccessShadow: '0 4px 20px rgba(0, 0, 0, 0.1), 0 0 10px rgba(5, 150, 105, 0.2)',
      notificationErrorBorder: '#dc2626',
      notificationErrorShadow: '0 4px 20px rgba(0, 0, 0, 0.1), 0 0 10px rgba(220, 38, 38, 0.2)',
      notificationWarningBorder: '#f59e0b',
      notificationWarningShadow: '0 4px 20px rgba(0, 0, 0, 0.1), 0 0 10px rgba(245, 158, 11, 0.2)',
      notificationInfoBorder: '#2563eb',
      notificationInfoShadow: '0 4px 20px rgba(0, 0, 0, 0.1), 0 0 10px rgba(37, 99, 235, 0.2)',
      notificationActionHover: 'rgba(37, 99, 235, 0.1)',
      // Additional component-specific colors
      componentAccent: '#2563eb',
      componentAccentHover: 'rgba(37, 99, 235, 0.1)',
      componentAccentLight: 'rgba(37, 99, 235, 0.05)',
      componentSuccess: '#059669',
      componentSuccessLight: 'rgba(5, 150, 105, 0.05)',
      componentError: '#dc2626',
      componentErrorLight: 'rgba(220, 38, 38, 0.05)',
      componentWarning: '#f59e0b',
      componentWarningLight: 'rgba(245, 158, 11, 0.05)',
      componentInfo: '#2563eb',
      componentInfoLight: 'rgba(37, 99, 235, 0.05)',
      componentBorder: 'rgba(15, 23, 42, 0.08)',
      componentShadow: '0 4px 15px rgba(37, 99, 235, 0.1)',
      componentShadowHover: '0 4px 15px rgba(37, 99, 235, 0.2)',
      componentGlow: 'rgba(37, 99, 235, 0.3)',
      componentGlowHover: 'rgba(37, 99, 235, 0.5)',
      // Tooltip styling
      tooltipBackground: 'rgba(15, 23, 42, 0.9)',
      tooltipText: '#ffffff',
      tooltipBorder: 'rgba(37, 99, 235, 0.3)',
      tooltipShadow: '0 4px 12px rgba(0, 0, 0, 0.15), 0 0 8px rgba(37, 99, 235, 0.2)'
    },
    typography: {
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      fontFamilySecondary: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      fontSizeXs: '0.75rem',
      fontSizeSm: '0.875rem',
      fontSizeBase: '1rem',
      fontSizeLg: '1.125rem',
      fontSizeXl: '1.25rem',
      fontSize2xl: '1.5rem',
      fontSize3xl: '1.875rem',
      fontSize4xl: '2.25rem',
      fontWeightNormal: '400',
      fontWeightMedium: '500',
      fontWeightBold: '600',
      fontWeightBlack: '700',
      letterSpacingTight: '-0.025em',
      letterSpacingNormal: '0',
      letterSpacingWide: '0.025em',
      lineHeightTight: '1.25',
      lineHeightNormal: '1.5',
      lineHeightRelaxed: '1.75',
      // Notification/Toast typography
      notificationFontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      notificationFontWeight: '500',
      notificationFontSize: '0.875rem',
      notificationLetterSpacing: '0.025em',
      notificationTextTransform: 'none',
      notificationActionFontWeight: '600',
      notificationActionFontSize: '1rem',
      // Additional component-specific typography
      componentFontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      componentFontWeightLight: '400',
      componentFontWeightMedium: '500',
      componentFontWeightSemiBold: '600',
      componentFontWeightBold: '700',
      componentFontWeightExtraBold: '900',
      componentFontSizeXs: '0.6rem',
      componentFontSizeSm: '0.7rem',
      componentFontSizeMd: '0.8rem',
      componentFontSizeLg: '1rem',
      componentFontSizeXl: '1.2rem',
      componentFontSize2xl: '1.5rem',
      componentFontSize3xl: '2rem',
      componentLetterSpacingTight: '0.3px',
      componentLetterSpacingNormal: '0.5px',
      componentLetterSpacingWide: '1px',
      componentLetterSpacingWider: '1.2px',
      componentLineHeightTight: '1',
      componentLineHeightNormal: '1.2',
      componentLineHeightRelaxed: '1.4',
      componentLineHeightLoose: '1.6',
      // Tooltip typography
      tooltipFontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      tooltipFontWeight: '500',
      tooltipFontSize: '0.75rem',
      tooltipLetterSpacing: '0.025em',
      tooltipLineHeight: '1.4'
    }
  },
  {
    name: 'dark',
    displayName: 'Dark',
    cssClass: 'theme-dark',
    colors: {
      primary: '#bb86fc',
      secondary: '#03dac6',
      accent: '#cf6679',
      warning: '#ffb74d',
      success: '#4caf50',
      error: '#f44336',
      bgPrimary: '#121212',
      bgSecondary: '#1e1e1e',
      bgTertiary: '#2d2d2d',
      border: 'rgba(255, 255, 255, 0.12)',
      borderAccent: 'rgba(187, 134, 252, 0.5)',
      glass: 'rgba(255, 255, 255, 0.05)',
      glassHover: 'rgba(255, 255, 255, 0.1)',
      text: '#ffffff',
      selectedText: '#000000',
      glowPrimary: 'rgba(187, 134, 252, 0.3)',
      glowSecondary: 'rgba(3, 218, 198, 0.3)',
      glowAccent: 'rgba(207, 102, 121, 0.3)',
      shadowPrimary: 'rgba(187, 134, 252, 0.2)',
      shadowSecondary: 'rgba(3, 218, 198, 0.2)',
      shadowAccent: 'rgba(207, 102, 121, 0.2)',
      overlayDark: 'rgba(0, 0, 0, 0.85)',
      overlayLight: 'rgba(255, 255, 255, 0.1)',
      progressBarBackground: 'rgba(255, 255, 255, 0.1)',
      progressBarFill: '#bb86fc',
      progressBarFillSecondary: '#03dac6',
      // Notification/Toast styling
      notificationBackground: 'rgba(0, 0, 0, 0.85)',
      notificationText: '#bb86fc',
      notificationBorder: 'rgba(187, 134, 252, 0.5)',
      notificationShadow: '0 4px 20px rgba(0, 0, 0, 0.5), 0 0 10px rgba(187, 134, 252, 0.2)',
      notificationSuccessBorder: '#4caf50',
      notificationSuccessShadow: '0 4px 20px rgba(0, 0, 0, 0.5), 0 0 10px rgba(76, 175, 80, 0.3)',
      notificationErrorBorder: '#f44336',
      notificationErrorShadow: '0 4px 20px rgba(0, 0, 0, 0.5), 0 0 10px rgba(244, 67, 54, 0.3)',
      notificationWarningBorder: '#ffb74d',
      notificationWarningShadow: '0 4px 20px rgba(0, 0, 0, 0.5), 0 0 10px rgba(255, 183, 77, 0.3)',
      notificationInfoBorder: '#03dac6',
      notificationInfoShadow: '0 4px 20px rgba(0, 0, 0, 0.5), 0 0 10px rgba(3, 218, 198, 0.3)',
      notificationActionHover: 'rgba(3, 218, 198, 0.1)',
      // Additional component-specific colors
      componentAccent: '#03dac6',
      componentAccentHover: 'rgba(3, 218, 198, 0.1)',
      componentAccentLight: 'rgba(3, 218, 198, 0.05)',
      componentSuccess: '#4caf50',
      componentSuccessLight: 'rgba(76, 175, 80, 0.05)',
      componentError: '#f44336',
      componentErrorLight: 'rgba(244, 67, 54, 0.05)',
      componentWarning: '#ffb74d',
      componentWarningLight: 'rgba(255, 183, 77, 0.05)',
      componentInfo: '#03dac6',
      componentInfoLight: 'rgba(3, 218, 198, 0.05)',
      componentBorder: 'rgba(255, 255, 255, 0.12)',
      componentShadow: '0 4px 15px rgba(3, 218, 198, 0.2)',
      componentShadowHover: '0 4px 15px rgba(3, 218, 198, 0.3)',
      componentGlow: 'rgba(3, 218, 198, 0.4)',
      componentGlowHover: 'rgba(3, 218, 198, 0.6)',
      // Tooltip styling
      tooltipBackground: 'rgba(0, 0, 0, 0.9)',
      tooltipText: '#bb86fc',
      tooltipBorder: 'rgba(3, 218, 198, 0.3)',
      tooltipShadow: '0 4px 12px rgba(0, 0, 0, 0.3), 0 0 8px rgba(3, 218, 198, 0.2)'
    },
    typography: {
      fontFamily: "'Orbitron', monospace",
      fontFamilySecondary: "'Orbitron', monospace",
      fontSizeXs: '0.75rem',
      fontSizeSm: '0.875rem',
      fontSizeBase: '1rem',
      fontSizeLg: '1.125rem',
      fontSizeXl: '1.25rem',
      fontSize2xl: '1.5rem',
      fontSize3xl: '1.875rem',
      fontSize4xl: '2.25rem',
      fontWeightNormal: '400',
      fontWeightMedium: '500',
      fontWeightBold: '700',
      fontWeightBlack: '900',
      letterSpacingTight: '-0.025em',
      letterSpacingNormal: '0',
      letterSpacingWide: '0.025em',
      lineHeightTight: '1.25',
      lineHeightNormal: '1.5',
      lineHeightRelaxed: '1.75',
      // Notification/Toast typography
      notificationFontFamily: "'Orbitron', monospace",
      notificationFontWeight: '600',
      notificationFontSize: '0.875rem',
      notificationLetterSpacing: '0.5px',
      notificationTextTransform: 'uppercase',
      notificationActionFontWeight: '700',
      notificationActionFontSize: '1rem',
      // Additional component-specific typography
      componentFontFamily: "'Orbitron', monospace",
      componentFontWeightLight: '400',
      componentFontWeightMedium: '500',
      componentFontWeightSemiBold: '600',
      componentFontWeightBold: '700',
      componentFontWeightExtraBold: '900',
      componentFontSizeXs: '0.6rem',
      componentFontSizeSm: '0.7rem',
      componentFontSizeMd: '0.8rem',
      componentFontSizeLg: '1rem',
      componentFontSizeXl: '1.2rem',
      componentFontSize2xl: '1.5rem',
      componentFontSize3xl: '2rem',
      componentLetterSpacingTight: '0.3px',
      componentLetterSpacingNormal: '0.5px',
      componentLetterSpacingWide: '1px',
      componentLetterSpacingWider: '1.2px',
      componentLineHeightTight: '1',
      componentLineHeightNormal: '1.2',
      componentLineHeightRelaxed: '1.4',
      componentLineHeightLoose: '1.6',
      // Tooltip typography
      tooltipFontFamily: "'Orbitron', monospace",
      tooltipFontWeight: '600',
      tooltipFontSize: '0.75rem',
      tooltipLetterSpacing: '0.05em',
      tooltipLineHeight: '1.4'
    }
  },
  {
    name: 'cyberpunk',
    displayName: 'Cyberpunk',
    cssClass: 'theme-cyberpunk',
    colors: {
      primary: '#79ffe8',
      secondary: '#ff5c5c',
      accent: '#48e6ff',
      warning: '#ffff00',
      success: '#00ff41',
      error: '#ff5c5c',
      bgPrimary: '#190b0f',
      bgSecondary: '#0f0b0d',
      bgTertiary: '#071216',
      border: 'rgba(255, 0, 0, 0.4)',
      borderAccent: 'rgba(72, 230, 255, 0.5)',
      glass: 'rgba(128, 0, 0, 0.15)',
      glassHover: 'rgba(128, 0, 0, 0.3)',
      text: '#79ffe8',
      selectedText: '#000000',
      glowPrimary: 'rgba(121, 255, 232, 0.3)',
      glowSecondary: 'rgba(255, 92, 92, 0.3)',
      glowAccent: 'rgba(72, 230, 255, 0.3)',
      shadowPrimary: 'rgba(121, 255, 232, 0.2)',
      shadowSecondary: 'rgba(255, 92, 92, 0.2)',
      shadowAccent: 'rgba(72, 230, 255, 0.2)',
      overlayDark: 'rgba(0, 0, 0, 0.75)',
      overlayLight: 'rgba(128, 0, 0, 0.1)',
      progressBarBackground: 'rgba(255, 92, 92, 0.2)',
      progressBarFill: '#ff5c5c',
      progressBarFillSecondary: '#48e6ff',
      // Notification/Toast styling
      notificationBackground: 'rgba(0, 0, 0, 0.85)',
      notificationText: '#79ffe8',
      notificationBorder: 'rgba(72, 230, 255, 0.5)',
      notificationShadow: '0 4px 20px rgba(0, 0, 0, 0.5), 0 0 10px rgba(121, 255, 232, 0.2)',
      notificationSuccessBorder: '#00ff41',
      notificationSuccessShadow: '0 4px 20px rgba(0, 0, 0, 0.5), 0 0 10px rgba(0, 255, 65, 0.3)',
      notificationErrorBorder: '#ff5c5c',
      notificationErrorShadow: '0 4px 20px rgba(0, 0, 0, 0.5), 0 0 10px rgba(255, 92, 92, 0.3)',
      notificationWarningBorder: '#ffff00',
      notificationWarningShadow: '0 4px 20px rgba(0, 0, 0, 0.5), 0 0 10px rgba(255, 255, 0, 0.3)',
      notificationInfoBorder: '#48e6ff',
      notificationInfoShadow: '0 4px 20px rgba(0, 0, 0, 0.5), 0 0 10px rgba(72, 230, 255, 0.3)',
      notificationActionHover: 'rgba(72, 230, 255, 0.1)',
      // Additional component-specific colors
      componentAccent: '#48e6ff',
      componentAccentHover: 'rgba(72, 230, 255, 0.1)',
      componentAccentLight: 'rgba(72, 230, 255, 0.05)',
      componentSuccess: '#00ff41',
      componentSuccessLight: 'rgba(0, 255, 65, 0.05)',
      componentError: '#ff5c5c',
      componentErrorLight: 'rgba(255, 92, 92, 0.05)',
      componentWarning: '#ffff00',
      componentWarningLight: 'rgba(255, 255, 0, 0.05)',
      componentInfo: '#48e6ff',
      componentInfoLight: 'rgba(72, 230, 255, 0.05)',
      componentBorder: 'rgba(255, 0, 0, 0.4)',
      componentShadow: '0 4px 15px rgba(72, 230, 255, 0.2)',
      componentShadowHover: '0 4px 15px rgba(72, 230, 255, 0.4)',
      componentGlow: 'rgba(72, 230, 255, 0.4)',
      componentGlowHover: 'rgba(72, 230, 255, 0.8)',
      // Tooltip styling
      tooltipBackground: 'rgba(0, 0, 0, 0.9)',
      tooltipText: '#79ffe8',
      tooltipBorder: 'rgba(72, 230, 255, 0.3)',
      tooltipShadow: '0 4px 12px rgba(0, 0, 0, 0.3), 0 0 8px rgba(72, 230, 255, 0.2)'
    },
    typography: {
      fontFamily: "'Orbitron', monospace",
      fontFamilySecondary: "'Orbitron', monospace",
      fontSizeXs: '0.75rem',
      fontSizeSm: '0.875rem',
      fontSizeBase: '1rem',
      fontSizeLg: '1.125rem',
      fontSizeXl: '1.25rem',
      fontSize2xl: '1.5rem',
      fontSize3xl: '1.875rem',
      fontSize4xl: '2.25rem',
      fontWeightNormal: '400',
      fontWeightMedium: '500',
      fontWeightBold: '700',
      fontWeightBlack: '900',
      letterSpacingTight: '-0.025em',
      letterSpacingNormal: '0',
      letterSpacingWide: '0.025em',
      lineHeightTight: '1.25',
      lineHeightNormal: '1.5',
      lineHeightRelaxed: '1.75',
      // Notification/Toast typography
      notificationFontFamily: "'Orbitron', monospace",
      notificationFontWeight: '600',
      notificationFontSize: '0.875rem',
      notificationLetterSpacing: '0.5px',
      notificationTextTransform: 'uppercase',
      notificationActionFontWeight: '700',
      notificationActionFontSize: '1rem',
      // Additional component-specific typography
      componentFontFamily: "'Orbitron', monospace",
      componentFontWeightLight: '400',
      componentFontWeightMedium: '500',
      componentFontWeightSemiBold: '600',
      componentFontWeightBold: '700',
      componentFontWeightExtraBold: '900',
      componentFontSizeXs: '0.6rem',
      componentFontSizeSm: '0.7rem',
      componentFontSizeMd: '0.8rem',
      componentFontSizeLg: '1rem',
      componentFontSizeXl: '1.2rem',
      componentFontSize2xl: '1.5rem',
      componentFontSize3xl: '2rem',
      componentLetterSpacingTight: '0.3px',
      componentLetterSpacingNormal: '0.5px',
      componentLetterSpacingWide: '1px',
      componentLetterSpacingWider: '1.2px',
      componentLineHeightTight: '1',
      componentLineHeightNormal: '1.2',
      componentLineHeightRelaxed: '1.4',
      componentLineHeightLoose: '1.6',
      // Tooltip typography
      tooltipFontFamily: "'Orbitron', monospace",
      tooltipFontWeight: '600',
      tooltipFontSize: '0.75rem',
      tooltipLetterSpacing: '0.05em',
      tooltipLineHeight: '1.4'
    }
  }
];

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly STORAGE_KEY = 'workspan-theme';
  private currentThemeSubject = new BehaviorSubject<Theme>(AVAILABLE_THEMES[0]);
  
  constructor() {
    this.loadThemeFromStorage();
  }

  get currentTheme$(): Observable<Theme> {
    return this.currentThemeSubject.asObservable();
  }

  get currentTheme(): Theme {
    return this.currentThemeSubject.value;
  }

  get availableThemes(): Theme[] {
    return AVAILABLE_THEMES;
  }

  setTheme(themeName: string): void {
    const theme = AVAILABLE_THEMES.find(t => t.name === themeName);
    if (theme) {
      this.applyTheme(theme);
      this.currentThemeSubject.next(theme);
      this.saveThemeToStorage(theme);
    }
  }

  private applyTheme(theme: Theme): void {
    // Remove existing theme classes
    document.body.className = document.body.className
      .split(' ')
      .filter(className => !className.startsWith('theme-'))
      .join(' ');
    
    // Add new theme class
    document.body.classList.add(theme.cssClass);
    
    // Update CSS custom properties for colors
    const root = document.documentElement;
    Object.entries(theme.colors).forEach(([key, value]) => {
      const cssVar = this.camelToKebab(key);
      root.style.setProperty(`--cp-${cssVar}`, value);
    });
    
    // Update CSS custom properties for typography
    Object.entries(theme.typography).forEach(([key, value]) => {
      const cssVar = this.camelToKebab(key);
      root.style.setProperty(`--cp-${cssVar}`, value);
    });
  }

  private camelToKebab(str: string): string {
    return str.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
  }

  private loadThemeFromStorage(): void {
    try {
      const savedTheme = localStorage.getItem(this.STORAGE_KEY);
      if (savedTheme) {
        const theme = AVAILABLE_THEMES.find(t => t.name === savedTheme);
        if (theme) {
          this.applyTheme(theme);
          this.currentThemeSubject.next(theme);
          return;
        }
      }
    } catch (error) {
      console.warn('Failed to load theme from storage:', error);
    }
    
    // Apply default theme
    this.applyTheme(AVAILABLE_THEMES[0]);
  }

  private saveThemeToStorage(theme: Theme): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, theme.name);
    } catch (error) {
      console.warn('Failed to save theme to storage:', error);
    }
  }

  isDarkTheme(): boolean {
    const theme = this.currentTheme;
    return theme.name === 'cyberpunk' || theme.name === 'dark';
  }

  isLightTheme(): boolean {
    return !this.isDarkTheme();
  }

  getThemeColor(colorKey: keyof Theme['colors']): string {
    return this.currentTheme.colors[colorKey];
  }
}
