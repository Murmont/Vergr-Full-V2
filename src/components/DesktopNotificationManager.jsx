import { useDesktopNotifications } from '../hooks/useDesktopNotifications';

/**
 * Invisible component that triggers native desktop notifications.
 * Must be rendered inside NotificationProvider.
 */
export default function DesktopNotificationManager() {
  useDesktopNotifications();
  return null;
}
