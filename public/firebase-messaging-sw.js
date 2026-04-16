// ────────────────────────────────────────────────────────────
// Firebase Cloud Messaging Service Worker
// ────────────────────────────────────────────────────────────
// Handles push notifications when the VERGR PWA is in the background
// or closed. Companion file: public/sw.js (general PWA cache) and
// src/utils/pushNotifications.js (foreground handler).
//
// Design decisions (do NOT relax these without reading the FCM docs):
//
//   1. We read title/body/type/ids from `payload.data`, NOT from
//      `payload.notification`. Reason: when the sender includes a
//      top-level `notification` field, Chrome auto-displays a system
//      notification BEFORE `onBackgroundMessage` even fires — and if
//      the sender also uses `webpush.notification`, the `notification`
//      field arrives on this side partially stripped, which is how we
//      ended up with ghost "New notification from VERGR" bubbles with
//      no body text. The backend is now data-only; this handler is the
//      single source of truth for what the user sees.
//
//   2. If the data is missing or malformed, we show NOTHING. Better to
//      drop a push than to produce an empty "New notification from VERGR"
//      ghost with no way for the user to figure out what it was about.
//
//   3. The notification `data` object is stringified into the click
//      handler's `event.notification.data` — we use it to route the user
//      straight to the relevant post / chat / squad / profile via a
//      HashRouter URL (the SPA uses HashRouter, so all in-app routes
//      live under `/#/...`).

importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyCuwlEMPFzhmXx_FqdWiYWlshuRT_EIkoI',
  authDomain: 'vergr-44494.firebaseapp.com',
  projectId: 'vergr-44494',
  storageBucket: 'vergr-44494.firebasestorage.app',
  messagingSenderId: '674096624319',
  appId: '1:674096624319:web:a01744f81795f15b354c0a',
});

const messaging = firebase.messaging();

// ──────────────────────────────────────────────────────────────
// Background push handler
// ──────────────────────────────────────────────────────────────
messaging.onBackgroundMessage((payload) => {
  const data = payload.data || {};

  // Silent control messages — no visible notification, just forward to any
  // open VERGR client so the SPA can mutate its local Dexie cache.
  if (data.type === 'message_deleted') {
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) c.postMessage({ type: 'message-deleted', data });
    });
    return;
  }

  // Title + body come from the data payload (see design note #1).
  // Fallback chain: explicit title → displayName → legacy notification.title
  const title =
    data.title ||
    data.displayName ||
    (payload.notification && payload.notification.title) ||
    '';
  const body =
    data.body ||
    data.message ||
    (payload.notification && payload.notification.body) ||
    '';

  // If we genuinely have no information, drop the push silently rather
  // than showing a ghost "New notification from VERGR" bubble.
  if (!title && !body) return;

  // Sender avatar (if present) becomes the big notification icon —
  // matches WhatsApp's UX where you see WHO messaged you. The small
  // monochrome badge in the status bar always stays as the VERGR logo.
  const senderAvatar = data.senderAvatar || data.avatar || null;

  const options = {
    body: body || title,
    icon: senderAvatar || '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    image: data.image || undefined,
    data, // preserved so notificationclick can route the user
    // `tag` collapses successive notifications from the same chat /
    // notif id into one bubble instead of stacking dozens of them.
    tag: data.chatId || data.conversationId || data.notifId || data.postId || undefined,
    renotify: !!(data.chatId || data.conversationId),
    vibrate: [100, 50, 100],
    requireInteraction: false,
  };

  self.registration.showNotification(title || 'VERGR', options);
});

// ──────────────────────────────────────────────────────────────
// Click handler — route to the right screen
// ──────────────────────────────────────────────────────────────
//
// The app uses HashRouter, so in-app routes are under /#/... . If a
// VERGR window is already open, we focus it and post a message so the
// running SPA can navigate without a full reload. Otherwise we open a
// new window pointed at the target hash route.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data = (event.notification && event.notification.data) || {};

  // Resolve the target route from the data payload. Order matters —
  // the first match wins. Keep in sync with NotificationsDrawer's
  // handleNavigate() function.
  let targetHash = '/';
  if (data.postId) targetHash = `/post/${data.postId}`;
  else if (data.conversationId) targetHash = `/chat/${data.conversationId}`;
  else if (data.chatId) targetHash = `/chat/${data.chatId}`;
  else if (data.squadId) targetHash = `/squads/${data.squadId}`;
  else if (data.orderId) targetHash = `/orders/${data.orderId}`;
  else if (data.type === 'follow' && data.senderId) targetHash = `/user/${data.senderId}`;
  else if (data.senderId) targetHash = `/user/${data.senderId}`;
  else if (data.actionUrl) targetHash = data.actionUrl;

  const targetUrl = `${self.location.origin}/#${targetHash}`;

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // If a VERGR tab is already open, focus it and tell it to
        // navigate via postMessage (the SPA listens for this).
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.postMessage({
              type: 'notification-click',
              targetHash,
              data,
            });
            return client.focus();
          }
        }
        // Otherwise, open a new tab at the target route directly.
        return clients.openWindow(targetUrl);
      })
  );
});
