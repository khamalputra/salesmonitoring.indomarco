const CACHE_NAME = 'indomarco-sales-v8'; // Naikkan versi cache
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

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

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  
  // Abaikan request API Google Apps Script
  if (event.request.url.includes('google.script.run') || event.request.url.includes('/macros/s/')) {
    return;
  }

  const url = new URL(event.request.url);
  const isCoreAsset = url.pathname.endsWith('/') || 
                      url.pathname.endsWith('index.html') || 
                      url.pathname.endsWith('manifest.json') ||
                      url.pathname.endsWith('sw.js');

  if (isCoreAsset) {
    // Strategi: Network-First (dengan Cache Fallback) untuk core HTML agar selalu update saat online
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse.status === 200) {
            const responseCopy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseCopy);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Offline fallback dari cache
          return caches.match(event.request);
        })
    );
  } else {
    // Strategi: Cache-First (dengan Network Fallback) untuk aset statis pendukung (CSS, JS, Ikon)
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).then((networkResponse) => {
          if (networkResponse.status === 200 && event.request.url.startsWith('http')) {
            const responseCopy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseCopy);
            });
          }
          return networkResponse;
        }).catch(() => {
          // Gagal offline
        });
      })
    );
  }
});
