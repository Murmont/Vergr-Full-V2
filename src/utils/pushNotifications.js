import { getToken, onMessage } from 'firebase/messaging';
import { doc, setDoc, arrayUnion } from 'firebase/firestore';
import { db, messaging } from '../firebase/config';

// ⚠️ REPLACE THIS with your VAPID key from Firebase Console:
// Project Settings → Cloud Messaging → Web Push certificates → Generate key pair
const VAPID_KEY = 'BMOTYWH_CfCg034xbbMHyc1vNMien5LeoZSB_3RwWeTGTkpFQXLxq1SaE80-aaY0u_nm4ROa-rHf8mKj0Ri-Vlo';

/**
 * Request push notification permission and save FCM token to Firestore.
 * Call this after user logs in or taps "Enable notifications".
 */
export const setupPushNotifications = async (userId) => {
  if (!messaging || !userId) return null;
  if (VAPID_KEY === 'YOUR_VAPID_KEY_HERE') {
    console.warn('Push notifications: VAPID key not set. See src/utils/pushNotifications.js');
    return null;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('Push notification permission denied');
      return null;
    }

    // Register the FCM service worker
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');

    // Get FCM token
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    });

    if (token) {
      // Save token to user's private FCM doc (same path the TypeScript functions read from)
      await setDoc(doc(db, 'users', userId, 'private', 'fcm'), {
        tokens: arrayUnion(token),
        updatedAt: new Date(),
      }, { merge: true });

      console.log('Push notifications enabled');
      return token;
    }
  } catch (err) {
    console.error('Failed to setup push notifications:', err);
  }
  return null;
};

/**
 * Listen for foreground push messages (when app is open).
 * Shows a toast or in-app notification instead of a system notification.
 */
export const onForegroundMessage = (callback) => {
  if (!messaging) return () => {};
  return onMessage(messaging, (payload) => {
    const { title, body } = payload.notification || {};
    callback({ title, body, data: payload.data });
  });
};
