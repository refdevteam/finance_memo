// Service worker for PWA caching and Firebase Cloud Messaging (FCM)

const CACHE_NAME = 'fimo-cache-v1';
const ASSETS_TO_CACHE = [
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
];

// PWA Install & Cache assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate & Cleanup old cache
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch cache-first or network fallback
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        
        // Don't cache dynamic API routes or dashboard subpaths to avoid stale data
        const url = new URL(event.request.url);
        if (url.pathname.startsWith('/api') || url.pathname.startsWith('/dashboard')) {
          return response;
        }

        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return response;
      }).catch(() => {
        // Return cached page or fail silently
      });
    })
  );
});

// FCM Notification Handling
self.addEventListener('push', function(event) {
  console.log('[Service Worker] Push Message Received.');
  
  let title = 'fimo — Finance Memo';
  let options = {
    body: 'Ada pembaruan penting mengenai pengingat keuangan Anda.',
    icon: '/icon-192.png',
    badge: '/icon-192.png'
  };

  if (event.data) {
    try {
      const data = event.data.json();
      title = data.notification?.title || title;
      options = {
        body: data.notification?.body || options.body,
        icon: data.notification?.icon || options.icon,
        badge: data.notification?.badge || options.badge,
        data: data.data || {}
      };
    } catch (e) {
      options.body = event.data.text();
    }
  }

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function(event) {
  console.log('[Service Worker] Notification clicked.');
  event.notification.close();

  const actionUrl = event.notification.data?.action_url || '/dashboard';

  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then(function(windowClients) {
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === actionUrl && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(actionUrl);
      }
    })
  );
});
