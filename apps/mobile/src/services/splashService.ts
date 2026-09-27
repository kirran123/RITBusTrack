/**
 * splashService.ts
 *
 * Centralized splash screen helper for BusTrack mobile app.
 * Provides idempotent, crash-safe initSplash() and hideSplash().
 */
import * as SplashScreen from 'expo-splash-screen';
import { Platform } from 'react-native';

export function initSplash(): void {
  if (Platform.OS === 'web') return;
  try {
    SplashScreen.preventAutoHideAsync().catch(() => {});
  } catch {}
}

export function hideSplash(): void {
  if (Platform.OS === 'web') return;
  try {
    SplashScreen.hideAsync().catch(() => {});
  } catch {}
}
