import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export type UserRole = 'driver' | 'student' | 'staff';
export type MobilePortalRole = UserRole;

export interface UserSession {
  role: UserRole;
  user: any;
  savedAt: number;
}

const STORAGE_KEYS = {
  ACTIVE_SESSION: '@bustrack_active_session_v1',
  STUDENT_PROFILE: 'bustrack_current_mobile_student',
  STAFF_PROFILE: 'bustrack_current_mobile_staff',
  DRIVER_PROFILE: 'bustrack_current_mobile_driver',
  NOTIFICATIONS: 'bustrack_notifications_v1',
};

class AuthStorageService {
  /**
   * Persist active user session across app restarts, reboots, and background terminations
   */
  async saveSession(role: UserRole, user: any): Promise<void> {
    try {
      const sessionData: UserSession = {
        role,
        user,
        savedAt: Date.now(),
      };
      const jsonStr = JSON.stringify(sessionData);

      // 1. Save to AsyncStorage (Native Android / iOS persistent storage)
      await AsyncStorage.setItem(STORAGE_KEYS.ACTIVE_SESSION, jsonStr);

      // Also persist role-specific profile key
      if (role === 'student') {
        await AsyncStorage.setItem(STORAGE_KEYS.STUDENT_PROFILE, JSON.stringify(user));
      } else if (role === 'staff') {
        await AsyncStorage.setItem(STORAGE_KEYS.STAFF_PROFILE, JSON.stringify(user));
      } else if (role === 'driver') {
        await AsyncStorage.setItem(STORAGE_KEYS.DRIVER_PROFILE, JSON.stringify(user));
      }

      // 2. Also mirror to localStorage for Web / Electron
      if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEYS.ACTIVE_SESSION, jsonStr);
        if (role === 'student') {
          localStorage.setItem(STORAGE_KEYS.STUDENT_PROFILE, JSON.stringify(user));
        } else if (role === 'staff') {
          localStorage.setItem(STORAGE_KEYS.STAFF_PROFILE, JSON.stringify(user));
        } else if (role === 'driver') {
          localStorage.setItem(STORAGE_KEYS.DRIVER_PROFILE, JSON.stringify(user));
        }
      }
    } catch (error) {
      console.warn('AuthStorageService saveSession error:', error);
    }
  }

  /**
   * Retrieve active session if logged in
   */
  async getSession(): Promise<UserSession | null> {
    try {
      // 1. Try AsyncStorage (Primary for mobile Android/iOS)
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.ACTIVE_SESSION);
      if (raw) {
        return JSON.parse(raw);
      }

      // 2. Fallback to localStorage on Web
      if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        const webRaw = localStorage.getItem(STORAGE_KEYS.ACTIVE_SESSION);
        if (webRaw) {
          return JSON.parse(webRaw);
        }
      }

      return null;
    } catch (error) {
      console.warn('AuthStorageService getSession error:', error);
      return null;
    }
  }

  /**
   * Clears session ONLY when the user explicitly clicks the Sign Out / Logout button
   */
  async clearSession(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.ACTIVE_SESSION);
      await AsyncStorage.removeItem(STORAGE_KEYS.STUDENT_PROFILE);
      await AsyncStorage.removeItem(STORAGE_KEYS.STAFF_PROFILE);
      await AsyncStorage.removeItem(STORAGE_KEYS.DRIVER_PROFILE);

      if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        localStorage.removeItem(STORAGE_KEYS.ACTIVE_SESSION);
        localStorage.removeItem(STORAGE_KEYS.STUDENT_PROFILE);
        localStorage.removeItem(STORAGE_KEYS.STAFF_PROFILE);
        localStorage.removeItem(STORAGE_KEYS.DRIVER_PROFILE);
      }
    } catch (error) {
      console.warn('AuthStorageService clearSession error:', error);
    }
  }

  /**
   * Generic key-value helpers for cross-platform persistence
   */
  async getItem(key: string): Promise<string | null> {
    try {
      const val = await AsyncStorage.getItem(key);
      if (val !== null) return val;
      if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        return localStorage.getItem(key);
      }
      return null;
    } catch {
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      await AsyncStorage.setItem(key, value);
      if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        localStorage.setItem(key, value);
      }
    } catch (e) {
      console.warn('AuthStorageService setItem error:', e);
    }
  }
}

export const authStorage = new AuthStorageService();
