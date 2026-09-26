import { Platform, Alert, PermissionsAndroid } from 'react-native';

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
      } else if (Platform.OS === 'android') {
        if (Platform.Version >= 33) {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
            {
              title: 'Live Transport Notifications',
              message: 'Allow Bus Track to send real-time bus arrivals, schedule alerts, and transport notices.',
              buttonPositive: 'Allow',
              buttonNegative: 'Deny',
            }
          );
          this.isPermissionGranted = granted === PermissionsAndroid.RESULTS.GRANTED;
          return this.isPermissionGranted;
        } else {
          this.isPermissionGranted = true;
          return true;
        }
      } else {
        this.isPermissionGranted = true;
        return true;
      }
    } catch (err) {
      console.warn('Notification permission error:', err);
      return false;
    }
  }

  async checkPermission(): Promise<boolean> {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && 'Notification' in window) {
          return window.Notification.permission === 'granted';
        }
        return false;
      } else if (Platform.OS === 'android') {
        if (Platform.Version >= 33) {
          return await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
        }
        return true;
      }
    } catch (e) {
      console.warn('Check notification permission error:', e);
    }
    return this.isPermissionGranted;
  }

  private alertListeners: Set<(notif: { title: string; body: string; type?: string }) => void> = new Set();

  subscribeAlert(listener: (notif: { title: string; body: string; type?: string }) => void) {
    this.alertListeners.add(listener);
    return () => {
      this.alertListeners.delete(listener);
    };
  }

  /**
   * Triggers a system push notification in the mobile/desktop notification bar AND in-app alert
   */
  async sendPushNotification(title: string, body: string, tag: string = 'fleet_notice', type: string = 'broadcast') {
    try {
      // 1. Notify in-app subscribers (opens instant Alert Modal dialog on mobile screen)
      this.alertListeners.forEach(listener => {
        try {
          listener({ title, body, type });
        } catch {}
      });

      // 2. Play subtle alert notification sound/vibrate if available
      if (Platform.OS === 'web' && typeof window !== 'undefined' && (window.AudioContext || (window as any).webkitAudioContext)) {
        try {
          const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
          const ctx = new AudioCtx();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
          osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5
          gain.gain.setValueAtTime(0.2, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.35);
        } catch {}
      }

      // 3. Web / PWA System Notification Bar (Notification Center / Mobile Notification Bar)
      if (Platform.OS === 'web' && typeof window !== 'undefined' && 'Notification' in window) {
        if (window.Notification.permission === 'granted') {
          try {
            const notification = new window.Notification(title, {
              body,
              icon: '/favicon.ico',
              tag,
              vibrate: [200, 100, 200],
            } as any);

            notification.onclick = () => {
              window.focus();
            };
          } catch {}
        }
      }
    } catch (err) {
      console.log('Notification delivery error:', err);
    }
  }
}

export const notificationService = new NotificationService();

