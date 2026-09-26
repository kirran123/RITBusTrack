import { Platform, PermissionsAndroid } from 'react-native';
import * as Notifications from 'expo-notifications';

export type NotificationPermissionStatus = 'granted' | 'denied' | 'undetermined';

// Configure foreground & background notification presentation on native
if (Platform.OS !== 'web') {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
        priority: Notifications.AndroidNotificationPriority.MAX,
      } as any),
    });
  } catch (e) {
    console.warn('Expo Notifications handler init:', e);
  }
}

class NotificationService {
  private isPermissionGranted = false;

  constructor() {
    if (Platform.OS === 'android') {
      setTimeout(() => {
        this.setupChannels().catch((e) => console.warn('Channel setup notice:', e));
      }, 500);
    }
  }

  private async setupChannels() {
    if (Platform.OS === 'android') {
      try {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Campus Bus Live Updates',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#2563eb',
          enableLights: true,
          enableVibrate: true,
          showBadge: true,
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        });

        await Notifications.setNotificationChannelAsync('emergency_sos', {
          name: '🚨 Critical Emergency SOS Alerts',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 500, 200, 500],
          lightColor: '#ef4444',
          enableLights: true,
          enableVibrate: true,
          showBadge: true,
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        });

        await Notifications.setNotificationChannelAsync('trip_status', {
          name: '🚌 Bus Departures & Trip Status',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#10b981',
          enableLights: true,
          enableVibrate: true,
          showBadge: true,
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        });
      } catch (e) {
        console.warn('Notification channel setup error:', e);
      }
    }
  }

  async requestPermission(): Promise<boolean> {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && 'Notification' in window) {
          const permission = await window.Notification.requestPermission();
          this.isPermissionGranted = permission === 'granted';
          return this.isPermissionGranted;
        }
        return true;
      } else {
        const { status: existingStatus } = await Notifications.getPermissionsAsync().catch(() => ({ status: 'undetermined' }));
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync({
            ios: {
              allowAlert: true,
              allowBadge: true,
              allowSound: true,
            },
          }).catch(() => ({ status: 'denied' }));
          finalStatus = status;
        }

        if (Platform.OS === 'android' && Platform.Version >= 33) {
          await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS).catch(() => {});
        }

        this.isPermissionGranted = finalStatus === 'granted';
        return this.isPermissionGranted;
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
      } else {
        const { status } = await Notifications.getPermissionsAsync().catch(() => ({ status: 'undetermined' }));
        return status === 'granted';
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
   * Triggers an instant system push notification in the mobile status bar / lockscreen AND in-app alert
   */
  async sendPushNotification(title: string, body: string, tag: string = 'fleet_notice', type: string = 'broadcast') {
    try {
      // 1. Notify in-app subscribers (dialogs, toasts, banner overlays)
      this.alertListeners.forEach(listener => {
        try {
          listener({ title, body, type });
        } catch {}
      });

      // 2. Mobile Native Notification Delivery (Direct to Android Status Bar & Heads-up Banner)
      if (Platform.OS !== 'web') {
        try {
          const channelId = type === 'emergency' || type === 'emergency_sos'
            ? 'emergency_sos'
            : type === 'trip' || type === 'trip_start' || type === 'trip_end'
            ? 'trip_status'
            : 'default';

          await Notifications.scheduleNotificationAsync({
            content: {
              title,
              body,
              sound: 'default',
              vibrate: [0, 250, 250, 250],
              data: { tag, type },
              color: type === 'emergency' || type === 'emergency_sos' ? '#ef4444' : '#2563eb',
            },
            trigger: null, // deliver immediately to status bar
          });
        } catch (nativeNotifErr) {
          console.warn('Native mobile status bar notification error:', nativeNotifErr);
        }
      }

      // 3. Web / PWA Desktop Notification Bar
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

