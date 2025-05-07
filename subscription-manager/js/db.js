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
  async function init() {
    return new Promise((resolve, reject) => {
      try {
        console.log('Opening database connection...');
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onerror = (event) => {
          console.error('Database error:', event.target.error);
          handleDbError(new Error('Failed to open database: ' + event.target.error.message));
          reject(new Error('Failed to open database'));
        };
        
        request.onsuccess = (event) => {
          console.log('Database connection successful');
          db = event.target.result;
          
          // Add error handling for database connection
          db.onerror = (event) => {
            console.error('Database connection error:', event.target.error);
            handleDbError(new Error('Database connection error: ' + event.target.error.message));
          };
          
          // Add version change handling
          db.onversionchange = (event) => {
            console.log('Database version change detected');
            db.close();
            window.location.reload();
          };
          
          console.log('Database initialized successfully');
          resolve();
        };
        
        request.onupgradeneeded = (event) => {
          console.log('Database upgrade needed');
          const db = event.target.result;
          
          try {
            // Create object store for subscriptions
            if (!db.objectStoreNames.contains(SUBSCRIPTION_STORE)) {
              console.log('Creating subscriptions store');
              const store = db.createObjectStore(SUBSCRIPTION_STORE, { keyPath: 'id', autoIncrement: true });
              store.createIndex('name', 'name', { unique: false });
              store.createIndex('category', 'category', { unique: false });
              store.createIndex('dueDate', 'dueDate', { unique: false });
            }
            
            // Create object store for settings
            if (!db.objectStoreNames.contains(CONFIG_STORE)) {
              console.log('Creating config store');
              const settingsStore = db.createObjectStore(CONFIG_STORE, { keyPath: 'key' });
              settingsStore.createIndex('key', 'key', { unique: true });
            }
          } catch (error) {
            console.error('Error during database upgrade:', error);
            handleDbError(new Error('Database upgrade failed: ' + error.message));
            reject(error);
          }
        };
      } catch (error) {
        console.error('Error initializing database:', error);
        handleDbError(new Error('Database initialization failed: ' + error.message));
        reject(error);
      }
    });
  }

  /**
   * Handle database errors
   * @param {Error} error - The error object
   */
  function handleDbError(error) {
    console.error('Database Error:', error);
    
    // Create an error banner
    const errorBanner = document.createElement('div');
    errorBanner.className = 'notification-banner error-banner';
    errorBanner.innerHTML = `
      <div class="notification-content">
        <h3 class="notification-title">Database Error</h3>
        <p>There was a problem loading your subscription data.</p>
        <div class="error-details">
          ${error.message || 'Unknown error occurred'}
        </div>
        <div class="error-actions">
          <button class="btn secondary-btn" id="retryDbBtn">Retry</button>
          <button class="btn danger-btn" id="resetDbBtn">Reset Database</button>
        </div>
      </div>
      <button class="close-btn" id="closeErrorBtn"><i class="fas fa-times"></i></button>
    `;
    
    // Insert at the top of the container
    const container = document.querySelector('.container');
    if (container) {
      container.insertBefore(errorBanner, container.firstChild);
      
      // Add event listeners
      document.getElementById('retryDbBtn').addEventListener('click', () => {
        errorBanner.remove();
        window.location.reload();
      });
      
      document.getElementById('resetDbBtn').addEventListener('click', () => {
        if (confirm('This will delete all your subscription data. Continue?')) {
          resetDatabase()
            .then(() => {
              errorBanner.remove();
              showToast('Database has been reset', 'warning');
              window.location.reload();
            })
            .catch(error => {
              console.error('Error resetting database:', error);
              showToast('Error resetting database', 'error');
            });
        }
      });
      
      document.getElementById('closeErrorBtn').addEventListener('click', () => {
        errorBanner.remove();
      });
    }
  }

  /**
   * Reset the database
   * @returns {Promise} Promise that resolves when the database is reset
   */
  async function resetDatabase() {
    return new Promise((resolve, reject) => {
      try {
        const request = indexedDB.deleteDatabase(DB_NAME);
        
        request.onerror = (event) => {
          console.error('Error deleting database:', event.target.error);
          reject(new Error('Failed to delete database'));
        };
        
        request.onsuccess = () => {
          console.log('Database deleted successfully');
          resolve();
        };
      } catch (error) {
        console.error('Error resetting database:', error);
        reject(error);
      }
    });
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
    init: init,
    
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
    },
    
    // Reset the database
    resetDatabase: resetDatabase,
    
    // Handle database errors
    handleDbError: handleDbError
  };
})(); 