// Service Worker for Subscription Tracker
const CACHE_NAME = 'subscription-tracker-v1.6';

// Assets to cache
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/css/style.css',
  '/css/theme-enhancements.css',
  '/js/app.js',
  '/js/db.js',
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
          return cacheName.startsWith('subscription-tracker-') && cacheName !== CACHE_NAME;
        }).map(cacheName => {
          console.log('Deleting old cache:', cacheName);
          return caches.delete(cacheName);
        })
      );
    }).then(() => self.clients.claim()) // Take control of all clients
  );
});

// Fetch event - Network-first strategy for API requests, Cache-first for static assets
self.addEventListener('fetch', event => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;
  
  // Handle fetch event
  event.respondWith(
    (async () => {
      const url = new URL(event.request.url);
      
      // Different strategies based on request type
      
      // For API requests or dynamic content - Network first, fallback to cache
      if (url.pathname.includes('/api/') || 
          url.pathname.includes('/data/') ||
          url.search.includes('dynamic=true')) {
        try {
          // Try network first
          const networkResponse = await fetch(event.request);
          
          // Clone the response and put in cache
          const responseToCache = networkResponse.clone();
          const cache = await caches.open(CACHE_NAME);
          await cache.put(event.request, responseToCache);
          
          return networkResponse;
        } catch (err) {
          // Network failed, try cache
          const cachedResponse = await caches.match(event.request);
          if (cachedResponse) {
            return cachedResponse;
          }
          
          // If nothing in cache, show offline fallback
          return caches.match('/offline.html');
        }
      }
      
      // For static assets - Cache first, fallback to network
      try {
        // Try cache first
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) {
          return cachedResponse;
        }
        
        // Cache miss, go to network
        const networkResponse = await fetch(event.request);
        
        // Clone and cache the response for next time
        const responseToCache = networkResponse.clone();
        const cache = await caches.open(CACHE_NAME);
        await cache.put(event.request, responseToCache);
        
        return networkResponse;
      } catch (err) {
        // Both cache and network failed
        console.error('Fetch error:', err);
        
        // Return offline page for HTML requests
        if (event.request.headers.get('Accept').includes('text/html')) {
          return caches.match('/offline.html');
        }
        
        // For other requests, just fail
        return new Response('Network error happened', {
          status: 408,
          headers: { 'Content-Type': 'text/plain' }
        });
      }
    })()
  );
});

// Background sync for offline data
self.addEventListener('sync', event => {
  if (event.tag === 'sync-subscriptions') {
    event.waitUntil(syncSubscriptions());
  }
});

// Push notification handling
self.addEventListener('push', event => {
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
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'Subscription Tracker', options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow(event.notification.data.url)
    );
  }
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
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Notify the app that sync has completed
    clients.forEach(client => {
      client.postMessage({ type: 'SYNC_COMPLETED' });
    });
    
    return true;
  } catch (error) {
    console.error('Sync failed:', error);
    return false;
  }
} 