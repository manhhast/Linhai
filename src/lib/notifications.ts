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
          const notification = new (window as any).Notification(title, { 
            body,
            icon: '/icon.svg',
            badge: '/icon.svg',
            vibrate: [200, 100, 200], // Vibration pattern for Android PWA
          });

          // Play a gentle alert sound if the window/app is focused (foreground)
          if (!document.hidden) {
            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
            audio.play().catch(e => console.log('Audio play failed:', e));
          }

          notification.onclick = () => {
            window.focus();
            notification.close();
          };
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
