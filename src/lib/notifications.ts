import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

export const NotificationService = {
  async requestPermissions() {
    if (Capacitor.isNativePlatform()) {
      const permission = await LocalNotifications.requestPermissions();
      return permission.display === 'granted';
    } else if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return true;
  },

  async scheduleNotification(id: number, title: string, body: string, scheduleAt: Date) {
    if (Capacitor.isNativePlatform()) {
      try {
        await LocalNotifications.schedule({
          notifications: [
            {
              title,
              body,
              id,
              schedule: { at: scheduleAt },
              sound: 'default',
            },
          ],
        });
      } catch (error) {
        console.error('Error scheduling native notification:', error);
      }
    } else if ('Notification' in window && Notification.permission === 'granted') {
      const delay = scheduleAt.getTime() - Date.now();
      if (delay > 0) {
        setTimeout(() => {
          new Notification(title, { body });
        }, delay);
      }
    } else {
      console.log(`[Mock Notification] ${title}: ${body} at ${scheduleAt}`);
    }
  },

  async cancelAll() {
    if (Capacitor.isNativePlatform()) {
      await LocalNotifications.cancel({ notifications: [] });
    }
  }
};
