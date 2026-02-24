// vscode-extension/webview/src/marketplace/useVSCodeTheme.ts

import { useState, useEffect } from 'react';

export type VSCodeTheme = 'light' | 'dark' | 'hc-light' | 'hc-dark';

export interface VSCodeColors {
  background: string;
  foreground: string;
  cardBackground: string;
  cardBorder: string;
  textPrimary: string;
  textSecondary: string;
  inputBackground: string;
  inputBorder: string;
  buttonPrimary: string;
  buttonPrimaryHover: string;
  shadow: string;
  shadowHover: string;
}

const colorSchemes: Record<VSCodeTheme, VSCodeColors> = {
  light: {
    background: 'var(--vscode-editor-background)',
    foreground: 'var(--vscode-editor-foreground)',
    cardBackground: 'var(--vscode-editor-background)',
    cardBorder: 'var(--vscode-sideBar-border)',
    textPrimary: 'var(--vscode-editor-foreground)',
    textSecondary: 'var(--vscode-descriptionForeground)',
    inputBackground: 'var(--vscode-input-background)',
    inputBorder: 'var(--vscode-input-border)',
    buttonPrimary: 'var(--vscode-button-background)',
    buttonPrimaryHover: 'var(--vscode-button-hoverBackground)',
    shadow: 'rgba(0, 0, 0, 0.08)',
    shadowHover: 'rgba(0, 0, 0, 0.15)'
  },
  dark: {
    background: 'var(--vscode-editor-background)',
    foreground: 'var(--vscode-editor-foreground)',
    cardBackground: 'var(--vscode-sideBar-background)',
    cardBorder: 'var(--vscode-sideBar-border)',
    textPrimary: 'var(--vscode-sideBar-foreground)',
    textSecondary: 'var(--vscode-descriptionForeground)',
    inputBackground: 'var(--vscode-input-background)',
    inputBorder: 'var(--vscode-input-border)',
    buttonPrimary: 'var(--vscode-button-background)',
    buttonPrimaryHover: 'var(--vscode-button-hoverBackground)',
    shadow: 'rgba(0, 0, 0, 0.2)',
    shadowHover: 'rgba(0, 0, 0, 0.4)'
  },
  'hc-light': {
    background: 'var(--vscode-editor-background)',
    foreground: 'var(--vscode-editor-foreground)',
    cardBackground: 'var(--vscode-editor-background)',
    cardBorder: 'var(--vscode-contrastActiveBorder)',
    textPrimary: 'var(--vscode-editor-foreground)',
    textSecondary: 'var(--vscode-descriptionForeground)',
    inputBackground: 'var(--vscode-editor-background)',
    inputBorder: 'var(--vscode-contrastActiveBorder)',
    buttonPrimary: 'var(--vscode-button-background)',
    buttonPrimaryHover: 'var(--vscode-button-hoverBackground)',
    shadow: 'transparent',
    shadowHover: 'transparent'
  },
  'hc-dark': {
    background: 'var(--vscode-editor-background)',
    foreground: 'var(--vscode-editor-foreground)',
    cardBackground: 'var(--vscode-editor-background)',
    cardBorder: 'var(--vscode-contrastActiveBorder)',
    textPrimary: 'var(--vscode-editor-foreground)',
    textSecondary: 'var(--vscode-descriptionForeground)',
    inputBackground: 'var(--vscode-editor-background)',
    inputBorder: 'var(--vscode-contrastActiveBorder)',
    buttonPrimary: 'var(--vscode-button-background)',
    buttonPrimaryHover: 'var(--vscode-button-hoverBackground)',
    shadow: 'transparent',
    shadowHover: 'transparent'
  }
};

export function useVSCodeTheme(): VSCodeTheme {
  const [theme, setTheme] = useState<VSCodeTheme>('dark');

  useEffect(() => {
    const detectTheme = () => {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setTheme(isDark ? 'dark' : 'light');
    };
    detectTheme();
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', detectTheme);
    return () => {
      window.matchMedia('(prefers-color-scheme: dark)').removeEventListener('change', detectTheme);
    };
  }, []);

  return theme;
}

export function getVSCodeColors(theme: VSCodeTheme): VSCodeColors {
  return colorSchemes[theme] || colorSchemes.dark;
}
