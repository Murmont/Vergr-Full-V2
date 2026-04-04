// Firebase Cloud Messaging Service Worker
// Handles push notifications when app is in background/closed
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyCuwlEMPFzhmXx_FqdWiYWlshuRT_EIkoI",
  authDomain: "vergr-44494.firebaseapp.com",
  projectId: "vergr-44494",
  storageBucket: "vergr-44494.firebasestorage.app",
  messagingSenderId: "674096624319",
  appId: "1:674096624319:web:a01744f81795f15b354c0a",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const { title, body, icon } = payload.notification || {};
  const options = {
    body: body || 'New notification from VERGR',
    icon: icon || '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: payload.data || {},
    vibrate: [100, 50, 100],
  };
  self.registration.showNotification(title || 'VERGR', options);
});

// Handle notification click — open the app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      return clients.openWindow('/');
    })
  );
});
