/**
 * IndexedDB Database Manager for Subscription Tracker
 * Handles offline data storage
 */

// Create a global SubscriptionDB namespace
window.SubscriptionDB = (function() {
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
          
          // Initialize cache with empty array if needed
          if (!subscriptionCache.data) {
            subscriptionCache.data = [];
          }
          
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
      } else {
        // Initialize with empty array if no data exists
        subscriptionCache.data = [];
      }
      return true;
    } catch (error) {
      console.error('Error initializing localStorage fallback:', error);
      // Initialize with empty array on error
      subscriptionCache.data = [];
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
          subscriptionCache.update(event.target.result);
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

  // Return the public API
  return {
    // Initialize the database
    init: function() {
      return initDB();
    },
    
    // Check if IndexedDB is supported
    isSupported: function() {
      return !!window.indexedDB;
    },
    
    // Get all subscriptions
    getAll: function() {
      return new Promise((resolve, reject) => {
        if (subscriptionCache.isValid()) {
          return resolve(subscriptionCache.data || []);
        }
        
        refreshCache()
          .then(data => resolve(data || []))
          .catch(error => reject(error));
      });
    },
    
    // Get a subscription by ID
    get: function(id) {
      return new Promise((resolve, reject) => {
        // If we have a valid cache, use it
        if (subscriptionCache.isValid() && subscriptionCache.data) {
          const subscription = subscriptionCache.data.find(sub => sub.id === id);
          return resolve(subscription);
        }
        
        // Otherwise query the database
        if (!db) {
          return this.getAll().then(data => {
            const subscription = data.find(sub => sub.id === id);
            resolve(subscription);
          });
        }
        
        try {
          const transaction = db.transaction([SUBSCRIPTION_STORE], 'readonly');
          const objectStore = transaction.objectStore(SUBSCRIPTION_STORE);
          const request = objectStore.get(id);
          
          request.onsuccess = function(event) {
            resolve(event.target.result);
          };
          
          request.onerror = function(event) {
            reject(new Error('Error getting subscription: ' + event.target.error));
          };
        } catch (error) {
          reject(error);
        }
      });
    },
    
    // Add a subscription
    add: function(subscription) {
      // Generate an ID if not provided
      if (!subscription.id) {
        subscription.id = Date.now().toString();
      }
      
      // Set createdAt if not provided
      if (!subscription.createdAt) {
        subscription.createdAt = new Date().toISOString();
      }
      
      return new Promise((resolve, reject) => {
        // If using fallback storage
        if (!db) {
          try {
            // Initialize if needed
            if (!subscriptionCache.data) {
              subscriptionCache.data = [];
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
          const transaction = db.transaction([SUBSCRIPTION_STORE], 'readwrite');
          const objectStore = transaction.objectStore(SUBSCRIPTION_STORE);
          const request = objectStore.add(subscription);
          
          request.onsuccess = function(event) {
            // Update cache
            subscriptionCache.invalidate();
            // Get all subscriptions to update cache
            refreshCache().then(() => {
              resolve(subscription);
            });
          };
          
          request.onerror = function(event) {
            reject(new Error('Error adding subscription: ' + event.target.error));
          };
        } catch (error) {
          reject(error);
        }
      });
    },
    
    // Update a subscription
    update: function(subscription) {
      return new Promise((resolve, reject) => {
        // If using fallback storage
        if (!db) {
          try {
            const index = subscriptionCache.data.findIndex(s => s.id === subscription.id);
            if (index === -1) {
              return reject(new Error('Subscription not found'));
            }
            
            subscriptionCache.data[index] = subscription;
            localStorage.setItem('subscriptions', JSON.stringify(subscriptionCache.data));
            resolve(subscription);
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
          
          request.onsuccess = function(event) {
            // Update cache
            subscriptionCache.invalidate();
            // Get all subscriptions to update cache
            refreshCache().then(() => {
              resolve(subscription);
            });
          };
          
          request.onerror = function(event) {
            reject(new Error('Error updating subscription: ' + event.target.error));
          };
        } catch (error) {
          reject(error);
        }
      });
    },
    
    // Delete a subscription
    delete: function(id) {
      return new Promise((resolve, reject) => {
        // If using fallback storage
        if (!db) {
          try {
            const index = subscriptionCache.data.findIndex(s => s.id === id);
            if (index === -1) {
              return reject(new Error('Subscription not found'));
            }
            
            subscriptionCache.data.splice(index, 1);
            localStorage.setItem('subscriptions', JSON.stringify(subscriptionCache.data));
            resolve(true);
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
          
          request.onsuccess = function(event) {
            // Update cache
            subscriptionCache.invalidate();
            // Get all subscriptions to update cache
            refreshCache().then(() => {
              resolve(true);
            });
          };
          
          request.onerror = function(event) {
            reject(new Error('Error deleting subscription: ' + event.target.error));
          };
        } catch (error) {
          reject(error);
        }
      });
    },
    
    // Search subscriptions
    search: function(query) {
      return new Promise((resolve, reject) => {
        this.getAll().then(subscriptions => {
          // If no query, return all
          if (!query) {
            return resolve(subscriptions);
          }
          
          // Search by name, category
          const results = subscriptions.filter(sub => {
            const lowerQuery = query.toLowerCase();
            return (
              sub.name.toLowerCase().includes(lowerQuery) ||
              sub.category.toLowerCase().includes(lowerQuery)
            );
          });
          
          resolve(results);
        }).catch(reject);
      });
    },
    
    // Clear all data
    clear: function() {
      return new Promise((resolve, reject) => {
        // If using fallback storage
        if (!db) {
          try {
            localStorage.removeItem('subscriptions');
            subscriptionCache.data = [];
            resolve(true);
            return;
          } catch (error) {
            reject(error);
            return;
          }
        }
        
        try {
          const transaction = db.transaction([SUBSCRIPTION_STORE], 'readwrite');
          const objectStore = transaction.objectStore(SUBSCRIPTION_STORE);
          const request = objectStore.clear();
          
          request.onsuccess = function(event) {
            // Update cache
            subscriptionCache.data = [];
            subscriptionCache.timestamp = Date.now();
            resolve(true);
          };
          
          request.onerror = function(event) {
            reject(new Error('Error clearing subscriptions: ' + event.target.error));
          };
        } catch (error) {
          reject(error);
        }
      });
    },
    
    // Refresh cache
    refreshCache: function() {
      return subscriptionCache.invalidate();
    },
    
    // Save config
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
    
    // Get config
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
})(); 