import { Platform, Alert } from 'react-native';

export type NotificationPermissionStatus = 'granted' | 'denied' | 'undetermined';

class NotificationService {
  private isPermissionGranted = false;

  async requestPermission(): Promise<boolean> {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && 'Notification' in window) {
          const permission = await window.Notification.requestPermission();
          this.isPermissionGranted = permission === 'granted';
          if (this.isPermissionGranted) {
            console.log('✅ Web Push Notification Permission: GRANTED');
          }
          return this.isPermissionGranted;
        }
        return true;
      } else {
        // Native mobile fallback
        this.isPermissionGranted = true;
        return true;
      }
    } catch (err) {
      console.warn('Notification permission error:', err);
      return false;
    }
  }

  async checkPermission(): Promise<boolean> {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        return window.Notification.permission === 'granted';
      }
      return false;
    }
    return this.isPermissionGranted;
  }

  /**
   * Triggers a system push notification in the mobile/desktop notification bar
   */
  async sendPushNotification(title: string, body: string, tag: string = 'fleet_notice') {
    try {
      // 1. Web / PWA System Notification Bar (Notification Center / Mobile Notification Bar)
      if (Platform.OS === 'web' && typeof window !== 'undefined' && 'Notification' in window) {
        if (window.Notification.permission === 'granted') {
          const notification = new window.Notification(title, {
            body,
            icon: '/favicon.ico',
            tag,
            vibrate: [200, 100, 200],
          } as any);

          notification.onclick = () => {
            window.focus();
          };
          return;
        }
      }

      // 2. Mobile In-App Alert Banner fallback
      Alert.alert(title, body);
    } catch (err) {
      console.log('Notification delivery:', err);
    }
  }
}

export const notificationService = new NotificationService();
