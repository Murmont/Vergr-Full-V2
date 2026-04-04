import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { subscribeToNotifications, markNotificationRead, markAllNotificationsRead } from '../firebase/firestore';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import { setupPushNotifications, onForegroundMessage } from '../utils/pushNotifications';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [toast, setToast] = useState(null);
  const pushSetupDone = useRef(false);

  useEffect(() => {
    if (!currentUser) {
      setNotifications([]);
      setUnreadChatCount(0);
      pushSetupDone.current = false;
      return;
    }

    // 1. General notifications listener (Firestore real-time)
    const unsubNotifications = subscribeToNotifications(currentUser.uid, setNotifications);

    // 2. Chat unread listener
    const q = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', currentUser.uid),
      where('status', '==', 'active')
    );
    const unsubChats = onSnapshot(q, (snapshot) => {
      let count = 0;
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.unreadCount && data.unreadCount[currentUser.uid]) {
          count += data.unreadCount[currentUser.uid];
        }
      });
      setUnreadChatCount(count);
    });

    // 3. Setup push notifications (once per login)
    if (!pushSetupDone.current) {
      pushSetupDone.current = true;
      setupPushNotifications(currentUser.uid).catch(() => {});
    }

    // 4. Foreground push handler — show toast when app is open
    const unsubForeground = onForegroundMessage(({ title, body }) => {
      setToast({ title, body });
      setTimeout(() => setToast(null), 4000);
    });

    return () => {
      unsubNotifications();
      unsubChats();
      if (typeof unsubForeground === 'function') unsubForeground();
    };
  }, [currentUser]);

  const unreadCount = notifications.filter(n => !n.read).length + unreadChatCount;
  const unreadNotifCount = notifications.filter(n => !n.read).length;

  const markRead = async (id) => { await markNotificationRead(id); };
  const markAllRead = async () => {
    if (!currentUser) return;
    await markAllNotificationsRead(currentUser.uid);
  };

  const value = {
    notifications, unreadCount, unreadChatCount, unreadNotifCount,
    markRead, markAllRead, toast,
  };
  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
};
