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
  
  // Bypass service worker completely for dynamic routes to avoid cache issues and FetchEvent rejections
  const url = new URL(event.request.url);
  if (
    url.pathname.startsWith('/api') || 
    url.pathname.startsWith('/dashboard') || 
    url.pathname.startsWith('/auth')
  ) {
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

        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return response;
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
      
      // Extremely robust parsing to support standard Web Push payload structure
      const notification = data.notification || data.data?.notification || data.data || {};
      title = notification.title || data.title || title;
      const body = notification.body || data.body || options.body;
      const icon = notification.icon || data.icon || '/logo-circle.png';
      const badge = notification.badge || data.badge || '/icon-192.png';
      
      const payloadData = data.data || data || {};
      
      options = {
        body: body,
        icon: icon,
        badge: badge,
        data: payloadData
      };

      // Add snooze and manage actions if it is a reminder push notification
      if (payloadData.reminder_id) {
        options.actions = [
          { action: 'snooze_1d', title: 'Tunda 1 Hari' },
          { action: 'snooze_3d', title: 'Tunda 3 Hari' },
          { action: 'manage_reminder', title: 'Kelola Pengingat' }
        ];
      }
    } catch (e) {
      options.body = event.data.text();
    }
  }

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function(event) {
  console.log('[Service Worker] Notification clicked.');
  event.notification.close();

  const reminderId = event.notification.data?.reminder_id;
  const action = event.action;

  if (action === 'snooze_1d' || action === 'snooze_3d') {
    const days = action === 'snooze_1d' ? 1 : 3;
    
    event.waitUntil(
      fetch('/api/reminders/snooze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          reminder_id: reminderId,
          snooze_days: days
        })
      })
      .then(response => {
        if (!response.ok) {
          throw new Error('Snooze API returned non-200');
        }
        return response.json();
      })
      .then(data => {
        console.log('[Service Worker] Rescheduled successfully:', data);
        
        const category = event.notification.data?.category || 'custom';
        const title = event.notification.data?.title || 'Pengingat';
        let encourageMsg = '';
        if (category === 'bill') {
          encourageMsg = `Tidak apa-apa, menunda pembayaran "${title}" adalah hal yang manusiawi. Tetap bernapas lega dan bayar ketika siap. Semoga lancar rezekinya!`;
        } else if (category === 'saving') {
          encourageMsg = `Jangan memaksakan diri. Menabung untuk masa depan itu penting, tapi kesehatan mentalmu saat ini jauh lebih utama. Kamu hebat!`;
        } else if (category === 'installment') {
          encourageMsg = `Cicilan "${title}" ditunda. Jangan biarkan kecemasan menguasaimu. Selangkah demi selangkah, kamu pasti bisa melaluinya!`;
        } else if (category === 'subscription') {
          encourageMsg = `Langganan "${title}" ditunda. Gunakan waktu ini untuk memikirkan kembali nilainya bagi hidupmu. Semangat!`;
        } else {
          encourageMsg = `Pengingat "${title}" berhasil dijadwalkan ulang. Ambil waktu sejenak untuk menenangkan pikiran. Tetap semangat!`;
        }

        return self.registration.showNotification('Pengingat Ditunda', {
          body: encourageMsg,
          icon: '/logo-circle.png',
          tag: 'snooze-confirm'
        });
      })
      .catch(error => {
        console.error('[Service Worker] Snooze failed:', error);
      })
    );
  } else {
    // If they clicked 'manage_reminder' or clicked the notification body, open action_url
    const actionUrl = event.notification.data?.action_url || `/dashboard/reminders?manage_id=${reminderId}`;
    event.waitUntil(
      clients.matchAll({
        type: 'window',
        includeUncontrolled: true
      }).then(function(windowClients) {
        for (let i = 0; i < windowClients.length; i++) {
          const client = windowClients[i];
          if (client.url.includes('/dashboard') && 'navigate' in client && 'focus' in client) {
            return client.navigate(actionUrl).then(c => c.focus());
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(actionUrl);
        }
      })
    );
  }
});
