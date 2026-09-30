import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';

export type Theme = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

interface ThemeContextType {
  theme: ResolvedTheme;
  themePreference: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const STORAGE_KEY = 'bustrack_theme';

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const getSystemTheme = (): ResolvedTheme => {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themePreference, setThemePreferenceState] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'dark';
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        return stored;
      }
    } catch (e) {
      console.warn('Failed to read theme preference from storage:', e);
    }
    return 'system';
  });

  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(getSystemTheme);

  // Listen to system OS theme changes
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light');
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else {
      mediaQuery.addListener(handleChange);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange);
      } else {
        mediaQuery.removeListener(handleChange);
      }
    };
  }, []);

  // Listen to cross-tab storage changes
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        const val = e.newValue as Theme | null;
        if (val === 'light' || val === 'dark' || val === 'system') {
          setThemePreferenceState(val);
        }
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Resolved active theme ('light' or 'dark')
  const resolvedTheme: ResolvedTheme = useMemo(() => {
    if (themePreference === 'system') {
      return systemTheme;
    }
    return themePreference;
  }, [themePreference, systemTheme]);

  // Synchronize DOM elements (HTML class, data-theme attribute, meta theme-color)
  useEffect(() => {
    const root = document.documentElement;

    if (resolvedTheme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
      root.setAttribute('data-theme', 'dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
      root.setAttribute('data-theme', 'light');
      root.style.colorScheme = 'light';
    }

    // Update browser navigation toolbar color
    let metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (!metaThemeColor) {
      metaThemeColor = document.createElement('meta');
      metaThemeColor.setAttribute('name', 'theme-color');
      document.head.appendChild(metaThemeColor);
    }
    metaThemeColor.setAttribute('content', resolvedTheme === 'dark' ? '#090d16' : '#ffffff');
  }, [resolvedTheme]);

  const setTheme = (newTheme: Theme) => {
    try {
      localStorage.setItem(STORAGE_KEY, newTheme);
    } catch (e) {
      console.warn('Failed to save theme to storage:', e);
    }
    setThemePreferenceState(newTheme);
  };

  const toggleTheme = () => {
    const nextTheme: ResolvedTheme = resolvedTheme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
  };

  const value = useMemo(
    () => ({
      theme: resolvedTheme,
      themePreference,
      setTheme,
      toggleTheme,
    }),
    [resolvedTheme, themePreference]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
