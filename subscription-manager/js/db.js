/**
 * IndexedDB Database Manager for Subscription Tracker
 * Handles offline data storage
 */

const DB_NAME = 'subscriptionTrackerDB';
const DB_VERSION = 1;
const SUBSCRIPTION_STORE = 'subscriptions';
const CONFIG_STORE = 'config';

// Database connection
let db;
// In-memory cache for subscriptions
const subscriptionCache = {
  data: null,
  timestamp: 0,
  maxAge: 60000, // Cache validity in ms (1 minute)
  isValid: function() {
    return this.data !== null && (Date.now() - this.timestamp < this.maxAge);
  },
  update: function(data) {
    this.data = data;
    this.timestamp = Date.now();
    return data;
  },
  invalidate: function() {
    this.data = null;
    this.timestamp = 0;
  }
};

/**
 * Initialize the database
 * @returns {Promise} Promise that resolves when the database is ready
 */
function initDB() {
  return new Promise((resolve, reject) => {
    // Check if IndexedDB is supported
    if (!window.indexedDB) {
      const fallbackError = new Error('Your browser doesn\'t support IndexedDB. Using fallback storage.');
      console.warn(fallbackError);
      initFallbackStorage();
      return resolve(); // Resolve with fallback
    }
    
    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);
      
      request.onerror = function(event) {
        const error = new Error('Database error: ' + (event.target.error ? event.target.error.message : 'Unknown error'));
        console.error('IndexedDB error:', error);
        initFallbackStorage();
        resolve(); // Resolve with fallback
      };
      
      request.onupgradeneeded = function(event) {
        const db = event.target.result;
        
        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(SUBSCRIPTION_STORE)) {
          const objectStore = db.createObjectStore(SUBSCRIPTION_STORE, { keyPath: 'id' });
          
          // Create indices for better search performance
          objectStore.createIndex('name', 'name', { unique: false });
          objectStore.createIndex('category', 'category', { unique: false });
          objectStore.createIndex('dueDate', 'dueDate', { unique: false });
        }
        
        // Create config store if it doesn't exist
        if (!db.objectStoreNames.contains(CONFIG_STORE)) {
          db.createObjectStore(CONFIG_STORE, { keyPath: 'key' });
        }
      };
      
      request.onsuccess = function(event) {
        db = event.target.result;
        console.log('Database initialized successfully');
        
        // Handle connection errors
        db.onerror = function(event) {
          console.error('Database error:', event.target.error);
        };
        
        // Load cache on initialization
        refreshCache().then(() => {
          resolve();
        }).catch(error => {
          console.error('Error loading cache:', error);
          reject(error);
        });
      };
      
      // Handle blocked or failed open attempts
      request.onblocked = function() {
        const blockedError = new Error('Database connection blocked. Please close other tabs with this app open.');
        console.error(blockedError);
        reject(blockedError);
      };
    } catch (error) {
      console.error('Fatal database initialization error:', error);
      initFallbackStorage();
      resolve(); // Resolve with fallback
    }
  });
}

/**
 * Fallback to localStorage if IndexedDB is not supported or fails
 * @returns {boolean} True if localStorage is initialized
 */
function initFallbackStorage() {
  console.log('Initializing localStorage fallback');
  
  // Check if localStorage is supported
  if (!window.localStorage) {
    console.error('Neither IndexedDB nor localStorage is supported!');
    return false;
  }
  
  // Load existing data from localStorage if available
  try {
    const storedData = localStorage.getItem('subscriptions');
    if (storedData) {
      subscriptionCache.data = JSON.parse(storedData);
    }
    return true;
  } catch (error) {
    console.error('Error initializing localStorage fallback:', error);
    return false;
  }
}

/**
 * Refresh the cache from the database
 * @returns {Promise} Promise that resolves with the refreshed cache
 */
