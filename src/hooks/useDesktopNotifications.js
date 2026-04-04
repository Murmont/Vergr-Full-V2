import { useEffect, useRef } from 'react';
import { useNotifications } from '../context/NotificationContext';

/**
 * Hook that triggers native desktop notifications via Tauri's notification plugin.
 * Only runs in the Tauri desktop environment. Falls back gracefully on web.
 * 
 * Listens for new unread notifications from NotificationContext and sends
 * native OS notifications for ones we haven't already shown.
 */
export function useDesktopNotifications() {
  const { notifications } = useNotifications();
  const shownIds = useRef(new Set());
  const initialized = useRef(false);
  const isTauri = typeof window !== 'undefined' && !!window.__TAURI_INTERNALS__;

  useEffect(() => {
    if (!isTauri) return;

    // On first load, mark all existing notifications as "already shown"
    // so we don't spam the user with old notifications on startup
    if (!initialized.current) {
      notifications.forEach(n => shownIds.current.add(n.id));
      initialized.current = true;
      return;
    }

    // Find new unread notifications we haven't shown yet
    const newNotifs = notifications.filter(n => !n.read && !shownIds.current.has(n.id));
    if (newNotifs.length === 0) return;

    // Dynamically import Tauri notification API
    (async () => {
      try {
        const { isPermissionGranted, requestPermission, sendNotification } = await import('@tauri-apps/plugin-notification');

        let permitted = await isPermissionGranted();
        if (!permitted) {
          const result = await requestPermission();
          permitted = result === 'granted';
        }
        if (!permitted) return;

        for (const notif of newNotifs) {
          const title = notif.title || notif.content || 'VERGR';
          const body = notif.body || '';

          sendNotification({ title, body });
          shownIds.current.add(notif.id);
        }
      } catch (err) {
        // Not in Tauri or plugin not available — silent fail
      }
    })();
  }, [notifications, isTauri]);
}
