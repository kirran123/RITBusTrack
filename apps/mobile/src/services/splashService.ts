/**
 * splashService.ts
 *
 * Centralized splash screen helper for BusTrack mobile app.
 * Provides idempotent, crash-safe initSplash() and hideSplash().
 */
import * as SplashScreen from 'expo-splash-screen';
import { Platform } from 'react-native';

let isHidden = false;

export function initSplash(): void {
  if (Platform.OS === 'web') return;
  try {
    SplashScreen.preventAutoHideAsync().catch(() => {});
  } catch {}
}

export function hideSplash(): void {
  if (Platform.OS === 'web') return;
  try {
    SplashScreen.hideAsync()
      .then(() => {
        isHidden = true;
      })
      .catch(() => {});
  } catch {}

  // Multi-tier fallback retries to ensure native splash NEVER stays stuck on Android
  if (!isHidden) {
    setTimeout(() => {
      try { SplashScreen.hideAsync().catch(() => {}); } catch {}
    }, 150);
    setTimeout(() => {
      try { SplashScreen.hideAsync().catch(() => {}); } catch {}
    }, 450);
  }
}

