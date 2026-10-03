import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceSubtle: string;
  primary: string;
  primaryContrast: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  inputBackground: string;
  border: string;
  borderSubtle: string;
  cardBackground: string;
  cardBorder: string;

  // Functional Status Colors (used strictly where functional)
  emergency: string;
  emergencyBg: string;
  emergencyBorder: string;
  success: string;
  successBg: string;
  warning: string;
  warningBg: string;
  info: string;
  infoBg: string;
}

export const lightColors: ThemeColors = {
  background: '#F5F5F5',
  surface: '#FFFFFF',
  surfaceSubtle: '#F0F0F0',
  primary: '#000000',
  primaryContrast: '#FFFFFF',
  text: '#111111',
  textSecondary: '#777777',
  textMuted: '#999999',
  inputBackground: '#F2F2F2',
  border: '#D9D9D9',
  borderSubtle: '#EAEAEA',
  cardBackground: '#FFFFFF',
  cardBorder: '#D9D9D9',

  // Functional Status
  emergency: '#DC2626',
  emergencyBg: '#FEF2F2',
  emergencyBorder: '#FCA5A5',
  success: '#16A34A',
  successBg: '#F0FDF4',
  warning: '#D97706',
  warningBg: '#FFFBEB',
  info: '#2563EB',
  infoBg: '#EFF6FF',
};

export const darkColors: ThemeColors = {
  background: '#171717',
  surface: '#242424',
  surfaceSubtle: '#1C1C1C',
  primary: '#FFFFFF',
  primaryContrast: '#000000',
  text: '#FFFFFF',
  textSecondary: '#A3A3A3',
  textMuted: '#666666',
  inputBackground: '#1F1F1F',
  border: '#3A3A3A',
  borderSubtle: '#2A2A2A',
  cardBackground: '#242424',
  cardBorder: '#3A3A3A',

  // Functional Status
  emergency: '#EF4444',
  emergencyBg: '#2D1414',
  emergencyBorder: '#7F1D1D',
  success: '#22C55E',
  successBg: '#132819',
  warning: '#F59E0B',
  warningBg: '#2E200C',
  info: '#3B82F6',
  infoBg: '#132238',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const borderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
};

export const typography = {
  pageTitle: {
    fontSize: 26,
    fontWeight: '700' as const,
    letterSpacing: -0.5,
  },
  criticalValue: {
    fontSize: 36,
    fontWeight: '700' as const,
    letterSpacing: -1,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '600' as const,
    letterSpacing: -0.2,
  },
  body: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
  },
  bodyMedium: {
    fontSize: 14,
    fontWeight: '500' as const,
    lineHeight: 20,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
  },
  captionMedium: {
    fontSize: 12,
    fontWeight: '600' as const,
    lineHeight: 16,
  },
  label: {
    fontSize: 11,
    fontWeight: '600' as const,
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
  },
};

export type ThemeMode = 'light' | 'dark' | 'system';

export interface ThemeContextType {
  theme: 'light' | 'dark';
  colors: ThemeColors;
  isDark: boolean;
  mode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const THEME_STORAGE_KEY = 'bustrack_theme_mode_v1';

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  colors: lightColors,
  isDark: false,
  mode: 'system',
  setThemeMode: () => {},
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [mode, setMode] = useState<ThemeMode>('system');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY).then((stored) => {
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        setMode(stored);
      }
      setIsLoaded(true);
    }).catch(() => {
      setIsLoaded(true);
    });
  }, []);

  const setThemeMode = (newMode: ThemeMode) => {
    setMode(newMode);
    AsyncStorage.setItem(THEME_STORAGE_KEY, newMode).catch(() => {});
  };

  const toggleTheme = () => {
    const nextMode = activeTheme === 'dark' ? 'light' : 'dark';
    setThemeMode(nextMode);
  };

  const activeTheme: 'light' | 'dark' =
    mode === 'system'
      ? systemColorScheme === 'dark'
        ? 'dark'
        : 'light'
      : mode;

  const colors = activeTheme === 'dark' ? darkColors : lightColors;
  const isDark = activeTheme === 'dark';

  return React.createElement(
    ThemeContext.Provider,
    {
      value: {
        theme: activeTheme,
        colors,
        isDark,
        mode,
        setThemeMode,
        toggleTheme,
      },
    },
    children
  );
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
