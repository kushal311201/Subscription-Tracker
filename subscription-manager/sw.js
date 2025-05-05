// Service Worker Version
const CACHE_NAME = 'subscription-manager-v3';
const DATA_CACHE_NAME = 'subscription-data-v2';

// Files to cache
const filesToCache = [
  './',
  './index.html',
  './reminders.html',
  './css/style.css',
  './js/app.js',
  './js/db.js',
  './js/reminders.js',
  './js/translations.js',
  './manifest.json',
  './offline.html',
  './images/icon-192.png',
  './images/icon-512.png',
  './images/offline.svg',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css',
  'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://cdn.jsdelivr.net/npm/pulltorefreshjs@0.1.22/dist/index.umd.min.js',
  'https://cdn.jsdelivr.net/npm/vibration-api-polyfill@1.0.0/dist/vibration-api-polyfill.min.js',
  'https://cdn.jsdelivr.net/npm/@fingerprintjs/fingerprintjs@3.4.1/dist/fp.min.js'
];

// Static resources to always cache
const STATIC_RESOURCES = [
  'index.html',
  'reminders.html',
  'css/style.css',
  'js/app.js',
  'js/db.js',
  'js/reminders.js',
  'js/translations.js',
  'manifest.json',
  'offline.html',
  'images/'
];

// Install Service Worker
self.addEventListener('install', event => {
  console.log('Service Worker: Installing...');
  self.skipWaiting(); // Force activation
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Caching app shell');
        return cache.addAll(filesToCache);
      })
  );
});

// Activate Service Worker
self.addEventListener('activate', event => {
  console.log('Service Worker: Activating...');
  
  // Clear old caches
  const cacheWhitelist = [CACHE_NAME, DATA_CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker: Claiming clients');
      return self.clients.claim(); // Take control of all clients
    })
  );
});

// Fetch resources with cache-first strategy for app resources
self.addEventListener('fetch', event => {
  // For non-API requests (static assets)
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // Return cached version immediately if available
        if (cachedResponse) {
          // Revalidate the resource in the background only if online
          if (navigator.onLine) {
            fetch(event.request)
              .then(networkResponse => {
                // If we got a valid response, cache it
                if (networkResponse && networkResponse.status === 200) {
                  caches.open(CACHE_NAME)
                    .then(cache => cache.put(event.request, networkResponse.clone()));
                }
              })
              .catch(error => console.log('Failed to refresh resource:', error));
          }
          
          return cachedResponse;
        }
        
        // Not in cache, fetch from network
        return fetch(event.request)
          .then(response => {
            // Don't cache if not a valid response
            if (!response || response.status !== 200) {
              return response;
            }
            
            // Clone the response
            const responseToCache = response.clone();
            
            // Cache the fetched response
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
            
            return response;
          })
          .catch(error => {
            console.log('Network error:', error);
            
            // For navigation requests, serve the offline page
            if (event.request.mode === 'navigate') {
              return caches.match('./offline.html');
            }
            
            // For image requests, you could return a placeholder
            if (event.request.destination === 'image') {
              return caches.match('./images/offline.svg');
            }
            
            // Otherwise just return a basic error
            return new Response('Network error occurred', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: new Headers({
                'Content-Type': 'text/plain'
              })
            });
          });
      })
  );
});

// Handle push notifications
self.addEventListener('push', event => {
  console.log('Push notification received');
  
  let notificationData = {
    title: 'Subscription Due',
    body: 'One of your subscriptions is due soon.',
    icon: './images/icon-192.png',
    badge: './images/icon-192.png',
    data: {
      url: './index.html'
    },
    vibrate: [100, 50, 100]
  };
  
  // If we have event data, use it
  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = { ...notificationData, ...data };
    } catch (e) {
      console.error('Error parsing push data:', e);
    }
  }
  
  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      data: notificationData.data,
      vibrate: notificationData.vibrate
    })
  );
});

// Handle notification click
self.addEventListener('notificationclick', event => {
  console.log('Notification clicked');
  
  event.notification.close();
  
  let url = './index.html';
  
  // Use the url from notification data if available
  if (event.notification.data && event.notification.data.url) {
    url = event.notification.data.url;
  }
  
  // Focus the client with the given URL or open a new window
  event.waitUntil(
    clients.matchAll({ type: 'window' })
      .then(windowClients => {
        for (const client of windowClients) {
          if (client.url.includes(url) && 'focus' in client) {
            return client.focus();
          }
        }
        
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
}); 