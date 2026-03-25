/// <reference lib="webworker" />
import { precacheAndRoute } from 'workbox-precaching';

declare const self: ServiceWorkerGlobalScope;

// Workbox precaching (injected by VitePWA)
precacheAndRoute(self.__WB_MANIFEST);

// Activate immediately
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

// Push notification handler
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};
  const tag = data.tag ?? 'sessio-notification';
  const pushUrl = data.url ?? '/';

  const promise = self.clients
    .matchAll({ type: 'window', includeUncontrolled: true })
    .then((clients) => {
      // Suppress message notifications if user is viewing that conversation
      if (tag.startsWith('msg-')) {
        for (const client of clients) {
          try {
            if (client.focused && new URL(client.url).pathname === pushUrl) return;
          } catch { /* ignore invalid URLs */ }
        }
      }

      return self.registration.showNotification(data.title ?? 'Sessio', {
        body: data.body ?? '',
        icon: '/icons/icon-192.svg',
        badge: '/icons/icon-192.svg',
        tag,
        data: { url: pushUrl },
        actions: data.actions ?? [],
      });
    });

  event.waitUntil(promise);
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? '/';

  // Handle action buttons
  if (event.action === 'confirm') {
    event.waitUntil(self.clients.openWindow(url + '?action=confirm'));
    return;
  }
  if (event.action === 'decline') {
    event.waitUntil(self.clients.openWindow(url + '?action=decline'));
    return;
  }

  // Default: open the app
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // Focus existing tab if open
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          client.navigate(url);
          return;
        }
      }
      // Otherwise open new window
      return self.clients.openWindow(url);
    })
  );
});
