// Service worker — push notifications + offline shell
// Precaching is disabled (vite-plugin-pwa injectManifest build is incompatible with bun)

// Current user ID — set by the main app so we can skip self-notifications
let currentUserId = null;

// Activate immediately
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

// Receive user ID from the main app
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SET_USER_ID') {
    currentUserId = event.data.userId ?? null;
  }
});

// Push notification handler
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};

  // Tell open pages a push arrived so they can refresh stale queries
  // (the page itself never sees 'push' events — only the SW does).
  // Sent before the self-sender check so the sender's other tabs refresh too.
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) client.postMessage({ type: 'PUSH_RECEIVED', payload: data });
    })
  );

  // Don't show notifications for your own messages
  if (currentUserId && data.sender_id && data.sender_id === currentUserId) return;

  const title = data.title ?? 'Sessio';
  const options = {
    body: data.body ?? '',
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-96.png',
    tag: data.tag ?? 'sessio-notification',
    data: { url: data.url ?? '/' },
    actions: data.actions ?? [],
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? '/';

  if (event.action === 'confirm') {
    event.waitUntil(self.clients.openWindow(url + '?action=confirm'));
    return;
  }
  if (event.action === 'decline') {
    event.waitUntil(self.clients.openWindow(url + '?action=decline'));
    return;
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          client.navigate(url);
          return;
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
