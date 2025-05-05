/**
 * IndexedDB Database Manager for Subscription Tracker
 * Handles offline data storage
 */

const DB_NAME = 'subscription-tracker-db';
const DB_VERSION = 1;
const SUBSCRIPTION_STORE = 'subscriptions';

// Database connection
let db;

/**
 * Initialize the database
 * @returns {Promise} Promise that resolves when the database is ready
 */
function initDB() {
  return new Promise((resolve, reject) => {
    if (db) {
      return resolve(db);
    }

    console.log('Opening IndexedDB database...');
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = event => {
      const db = event.target.result;
      console.log('Upgrading IndexedDB database...');

      // Create subscriptions store
      if (!db.objectStoreNames.contains(SUBSCRIPTION_STORE)) {
        const store = db.createObjectStore(SUBSCRIPTION_STORE, { keyPath: 'id' });
        store.createIndex('name', 'name', { unique: false });
        store.createIndex('dueDate', 'dueDate', { unique: false });
        store.createIndex('category', 'category', { unique: false });
        console.log('Created subscriptions store');
      }
    };

    request.onsuccess = event => {
      db = event.target.result;
      console.log('IndexedDB database opened successfully');
      resolve(db);
    };

    request.onerror = event => {
      console.error('IndexedDB error:', event.target.error);
      reject(event.target.error);
    };
  });
}

/**
 * Add a subscription to IndexedDB
 * @param {Object} subscription - The subscription object to add
 * @returns {Promise} Promise that resolves with the saved subscription
 */
function addSubscription(subscription) {
  // Generate a unique ID if one isn't provided
  if (!subscription.id) {
    subscription.id = generateUniqueId();
  }
  
  // Add timestamp
  subscription.updatedAt = new Date().toISOString();
  
  return executeTransaction(SUBSCRIPTION_STORE, 'readwrite', store => {
    return new Promise((resolve, reject) => {
      const request = store.put(subscription);
      
      request.onsuccess = () => {
        resolve(subscription);
      };
      
      request.onerror = event => {
        reject(event.target.error);
      };
    });
  });
}

/**
 * Get all subscriptions from IndexedDB
 * @returns {Promise} Promise that resolves with an array of subscriptions
 */
function getAllSubscriptions() {
  return executeTransaction(SUBSCRIPTION_STORE, 'readonly', store => {
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      
      request.onsuccess = () => {
        resolve(request.result);
      };
      
      request.onerror = event => {
        reject(event.target.error);
      };
    });
  });
}

/**
 * Get a subscription by ID
 * @param {string} id - The subscription ID
 * @returns {Promise} Promise that resolves with the subscription
 */
function getSubscription(id) {
  return executeTransaction(SUBSCRIPTION_STORE, 'readonly', store => {
    return new Promise((resolve, reject) => {
      const request = store.get(id);
      
      request.onsuccess = () => {
        resolve(request.result);
      };
      
      request.onerror = event => {
        reject(event.target.error);
      };
    });
  });
}

/**
 * Update a subscription in IndexedDB
 * @param {Object} subscription - The subscription to update
 * @returns {Promise} Promise that resolves with the updated subscription
 */
function updateSubscription(subscription) {
  // Update timestamp
  subscription.updatedAt = new Date().toISOString();
  
  return executeTransaction(SUBSCRIPTION_STORE, 'readwrite', store => {
    return new Promise((resolve, reject) => {
      const request = store.put(subscription);
      
      request.onsuccess = () => {
        resolve(subscription);
      };
      
      request.onerror = event => {
        reject(event.target.error);
      };
    });
  });
}

/**
 * Delete a subscription from IndexedDB
 * @param {string} id - The subscription ID to delete
 * @returns {Promise} Promise that resolves when the subscription is deleted
 */
function deleteSubscription(id) {
  return executeTransaction(SUBSCRIPTION_STORE, 'readwrite', store => {
    return new Promise((resolve, reject) => {
      const deleteRequest = store.delete(id);
      
      deleteRequest.onsuccess = () => {
        resolve();
      };
      
      deleteRequest.onerror = event => {
        reject(event.target.error);
      };
    });
  });
}

/**
 * Execute a transaction on the database
 * @param {string} storeName - The name of the object store
 * @param {string} mode - The transaction mode ('readonly' or 'readwrite')
 * @param {Function} callback - The function to execute within the transaction
 * @returns {Promise} Promise that resolves with the result of the callback
 */
function executeTransaction(storeName, mode, callback) {
  return initDB().then(db => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, mode);
      const store = transaction.objectStore(storeName);
      
      transaction.oncomplete = () => {
        resolve();
      };
      
      transaction.onerror = event => {
        reject(event.target.error);
      };
      
      resolve(callback(store));
    });
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
      const request = store.clear();
      
      request.onsuccess = () => {
        resolve();
      };
      
      request.onerror = event => {
        reject(event.target.error);
      };
    });
  });
}

// Export the database API
const SubscriptionDB = {
  init: initDB,
  add: addSubscription,
  getAll: getAllSubscriptions,
  get: getSubscription,
  update: updateSubscription,
  delete: deleteSubscription,
  clearAll: clearDatabase
}; 