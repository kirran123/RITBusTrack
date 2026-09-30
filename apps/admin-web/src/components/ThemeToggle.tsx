import React from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface ThemeToggleProps {
  variant?: 'pill' | 'button' | 'segmented';
  className?: string;
  showLabel?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  variant = 'pill',
  className = '',
  showLabel = false,
}) => {
  const { theme, themePreference, setTheme, toggleTheme } = useTheme();

  const isDark = theme === 'dark';

  if (variant === 'segmented') {
    return (
      <div
        role="group"
        aria-label="Theme selector"
        className={`inline-flex items-center p-1 rounded-xl bg-slate-900/10 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 ${className}`}
      >
        <button
          type="button"
          onClick={() => setTheme('light')}
          aria-label="Set light theme"
          aria-pressed={themePreference === 'light'}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            themePreference === 'light'
              ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm border border-slate-200/80 dark:border-slate-700'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Sun className="w-3.5 h-3.5" />
          <span>Light</span>
        </button>

        <button
          type="button"
          onClick={() => setTheme('dark')}
          aria-label="Set dark theme"
          aria-pressed={themePreference === 'dark'}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            themePreference === 'dark'
              ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm border border-slate-200/80 dark:border-slate-700'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Moon className="w-3.5 h-3.5" />
          <span>Dark</span>
        </button>

        <button
          type="button"
          onClick={() => setTheme('system')}
          aria-label="Set system theme"
          aria-pressed={themePreference === 'system'}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            themePreference === 'system'
              ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm border border-slate-200/80 dark:border-slate-700'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Monitor className="w-3.5 h-3.5" />
          <span>System</span>
        </button>
      </div>
    );
  }

  if (variant === 'button') {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        className={`p-2 rounded-xl transition-all duration-200 border cursor-pointer flex items-center justify-center ${
          isDark
            ? 'bg-slate-800/80 border-slate-700/80 text-amber-400 hover:bg-slate-700/80 hover:text-amber-300'
            : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200 hover:text-slate-900'
        } ${className}`}
      >
        {isDark ? (
          <Sun className="w-5 h-5 transition-transform duration-300 rotate-0 hover:rotate-45" />
        ) : (
          <Moon className="w-5 h-5 transition-transform duration-300 -rotate-12 hover:rotate-0" />
        )}
        {showLabel && (
          <span className="ml-2 text-xs font-bold">
            {isDark ? 'Light Mode' : 'Dark Mode'}
          </span>
        )}
      </button>
    );
  }

  // Default 'pill' variant: Modern animated toggle switch with Sun & Moon icons
  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? 'Dark theme active. Click to switch to light theme' : 'Light theme active. Click to switch to dark theme'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={toggleTheme}
      onKeyDown={(e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          toggleTheme();
        }
      }}
      className={`relative inline-flex items-center h-8 w-15 rounded-full p-1 transition-colors duration-300 ease-in-out cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
        isDark
          ? 'bg-slate-800 border border-slate-700 shadow-inner'
          : 'bg-slate-200 border border-slate-300 shadow-inner'
      } ${className}`}
    >
      <span className="sr-only">Toggle theme</span>

      {/* Background icon hints */}
      <span className="absolute left-1.5 text-amber-500 flex items-center pointer-events-none">
        <Sun className={`w-3.5 h-3.5 transition-opacity duration-200 ${isDark ? 'opacity-40' : 'opacity-100'}`} />
      </span>
      <span className="absolute right-1.5 text-blue-400 flex items-center pointer-events-none">
        <Moon className={`w-3.5 h-3.5 transition-opacity duration-200 ${isDark ? 'opacity-100' : 'opacity-40'}`} />
      </span>

      {/* Sliding indicator puck */}
      <span
        className={`inline-flex items-center justify-center w-6 h-6 rounded-full shadow-md transform transition-transform duration-300 ease-in-out ${
          isDark
            ? 'translate-x-7 bg-slate-900 border border-slate-700 text-blue-300'
            : 'translate-x-0 bg-white border border-slate-200 text-amber-500'
        }`}
      >
        {isDark ? (
          <Moon className="w-3.5 h-3.5 transition-transform duration-300 -rotate-12" />
        ) : (
          <Sun className="w-3.5 h-3.5 transition-transform duration-300 rotate-0" />
        )}
      </span>

      {showLabel && (
        <span className="ml-3 text-xs font-bold text-slate-700 dark:text-slate-200">
          {isDark ? 'Dark' : 'Light'}
        </span>
      )}
    </button>
  );
};
