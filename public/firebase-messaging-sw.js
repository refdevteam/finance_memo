// Service worker for Firebase Cloud Messaging (FCM) Simulation & Production
self.addEventListener('push', function(event) {
  console.log('[Service Worker] Push Message Received.');
  
  let title = 'fimo — Finance Memo';
  let options = {
    body: 'Ada pembaruan penting mengenai pengingat keuangan Anda.',
    icon: '/icon.png',
    badge: '/badge.png'
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
      // Fallback if data is raw text
      options.body = event.data.text();
    }
  }

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function(event) {
  console.log('[Service Worker] Notification clicked.');
  event.notification.close();

  // Redirect client to action URL
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
