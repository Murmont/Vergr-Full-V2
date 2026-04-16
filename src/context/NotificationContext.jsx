import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { subscribeToNotifications, markNotificationRead, markAllNotificationsRead } from '../firebase/firestore';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import { setupPushNotifications, onForegroundMessage } from '../utils/pushNotifications';
import { startOfflineQueue } from '../utils/offlineQueue';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [toast, setToast] = useState(null);
  const pushSetupDone = useRef(false);

  useEffect(() => {
    if (!currentUser) {
      setNotifications([]);
      setConversations([]);
      setUnreadChatCount(0);
      pushSetupDone.current = false;
      return;
    }

    // 0. Kick off the offline message queue once the user is signed in.
    startOfflineQueue();

    // 1. General notifications listener (Firestore real-time)
    const unsubNotifications = subscribeToNotifications(currentUser.uid, setNotifications);

    // 2. Single conversations listener — used by both the unread badge AND
    // the messages list panel. Previously we had two separate listeners
    // running at the same time, doubling read costs on every chat update.
    const q = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', currentUser.uid),
      where('status', '==', 'active'),
      orderBy('lastMessageAt', 'desc')
    );
    const unsubChats = onSnapshot(q, (snapshot) => {
      const convos = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setConversations(convos);
      let count = 0;
      for (const c of convos) {
        if (c.unreadCount && c.unreadCount[currentUser.uid]) {
          count += c.unreadCount[currentUser.uid];
        }
      }
      setUnreadChatCount(count);
    });

    // 3. Setup push notifications (once per login)
    if (!pushSetupDone.current) {
      pushSetupDone.current = true;
      setupPushNotifications(currentUser.uid).catch(() => {});
    }

    // 4. Foreground push handler — show toast when app is open, or route
    //    silent control messages (e.g. message_deleted) to their listeners.
    const unsubForeground = onForegroundMessage(({ title, body, data }) => {
      if (data?.type === 'message_deleted') {
        window.dispatchEvent(new CustomEvent('vergr:message-deleted', {
          detail: { chatId: data.conversationId, messageId: data.messageId },
        }));
        return; // no toast for silent control messages
      }
      setToast({ title, body });
      setTimeout(() => setToast(null), 4000);
    });

    // 5. Background push bridge — the service worker forwards silent control
    //    messages (message_deleted) via postMessage when the app is
    //    backgrounded. Convert to the same window event the foreground path
    //    uses so consumers only have to subscribe once.
    const swHandler = (event) => {
      const msg = event.data;
      if (msg?.type === 'message-deleted') {
        const d = msg.data || {};
        window.dispatchEvent(new CustomEvent('vergr:message-deleted', {
          detail: { chatId: d.conversationId, messageId: d.messageId },
        }));
      }
    };
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', swHandler);
    }

    return () => {
      unsubNotifications();
      unsubChats();
      if (typeof unsubForeground === 'function') unsubForeground();
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', swHandler);
      }
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
    notifications, conversations, unreadCount, unreadChatCount, unreadNotifCount,
    markRead, markAllRead, toast,
  };
  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
};