function refreshCache() {
  return new Promise((resolve, reject) => {
    // If using fallback storage, resolve immediately
    if (!db) {
      resolve(subscriptionCache.data);
      return;
    }
    
    try {
      const transaction = db.transaction([SUBSCRIPTION_STORE], 'readonly');
      const objectStore = transaction.objectStore(SUBSCRIPTION_STORE);
      const request = objectStore.getAll();
      
      request.onsuccess = function(event) {
        subscriptionCache.data = event.target.result;
        resolve(subscriptionCache.data);
      };
      
      request.onerror = function(event) {
        reject(new Error('Error refreshing cache: ' + event.target.error));
      };
      
      // Add transaction error handling
      transaction.onerror = function(event) {
        reject(new Error('Transaction error: ' + event.target.error));
      };
      
      transaction.onabort = function(event) {
        reject(new Error('Transaction aborted: ' + event.target.error));
      };
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Add a subscription to IndexedDB
 * @param {Object} subscription - The subscription object to add
 * @returns {Promise} Promise that resolves with the saved subscription
 */
function addSubscription(subscription) {
  return new Promise((resolve, reject) => {
    // If using fallback storage
    if (!db) {
      try {
        // Generate a unique ID if not provided
        if (!subscription.id) {
          subscription.id = Date.now().toString();
        }
        
        subscriptionCache.data.push(subscription);
        localStorage.setItem('subscriptions', JSON.stringify(subscriptionCache.data));
        resolve(subscription);
        return;
      } catch (error) {
        reject(error);
        return;
      }
    }
    
    try {
      // Generate a unique ID if not provided
      if (!subscription.id) {
        subscription.id = Date.now().toString();
      }
      
      const transaction = db.transaction([SUBSCRIPTION_STORE], 'readwrite');
      const objectStore = transaction.objectStore(SUBSCRIPTION_STORE);
      const request = objectStore.add(subscription);
      
      request.onsuccess = function() {
        // Update cache
        subscriptionCache.data.push(subscription);
        resolve(subscription);
      };
      
      request.onerror = function(event) {
        reject(new Error('Error adding subscription: ' + event.target.error));
      };
      
      // Add transaction error handling
      transaction.onerror = function(event) {
        reject(new Error('Transaction error: ' + event.target.error));
      };
      
      transaction.onabort = function(event) {
        reject(new Error('Transaction aborted: ' + event.target.error));
      };
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Get all subscriptions from IndexedDB
 * @returns {Promise} Promise that resolves with an array of subscriptions
 */
function getAllSubscriptions() {
  // Return cached data if valid
  if (subscriptionCache.isValid()) {
    console.log('Using cached subscription data');
    return Promise.resolve(subscriptionCache.data);
  }
  
  return refreshCache();
}

/**
 * Get a subscription by ID
 * @param {string} id - The subscription ID
 * @returns {Promise} Promise that resolves with the subscription
 */
function getSubscription(id) {
  // Check cache first if it's valid
  if (subscriptionCache.isValid() && subscriptionCache.data) {
    const cachedItem = subscriptionCache.data.find(item => item.id === id);
    if (cachedItem) {
      return Promise.resolve(cachedItem);
    }
  }
  
  return refreshCache().then(data => {
    return data.find(item => item.id === id);
  });
}

/**
 * Update a subscription in IndexedDB
 * @param {Object} subscription - The subscription to update
 * @returns {Promise} Promise that resolves with the updated subscription
 */
function updateSubscription(subscription) {
  return new Promise((resolve, reject) => {
    // If using fallback storage
    if (!db) {
      try {
        const index = subscriptionCache.data.findIndex(s => s.id === subscription.id);
        if (index !== -1) {
          subscriptionCache.data[index] = subscription;
          localStorage.setItem('subscriptions', JSON.stringify(subscriptionCache.data));
          resolve(subscription);
        } else {
          reject(new Error('Subscription not found'));
        }
        return;
      } catch (error) {
        reject(error);
        return;
      }
    }
    
    try {
      const transaction = db.transaction([SUBSCRIPTION_STORE], 'readwrite');
      const objectStore = transaction.objectStore(SUBSCRIPTION_STORE);
      const request = objectStore.put(subscription);
      
      request.onsuccess = function() {
        // Update cache
        const index = subscriptionCache.data.findIndex(s => s.id === subscription.id);
        if (index !== -1) {
          subscriptionCache.data[index] = subscription;
        }
        resolve(subscription);
      };
      
      request.onerror = function(event) {
        reject(new Error('Error updating subscription: ' + event.target.error));
      };
      
      // Add transaction error handling
      transaction.onerror = function(event) {
        reject(new Error('Transaction error: ' + event.target.error));
      };
      
      transaction.onabort = function(event) {
        reject(new Error('Transaction aborted: ' + event.target.error));
      };
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Delete a subscription from IndexedDB
 * @param {string} id - The subscription ID to delete
 * @returns {Promise} Promise that resolves when the subscription is deleted
 */
function deleteSubscription(id) {
  return new Promise((resolve, reject) => {
    // If using fallback storage
    if (!db) {
      try {
        const index = subscriptionCache.data.findIndex(s => s.id === id);
        if (index !== -1) {
          subscriptionCache.data.splice(index, 1);
          localStorage.setItem('subscriptions', JSON.stringify(subscriptionCache.data));
          resolve(true);
        } else {
          reject(new Error('Subscription not found'));
        }
        return;
      } catch (error) {
        reject(error);
        return;
      }
    }
    
    try {
      const transaction = db.transaction([SUBSCRIPTION_STORE], 'readwrite');
      const objectStore = transaction.objectStore(SUBSCRIPTION_STORE);
      const request = objectStore.delete(id);
      
      request.onsuccess = function() {
        // Update cache
        const index = subscriptionCache.data.findIndex(s => s.id === id);
        if (index !== -1) {
          subscriptionCache.data.splice(index, 1);
        }
        resolve(true);
      };
      
      request.onerror = function(event) {
        reject(new Error('Error deleting subscription: ' + event.target.error));
      };
      
      // Add transaction error handling
      transaction.onerror = function(event) {
        reject(new Error('Transaction error: ' + event.target.error));
      };
      
      transaction.onabort = function(event) {
        reject(new Error('Transaction aborted: ' + event.target.error));
      };
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Search for subscriptions by name or category
 * @param {string} query - The search query
 * @returns {Promise} Promise that resolves with matching subscriptions
 */
function searchSubscriptions(query) {
  if (!query || query.trim() === '') {
    return getAllSubscriptions();
  }
  
  query = query.toLowerCase().trim();
  
  // Use cache if available for faster searches
  if (subscriptionCache.isValid() && subscriptionCache.data) {
    return Promise.resolve(
      subscriptionCache.data.filter(sub => 
        sub.name.toLowerCase().includes(query) || 
        sub.category.toLowerCase().includes(query)
      )
    );
  }
  
  return getAllSubscriptions().then(subscriptions => {
    return subscriptions.filter(sub => 
      sub.name.toLowerCase().includes(query) || 
      sub.category.toLowerCase().includes(query)
    );
  });
}

/**
 * Generate a unique ID for a subscription
 * @returns {string} A unique ID
 */
function generateUniqueId() {
  return 'subscription_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

/**
 * Clear all data from the database
 * @returns {Promise} Promise that resolves when the database is cleared
 */
function clearDatabase() {
  return executeTransaction(SUBSCRIPTION_STORE, 'readwrite', store => {
    return new Promise((resolve, reject) => {
      try {
        const request = store.clear();
        
        request.onsuccess = () => {
          // Invalidate cache when all data is cleared
          subscriptionCache.invalidate();
          resolve();
        };
        
        request.onerror = event => {
          console.error('Error clearing database:', event.target.error);
          reject(event.target.error);
        };
      } catch (err) {
        console.error('Transaction error while clearing database:', err);
        reject(err);
      }
    });
  });
}

/**
 * Check if IndexedDB is supported in this browser
 * @returns {boolean} True if IndexedDB is supported
 */
function isIndexedDBSupported() {
  return !!window.indexedDB;
}

// Export the database API
const SubscriptionDB = {
  init: initDB,
  add: addSubscription,
  getAll: getAllSubscriptions,
  get: getSubscription,
  update: updateSubscription,
  delete: deleteSubscription,
  clearAll: clearDatabase,
  isSupported: isIndexedDBSupported,
  search: searchSubscriptions,
  refreshCache: () => subscriptionCache.invalidate(),
  saveConfig: function(key, value) {
    return new Promise((resolve, reject) => {
      if (!db) {
        reject(new Error('Database not initialized'));
        return;
      }
      
      const transaction = db.transaction([CONFIG_STORE], 'readwrite');
      const store = transaction.objectStore(CONFIG_STORE);
      const request = store.put({ key, value });
      
      request.onsuccess = () => {
        resolve(value);
      };
      
      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  },
  getConfig: function(key) {
    return new Promise((resolve, reject) => {
      if (!db) {
        reject(new Error('Database not initialized'));
        return;
      }
      
      const transaction = db.transaction([CONFIG_STORE], 'readonly');
      const store = transaction.objectStore(CONFIG_STORE);
      const request = store.get(key);
      
      request.onsuccess = () => {
        resolve(request.result ? request.result.value : null);
      };
      
      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  }
}; 