// Self-destructing Service Worker
// Automatically purges all caches and unregisters itself immediately from all clients

self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(keys.map((k) => caches.delete(k)));
    }).then(() => {
      return self.registration.unregister();
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Pass all fetch requests directly through without intercepting
self.addEventListener('fetch', (e) => {
  return;
});
