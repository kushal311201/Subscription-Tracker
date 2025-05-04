// Service Worker Version
const CACHE_NAME = 'subscription-manager-v2';
const DATA_CACHE_NAME = 'subscription-data-v1';

// Files to cache
const filesToCache = [
  './',
  './index.html',
  './css/style.css',
  './js/app.js',
  './manifest.json',
  './offline.html',
  './images/icon-192.png',
  './images/icon-512.png',
  './images/offline.svg',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css',
  'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://cdn.jsdelivr.net/npm/airtable@0.12.2/build/airtable.browser.js',
  'https://cdn.jsdelivr.net/npm/pulltorefreshjs@0.1.22/dist/index.umd.min.js',
  'https://cdn.jsdelivr.net/npm/vibration-api-polyfill@1.0.0/dist/vibration-api-polyfill.min.js',
  'https://cdn.jsdelivr.net/npm/@fingerprintjs/fingerprintjs@3.4.1/dist/fp.min.js'
];

// Static resources to always cache
const STATIC_RESOURCES = [
  'index.html',
  'css/style.css',
  'js/app.js',
  'manifest.json',
  'offline.html',
  'images/'
];

// API paths that need special handling
const API_URLS = [
  'airtable.com'
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

// Fetch resources with stale-while-revalidate strategy
self.addEventListener('fetch', event => {
  const requestUrl = new URL(event.request.url);
  
  // Handle API requests differently
  if (API_URLS.some(url => event.request.url.includes(url))) {
    event.respondWith(handleApiRequest(event.request));
    return;
  }
  
  // For non-API requests (static assets)
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // Return cached version immediately if available
        if (cachedResponse) {
          // Revalidate the resource in the background
          fetch(event.request)
            .then(networkResponse => {
              // If we got a valid response, cache it
              if (networkResponse && networkResponse.status === 200) {
                caches.open(CACHE_NAME)
                  .then(cache => cache.put(event.request, networkResponse.clone()));
              }
            })
            .catch(error => console.log('Failed to refresh resource:', error));
          
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

// Handle API requests
function handleApiRequest(request) {
  // Try network first for API requests
  return fetch(request)
    .then(response => {
      // Clone the response to store in cache
      const clonedResponse = response.clone();
      
      caches.open(DATA_CACHE_NAME)
        .then(cache => {
          cache.put(request, clonedResponse);
        });
      
      return response;
    })
    .catch(() => {
      // If network fails, try to return cached data
      return caches.match(request);
    });
}

// Listen for the sync event
self.addEventListener('sync', event => {
  if (event.tag === 'sync-subscriptions') {
    event.waitUntil(syncData());
  }
});

// Background sync function to send cached data
function syncData() {
  return self.clients.matchAll()
    .then(clients => {
      if (clients && clients.length) {
        // Notify client that sync is happening
        clients.forEach(client => {
          client.postMessage({
            type: 'SYNC_STARTED'
          });
        });
      }
      
      // Get data from IndexedDB
      return getDataFromIndexedDB()
        .then(pendingItems => {
          // Process each pending item
          return Promise.all(pendingItems.map(item => {
            // Try to send to server
            return sendToServer(item)
              .then(() => {
                // If successful, remove from pending
                return removeFromIndexedDB(item.id);
              })
              .catch(error => {
                console.error('Sync failed for item:', item.id, error);
                // Keep in IndexedDB to try again later
                return Promise.resolve();
              });
          }));
        })
        .then(() => {
          // Notify clients sync is complete
          if (clients && clients.length) {
            clients.forEach(client => {
              client.postMessage({
                type: 'SYNC_COMPLETED'
              });
            });
          }
        });
    });
}

// Functions to interact with IndexedDB (stubs - implemented in app.js)
function getDataFromIndexedDB() {
  // This would be implemented to retrieve pending items
  // Return a promise that resolves with the data
  return Promise.resolve([]);
}

function removeFromIndexedDB(id) {
  // This would be implemented to remove synced items
  // Return a promise that resolves when done
  return Promise.resolve();
}

function sendToServer(item) {
  // This would be implemented to send the data to server
  // Return a promise that resolves when the network request completes
  return Promise.resolve();
}

// Handle push notifications
self.addEventListener('push', event => {
  console.log('Push notification received');
  
  let notificationData = {
    title: 'Subscription Due',
    body: 'One of your subscriptions is due soon.',
    icon: './images/icon-192.png',
    badge: './images/icon-192.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      { action: 'view', title: 'View Details' },
      { action: 'close', title: 'Close' }
    ]
  };
  
  if (event.data) {
    try {
      notificationData = JSON.parse(event.data.text());
    } catch (e) {
      console.log('Error parsing notification data', e);
    }
  }
  
  event.waitUntil(
    self.registration.showNotification(notificationData.title, notificationData)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  if (event.action === 'view') {
    // Open the app and navigate to the subscription
    event.waitUntil(
      clients.matchAll({
        type: 'window'
      }).then(clientList => {
        // If a window client already exists, focus it
        for (const client of clientList) {
          if (client.url.includes('/index.html') && 'focus' in client) {
            return client.focus();
          }
        }
        // Otherwise open a new window
        return clients.openWindow('./index.html');
      })
    );
  }
}); 