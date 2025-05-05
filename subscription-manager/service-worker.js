// Service Worker for Subscription Tracker
const CACHE_NAME = 'subscription-tracker-v1.7';
const DYNAMIC_CACHE = 'subscription-tracker-dynamic-v1.2';

// Assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/css/style.css',
  '/css/theme-enhancements.css',
  '/css/budget-analytics.css',
  '/js/app.js',
  '/js/db.js',
  '/js/budget-analytics.js',
  '/img/backgrounds/bg-pattern.svg',
  '/img/favicon.png',
  '/img/apple-touch-icon.png',
  '/manifest.json',
  '/fonts/inter-var.woff2',
  '/offline.html',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Poppins:wght@400;500;600&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css',
  'https://cdn.jsdelivr.net/npm/chart.js@3.7.0/dist/chart.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.9.1/gsap.min.js'
];

// Install event - Cache static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting()) // Activate immediately
  );
});

// Activate event - Clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(cacheName => {
          return cacheName.startsWith('subscription-tracker-') && 
                 cacheName !== CACHE_NAME && 
                 cacheName !== DYNAMIC_CACHE;
        }).map(cacheName => {
          console.log('Deleting old cache:', cacheName);
          return caches.delete(cacheName);
        })
      );
    }).then(() => self.clients.claim()) // Take control of all clients
  );
});

// Fetch event - Optimized caching strategy
self.addEventListener('fetch', event => {
  // Skip non-GET requests or browser-extension requests
  if (event.request.method !== 'GET' || 
      event.request.url.startsWith('chrome-extension://') || 
      event.request.url.includes('extension')) {
    return;
  }
  
  // Handle fetch event with improved performance
  event.respondWith(
    (async () => {
      const url = new URL(event.request.url);
      
      // For API requests or dynamic content - Network first, fallback to cache
      if (url.pathname.includes('/api/') || 
          url.pathname.includes('/data/') ||
          url.search.includes('dynamic=true')) {
        return networkFirstStrategy(event.request);
      }
      
      // For static assets in our predefined list - Cache first, fallback to network
      if (STATIC_ASSETS.includes(url.pathname) || 
          STATIC_ASSETS.some(asset => asset.endsWith(url.pathname))) {
        return cacheFirstStrategy(event.request);
      }
      
      // For other requests - Stale-while-revalidate strategy
      return staleWhileRevalidateStrategy(event.request);
    })()
  );
});

// Cache-first strategy for static assets
async function cacheFirstStrategy(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, networkResponse.clone());
    return networkResponse;
  } catch (error) {
    // If HTML request fails, show offline page
    if (request.headers.get('Accept').includes('text/html')) {
      return caches.match('/offline.html');
    }
    throw error;
  }
}

// Network-first strategy for API requests
async function networkFirstStrategy(request) {
  try {
    const networkResponse = await fetch(request);
    const cache = await caches.open(DYNAMIC_CACHE);
    cache.put(request, networkResponse.clone());
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    if (request.headers.get('Accept').includes('text/html')) {
      return caches.match('/offline.html');
    }
    throw error;
  }
}

// Stale-while-revalidate for other assets
async function staleWhileRevalidateStrategy(request) {
  const cachedResponse = await caches.match(request);
  
  // Clone request as it can only be used once
  const fetchPromise = fetch(request).then(networkResponse => {
    if (networkResponse.ok) {
      const responseToCache = networkResponse.clone();
      caches.open(DYNAMIC_CACHE).then(cache => {
        cache.put(request, responseToCache);
      });
    }
    return networkResponse;
  }).catch(error => {
    // If HTML request fails, show offline page
    if (request.headers.get('Accept').includes('text/html')) {
      return caches.match('/offline.html');
    }
    throw error;
  });
  
  return cachedResponse || fetchPromise;
}

// Background sync for offline data
self.addEventListener('sync', event => {
  if (event.tag === 'sync-subscriptions') {
    event.waitUntil(syncSubscriptions());
  }
});

// Push notification handling
self.addEventListener('push', event => {
  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.body || 'Subscription reminder',
    icon: '/img/apple-touch-icon.png',
    badge: '/img/badge.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: data.id || 1,
      url: data.url || '/'
    },
    actions: [
      { action: 'view', title: 'View Details' },
      { action: 'dismiss', title: 'Dismiss' }
    ],
    tag: data.tag || 'subscription-notification', // Group similar notifications
    renotify: data.renotify || false
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'Subscription Tracker', options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  // Focus on existing window or open new one
  event.waitUntil(
    clients.matchAll({type: 'window'}).then(windowClients => {
      // Check if there is already a window with our URL open
      for (let client of windowClients) {
        if (client.url === event.notification.data.url && 'focus' in client) {
          return client.focus();
        }
      }
      // If not, open a new window
      if (clients.openWindow) {
        return clients.openWindow(event.notification.data.url);
      }
    })
  );
});

// Sync function
async function syncSubscriptions() {
  try {
    // Notify the app that sync has started
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({ type: 'SYNC_STARTED' });
    });
    
    // Here you would implement the actual sync logic
    // ...
    
    // This is a simulation of sync taking some time
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Notify the app that sync has completed
    clients.forEach(client => {
      client.postMessage({ type: 'SYNC_COMPLETED', success: true });
    });
    
    return true;
  } catch (error) {
    console.error('Sync failed:', error);
    
    // Notify about sync failure
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({ 
        type: 'SYNC_FAILED', 
        error: error.message 
      });
    });
    
    return false;
  }
} 