/*
 * Subscription Tracker App
 * Version: 1.1.0
 * Last Updated: Force Vercel redeploy
 */

/**
 * Subscription Tracker App - Performance Optimized
 * App initialization and performance enhancements
 */

// Performance optimizations
(function() {
  // Cache important DOM selectors to avoid repetitive queries
  window.domCache = {};
  
  // Defer non-critical tasks until page is fully loaded and idle
  const deferredTasks = [];
  
  // Add task to deferred queue
  function deferTask(task, priority = 'low') {
    deferredTasks.push({ task, priority });
  }
  
  // Execute deferred tasks when browser is idle
  function executeDeferredTasks() {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(function(deadline) {
        while (deadline.timeRemaining() > 0 && deferredTasks.length > 0) {
          // Execute high priority tasks first
          const highPriorityTaskIndex = deferredTasks.findIndex(item => item.priority === 'high');
          const taskIndex = highPriorityTaskIndex !== -1 ? highPriorityTaskIndex : 0;
          const { task } = deferredTasks.splice(taskIndex, 1)[0];
          
          try {
            task();
          } catch (error) {
            console.error('Error in deferred task:', error);
          }
        }
        
        // If we still have tasks, request another callback
        if (deferredTasks.length > 0) {
          executeDeferredTasks();
        }
      }, { timeout: 1000 });
    } else {
      // Fallback for browsers without requestIdleCallback
      setTimeout(() => {
        deferredTasks.forEach(({ task }) => {
          try {
            task();
          } catch (error) {
            console.error('Error in deferred task:', error);
          }
        });
        deferredTasks.length = 0;
      }, 200);
    }
  }
  
  // Optimization: Cache critical DOM elements on load
  function cacheDOMElements() {
    const elementsToCache = [
      'totalMonthly',
      'budgetProgressBar', 
      'budgetValueDisplay',
      'budgetPercentage',
      'currentSpending',
      'budgetRemaining',
      'budgetAlert',
      'subscriptionCards',
      'searchInput',
      'filterCategory',
      'categoryChart',
      'connectionStatus',
      'connectionText'
    ];
    
    elementsToCache.forEach(id => {
      const element = document.getElementById(id);
      if (element) {
        domCache[id] = element;
      }
    });
    
    // Cache form elements
    domCache.subscriptionForm = document.getElementById('subscriptionForm');
    domCache.editSubscriptionForm = document.getElementById('editSubscriptionForm');
  }
  
  // Optimize animations by checking if animation API is supported
  function setupPerformantAnimations() {
    if (!window.gsap && 'animate' in Element.prototype) {
      // Web Animation API as fallback when GSAP is not loaded
      window.animateElement = function(element, initialDelay = 0) {
        if (!element) return;
        
        element.animate([
          { opacity: 0, transform: 'translateY(20px)' },
          { opacity: 1, transform: 'translateY(0)' }
        ], {
          duration: 400,
          easing: 'ease-out',
          delay: initialDelay,
          fill: 'forwards'
        });
      };
    }
  }
  
  // Optimize image loading by using IntersectionObserver
  function setupLazyLoading() {
    if ('IntersectionObserver' in window) {
      const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            const src = img.getAttribute('data-src');
            
            if (src) {
              img.src = src;
              img.removeAttribute('data-src');
            }
            
            observer.unobserve(img);
          }
        });
      });
      
      // Get all images with data-src attribute
      document.querySelectorAll('img[data-src]').forEach(img => {
        imageObserver.observe(img);
      });
    } else {
      // Fallback for older browsers
      document.querySelectorAll('img[data-src]').forEach(img => {
        img.src = img.getAttribute('data-src');
      });
    }
  }
  
  // Set up performance monitoring
  function initPerformanceMonitoring() {
    if ('performance' in window && 'mark' in performance) {
      // Mark key moments
      performance.mark('app-init-start');
      
      window.addEventListener('load', () => {
        performance.mark('app-load-complete');
        performance.measure('app-init-to-load', 'app-init-start', 'app-load-complete');
      });
      
      // Custom metric for time to interactive
      deferTask(() => {
        performance.mark('app-interactive');
        performance.measure('time-to-interactive', 'app-init-start', 'app-interactive');
      }, 'high');
    }
  }
  
  // Initialize all performance optimizations
  function initializePerformanceOptimizations() {
    // Initialize performance monitoring
    initPerformanceMonitoring();
    
    // Cache DOM elements (high priority)
    cacheDOMElements();
    
    // Add remaining tasks to defer queue
    deferTask(setupPerformantAnimations, 'medium');
    deferTask(setupLazyLoading, 'medium');
    
    // Start executing deferred tasks when page is loaded
    if (document.readyState === 'complete') {
      executeDeferredTasks();
    } else {
      window.addEventListener('load', executeDeferredTasks);
    }
  }
  
  // Provide these functions globally
  window.appPerformance = {
    deferTask,
    executeDeferredTasks,
    cacheDOMElements
  };
  
  // Initialize performance optimizations
  initializePerformanceOptimizations();
})();

// Optimized debounce function
function debounce(func, wait = 200, immediate = false) {
  let timeout;
  return function(...args) {
    const context = this;
    const later = function() {
      timeout = null;
      if (!immediate) func.apply(context, args);
    };
    const callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func.apply(context, args);
  };
}

// Throttle function to limit execution frequency
function throttle(func, limit = 100) {
  let inThrottle;
  return function(...args) {
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

// Constants for billing cycle conversions (cached to avoid recalculation)
// This variable is also referenced in budget-analytics.js
window.BILLING_CYCLE_FACTORS = {
  'monthly': 1,
  'yearly': 1/12,
  'quarterly': 1/3,
  'weekly': 4.33, // Average weeks in a month
  'biweekly': 2.17, // Average bi-weekly periods in a month
  'daily': 30.42 // Average days in a month
};

// Application state management (to avoid excessive DOM manipulation)
const appState = {
  subscriptions: [],
  filteredSubscriptions: [],
  currentFilter: 'all',
  searchQuery: '',
  isDarkMode: false,
  currency: '₹',
  budget: {
    monthly: 0,
    yearly: 0,
    currentPeriod: 'monthly'
  },
  
  // Update state and trigger UI update only when needed
  updateSubscriptions(newSubscriptions) {
    this.subscriptions = newSubscriptions;
    this.applyFilters();
    this.notifySubscriptionChange();
  },
  
  // Apply filters and search
  applyFilters() {
    let filtered = [...this.subscriptions];
    
    // Apply category filter
    if (this.currentFilter !== 'all') {
      filtered = filtered.filter(sub => sub.category === this.currentFilter);
    }
    
    // Apply search filter
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(sub => {
        return sub.name.toLowerCase().includes(query) || 
               sub.category.toLowerCase().includes(query);
      });
    }
    
    this.filteredSubscriptions = filtered;
    return filtered;
  },
  
  // Notify subscription change
  notifySubscriptionChange() {
    document.dispatchEvent(new CustomEvent('subscriptions-updated', {
      detail: {
        subscriptions: this.subscriptions,
        filteredSubscriptions: this.filteredSubscriptions
      }
    }));
  }
};

// Subscription Manager - Main JavaScript File
//
// This app is designed to work completely offline and stores all your
// subscription data locally on your device using IndexedDB storage.
//
// To install this app as a PWA (Progressive Web App):
// 1. Open the app in Chrome or Edge browser
// 2. Click the install icon in the address bar (or find "Install app" in the menu)
// 3. Follow the prompts to install
// 4. The app will appear on your home screen or Start menu

// Temporary ID for test data
let tempIdCounter = 1;
let isOnline = navigator.onLine;
let syncInProgress = false;

async function initApp() {
    console.log('Starting application initialization...');
    const loader = document.querySelector('.app-loader');
    
    try {
        // Show loader and remove any existing error banners
        if (loader) {
            loader.classList.remove('hidden');
        }
        const existingError = document.querySelector('.error-banner');
        if (existingError) {
            existingError.remove();
        }

        // Create missing elements if they don't exist
        const requiredElements = {
            'subscriptionList': {
                tag: 'div',
                className: 'subscription-list',
                parent: '.main-content',
                content: '<!-- Subscription cards will be added here dynamically -->'
            },
            'subscriptionForm': {
                tag: 'form',
                className: 'subscription-form',
                parent: '.add-subscription',
                content: ''
            },
            'categoryChart': {
                tag: 'canvas',
                className: 'chart-container',
                parent: '.summary-box .chart-container',
                content: ''
            },
            'totalSubscriptions': {
                tag: 'div',
                className: 'total-subscriptions',
                parent: '.summary-box .total-box',
                content: '0'
            },
            'monthlyCost': {
                tag: 'div',
                className: 'total-amount',
                parent: '.summary-box .total-box',
                content: '0.00'
            },
            'upcomingPayments': {
                tag: 'div',
                className: 'reminders-list',
                parent: '.upcoming-reminders',
                content: `
                    <div class="empty-reminders">
                        <i class="fas fa-bell-slash"></i>
                        <p>No upcoming reminders. Add subscriptions with reminders enabled to see them here.</p>
                    </div>
                `
            }
        };

        // Create missing elements
        for (const [id, config] of Object.entries(requiredElements)) {
            if (!document.getElementById(id)) {
                console.log(`Creating missing element: ${id}`);
                const element = document.createElement(config.tag);
                element.id = id;
                element.className = config.className;
                element.innerHTML = config.content;

                const parent = document.querySelector(config.parent);
                if (parent) {
                    parent.appendChild(element);
                } else {
                    console.warn(`Parent element not found for ${id}: ${config.parent}`);
                }
            }
        }

        // Initialize database with retry mechanism
        let dbInitialized = false;
        let attempts = 0;
        const maxAttempts = 3;

        while (!dbInitialized && attempts < maxAttempts) {
            attempts++;
            console.log(`Attempting database initialization (attempt ${attempts}/${maxAttempts})`);
            try {
                await initDB();
                dbInitialized = true;
                console.log('Database initialized successfully');
            } catch (error) {
                console.error(`Database initialization attempt ${attempts} failed:`, error);
                if (attempts === maxAttempts) {
                    throw error;
                }
                await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
            }
        }

        // Initialize theme and settings
        initializeTheme();
        setupSettingsPanel();
        initializeSettingsContent();

        // Load subscriptions and setup event listeners
        await loadSubscriptions();
        setupEventListeners();

        // Initialize chart if Chart.js is available
        if (typeof Chart !== 'undefined') {
            try {
                const ctx = document.getElementById('categoryChart');
                if (ctx) {
                    const subscriptions = appState.subscriptions;
                    const categoryTotals = {};
                    subscriptions.forEach(sub => {
                        const amount = parseFloat(sub.amount);
                        const category = sub.category;
                        categoryTotals[category] = (categoryTotals[category] || 0) + amount;
                    });

                    new Chart(ctx, {
                        type: 'doughnut',
                        data: {
                            labels: Object.keys(categoryTotals).map(cat => capitalizeFirstLetter(cat)),
                            datasets: [{
                                data: Object.values(categoryTotals),
                                backgroundColor: [
                                    '#4361ee',
                                    '#3f37c9',
                                    '#4895ef',
                                    '#4cc9f0',
                                    '#f72585',
                                    '#b5179e'
                                ],
                                borderWidth: 0
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                                legend: {
                                    position: 'bottom',
                                    labels: {
                                        padding: 20,
                                        usePointStyle: true
                                    }
                                }
                            },
                            cutout: '70%'
                        }
                    });
                }
            } catch (error) {
                console.warn('Failed to initialize chart:', error);
            }
        } else {
            console.warn('Chart.js not available');
        }

        console.log('Application initialized successfully');
    } catch (error) {
        console.error('Application initialization failed:', error);
        showDatabaseError(error);
    } finally {
        // Hide loader
        if (loader) {
            loader.classList.add('hidden');
        }
    }
}

// Show database error
function showDatabaseError(error) {
    const errorBanner = document.createElement('div');
    errorBanner.className = 'error-banner';
    errorBanner.innerHTML = `
        <div class="error-content">
            <span>Failed to initialize the application: ${error.message}</span>
            <button class="retry-btn" onclick="window.location.reload()">Retry</button>
        </div>
    `;
    document.body.appendChild(errorBanner);
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initApp);

// Setup all event listeners
function setupEventListeners() {
    console.log('Setting up event listeners...');
    
    // Setup form listener
    const form = document.getElementById('subscriptionForm');
    if (form) {
        form.addEventListener('submit', handleFormSubmit);
    }

    // Setup category filter
    const filterSelect = document.getElementById('filterCategory');
    if (filterSelect) {
        filterSelect.addEventListener('change', handleCategoryFilter);
    }

    // Setup search
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', handleSearch);
    }

    // Setup settings panel
    const settingsButton = document.getElementById('settingsButton');
    if (settingsButton) {
        settingsButton.addEventListener('click', toggleSettingsPanel);
    }

    // Setup dark mode toggle
    const darkModeToggle = document.getElementById('darkMode');
    if (darkModeToggle) {
        darkModeToggle.addEventListener('change', handleDarkModeToggle);
    }

    // Setup reminders section
    setupRemindersSection();
}

// Handle form submission
function handleFormSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const subscription = {
        name: formData.get('subscriptionName'),
        amount: parseFloat(formData.get('subscriptionAmount')),
        billingCycle: formData.get('billingCycle'),
        dueDate: formData.get('dueDate'),
        category: formData.get('category'),
        reminderEnabled: formData.get('enableReminder') === 'on',
        reminderEmailEnabled: formData.get('enableEmailReminder') === 'on',
        reminderDays: formData.get('reminderDays') || '3'
    };

    if (subscription.reminderEmailEnabled) {
        subscription.reminderEmail = formData.get('reminderEmailAdd');
    }

    saveSubscription(subscription)
        .then(() => {
            event.target.reset();
            showToast('Subscription added successfully');
            loadSubscriptions();
        })
        .catch(error => {
            console.error('Error adding subscription:', error);
            showToast('Error adding subscription. Please try again.');
        });
}

// Handle category filter
function handleCategoryFilter(event) {
    const selectedCategory = event.target.value;
    appState.currentFilter = selectedCategory;
    appState.applyFilters();
    loadSubscriptions();
}

// Handle search
function handleSearch(event) {
    appState.searchQuery = event.target.value.toLowerCase();
    appState.applyFilters();
    loadSubscriptions();
}

// Handle dark mode toggle
function handleDarkModeToggle(event) {
    const isDarkMode = event.target.checked;
    document.body.classList.toggle('dark-mode', isDarkMode);
    localStorage.setItem('darkMode', isDarkMode);
}

// Setup reminders section event listeners
function setupRemindersSection() {
    const viewAllBtn = document.querySelector('.view-all-btn');
    if (viewAllBtn) {
        viewAllBtn.addEventListener('click', () => {
            // Navigate to reminders page
            window.location.href = 'reminders.html';
            
            // Haptic feedback
            if (navigator.vibrate) navigator.vibrate(30);
        });
    }
}

// Show the app loader
function showAppLoader() {
    console.log('Showing app loader');
    const loader = document.querySelector('.app-loader');
    if (loader) {
        loader.classList.add('active');
    }
}

// Hide the app loader
function hideAppLoader() {
    console.log('Hiding app loader');
    const loader = document.querySelector('.app-loader');
    if (loader) {
        loader.classList.remove('active');
    }
}

// Start page animations with requestAnimationFrame for better performance
function startPageAnimations() {
    // Use requestAnimationFrame to batch animations in the browser's render cycle
    requestAnimationFrame(() => {
        // Animate elements with the animate-in class
        const animatedElements = document.querySelectorAll('.animate-in');
        
        // Only animate if elements exist
        if (animatedElements.length === 0) return;
        
        // Use IntersectionObserver for more efficient animations
        if ('IntersectionObserver' in window) {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('animate-fade-in');
                        observer.unobserve(entry.target);
                    }
                });
            }, {
                root: null,
                threshold: 0.1,
                rootMargin: '0px 0px 50px 0px'
            });
            
            animatedElements.forEach((element) => {
                observer.observe(element);
            });
        } else {
            // Fallback for browsers without IntersectionObserver
            animatedElements.forEach((element, index) => {
                // Add staggered delay
                setTimeout(() => {
                    element.classList.add('animate-fade-in');
                }, index * 80); // Reduce delay for better performance
            });
        }
        
        // Use GSAP for subscription cards animation if available
        if (window.gsap && document.querySelector('.subscription-card')) {
            gsap.from('.subscription-card', {
                duration: 0.4, // Faster animation
                opacity: 0,
                y: 20,
                stagger: 0.05, // Faster stagger
                ease: "power1.out"
            });
        }
    });
}

// Animate an element when it's added to the DOM
function animateElement(element) {
    // Add animation class with GSAP if available
    if (window.gsap) {
        gsap.from(element, {
            duration: 0.4,
            opacity: 0,
            y: 20,
            ease: "power2.out"
        });
    } else {
        // Fallback to CSS animation
        element.classList.add('animate-in');
        setTimeout(() => {
            element.classList.add('animate-fade-in');
        }, 10);
    }
}

// Handle online/offline status changes
function handleOnlineStatusChange() {
    isOnline = navigator.onLine;
    updateOnlineStatus();
    
    if (!isOnline) {
        showToast('You are offline. Changes will be saved locally.');
    } else {
        showToast('Back online!');
    }
}

// Update UI to reflect online status
function updateOnlineStatus() {
    const status = document.getElementById('connectionStatus');
    const text = document.getElementById('connectionText');
    
    if (isOnline) {
        document.body.classList.remove('offline-mode');
        status.classList.remove('offline');
        status.classList.add('online', 'visible');
        text.textContent = 'Online';
        
        // Auto-hide after 3 seconds if we're online
        setTimeout(() => {
            if (isOnline) {
                status.classList.remove('visible');
            }
        }, 3000);
    } else {
        document.body.classList.add('offline-mode');
        status.classList.remove('online');
        status.classList.add('offline', 'visible');
        text.textContent = 'Offline';
    }
}

// Show the sync indicator
function showSyncIndicator(show, message) {
    const status = document.getElementById('connectionStatus');
    const text = document.getElementById('connectionText');
    
    if (show) {
        status.classList.add('syncing', 'visible');
        text.textContent = message || 'Syncing...';
    } else {
        status.classList.remove('syncing');
        text.textContent = isOnline ? 'Online' : 'Offline';
        
        // Show a toast with the completion message
        if (message) {
            showToast(message);
        }
        
        // Auto-hide after delay if we're online
        if (isOnline) {
            setTimeout(() => {
                status.classList.remove('visible');
            }, 3000);
        }
    }
}

// Sync data with server
function syncData() {
    if (!isOnline || syncInProgress) return;
    
    syncInProgress = true;
    showSyncIndicator(true);
    
    SubscriptionDB.sync()
        .then(() => {
            syncInProgress = false;
            showSyncIndicator(false, 'Sync completed');
            // Reload subscriptions to ensure UI is up to date
            loadSubscriptions();
        })
        .catch(error => {
            syncInProgress = false;
            showSyncIndicator(false, 'Sync failed');
            console.error('Sync failed:', error);
        });
}

// Load subscriptions with optimized rendering
function loadSubscriptions() {
    return new Promise((resolve, reject) => {
        // Cache DOM elements for better performance
        const subscriptionCards = document.getElementById('subscriptionCards');
        const emptyState = document.querySelector('.empty-state');
        
        if (!subscriptionCards) {
            reject(new Error('Subscription cards container not found'));
            return;
        }
        
        // Clear existing cards
        subscriptionCards.innerHTML = '';
        
        // Get subscriptions from DB
        SubscriptionDB.getAll()
            .then(subscriptions => {
                // Update app state
                appState.subscriptions = subscriptions;
                appState.filteredSubscriptions = appState.applyFilters();
                
                // Handle empty state
                if (subscriptions.length === 0) {
                    if (emptyState) {
                        emptyState.style.display = 'flex';
                    }
                    resolve(subscriptions);
                    return;
                }
                
                // Hide empty state
                if (emptyState) {
                    emptyState.style.display = 'none';
                }
                
                // Use document fragment for better performance
                const fragment = document.createDocumentFragment();
                
                // Process in batches for better responsiveness
                const batchSize = 10;
                let currentIndex = 0;
                
                function processBatch() {
                    const endIndex = Math.min(currentIndex + batchSize, appState.filteredSubscriptions.length);
                    
                    for (let i = currentIndex; i < endIndex; i++) {
                        const subscription = appState.filteredSubscriptions[i];
                        const card = createSubscriptionCard(subscription);
                        fragment.appendChild(card);
                    }
                    
                    currentIndex = endIndex;
                    
                    if (currentIndex < appState.filteredSubscriptions.length) {
                        setTimeout(processBatch, 0);
                    } else {
                        subscriptionCards.appendChild(fragment);
                        updateTotalAmount(subscriptions);
                        updateCategoryChart(subscriptions);
                        loadUpcomingReminders(subscriptions);
                        resolve(subscriptions);
                    }
                }
                
                processBatch();
            })
            .catch(error => {
                console.error('Error loading subscriptions:', error);
                reject(error);
            });
    });
}

// Load upcoming reminders for the main page
function loadUpcomingReminders(subscriptions) {
    const remindersList = document.getElementById('upcomingRemindersList');
    if (!remindersList) return;
    
    // Clear existing reminders
    remindersList.innerHTML = '';
    
    // Filter subscriptions with reminders enabled
    const remindersEnabled = subscriptions.filter(sub => sub.reminderEnabled || sub.reminderEmailEnabled);
    
    if (remindersEnabled.length === 0) {
        // Show empty state if no reminders
        remindersList.innerHTML = `
            <div class="empty-reminders">
                <i class="fas fa-bell-slash"></i>
                <p>No upcoming reminders. Add subscriptions with reminders enabled to see them here.</p>
            </div>
        `;
        return;
    }
    
    // Sort subscriptions by due date
    const sortedSubs = remindersEnabled.sort((a, b) => {
        return new Date(a.dueDate) - new Date(b.dueDate);
    });
    
    // Display only the first 5 upcoming reminders
    const today = new Date();
    
    // Take just the first 5 upcoming reminders
    sortedSubs.slice(0, 5).forEach(sub => {
        const dueDate = new Date(sub.dueDate);
        const diffTime = dueDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        // Format date for display
        const formattedDate = dueDate.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
        
        // Determine status tag
        let tagClass, tagText;
        if (diffDays <= 3) {
            tagClass = 'tag-urgent';
            tagText = diffDays <= 0 ? 'Due Today' : diffDays === 1 ? 'Tomorrow' : `${diffDays} Days Left`;
        } else if (diffDays <= 7) {
            tagClass = 'tag-upcoming';
            tagText = `${diffDays} Days Left`;
        } else {
            tagClass = 'tag-far';
            tagText = `${diffDays} Days Left`;
        }
        
        // Create reminder item
        const reminderItem = document.createElement('div');
        reminderItem.className = 'reminder-item';
        reminderItem.dataset.id = sub.id;
        
        // Generate notification settings HTML
        const notificationSettings = `
            <div class="notification-settings">
                <div class="notification-toggle">
                    <span class="toggle-label">Push</span>
                    <label class="switch switch-small">
                        <input type="checkbox" class="reminder-push-toggle" ${sub.reminderEnabled ? 'checked' : ''}>
                        <span class="slider round"></span>
                    </label>
                </div>
                <div class="notification-toggle">
                    <span class="toggle-label">Email</span>
                    <label class="switch switch-small">
                        <input type="checkbox" class="reminder-email-toggle" ${sub.reminderEmailEnabled ? 'checked' : ''}>
                        <span class="slider round"></span>
                    </label>
                </div>
            </div>
        `;
        
        reminderItem.innerHTML = `
            <div class="reminder-item-content">
                <div class="reminder-item-title">${sub.name}</div>
                <div class="reminder-item-date">${formattedDate} (${sub.billingCycle})</div>
                ${notificationSettings}
            </div>
            <div class="reminder-status-tag ${tagClass}">${tagText}</div>
        `;
        
        // Add click event to navigate to reminders page
        reminderItem.addEventListener('click', (e) => {
            // If the user clicked on a toggle, don't navigate
            if (e.target.closest('.switch') || e.target.closest('.notification-toggle')) {
                e.stopPropagation();
                return;
            }
            
            window.location.href = 'reminders.html';
        });
        
        // Add event listeners for toggles
        const pushToggle = reminderItem.querySelector('.reminder-push-toggle');
        const emailToggle = reminderItem.querySelector('.reminder-email-toggle');
        
        if (pushToggle) {
            pushToggle.addEventListener('change', (e) => {
                e.stopPropagation(); // Prevent navigation
                
                // Update subscription in database
                SubscriptionDB.get(sub.id)
                    .then(subscription => {
                        if (subscription) {
                            subscription.reminderEnabled = pushToggle.checked;
                            return SubscriptionDB.update(subscription);
                        }
                    })
                    .then(() => {
                        // Show confirmation
                        showToast(`Push notifications ${pushToggle.checked ? 'enabled' : 'disabled'} for ${sub.name}`);
                        
                        // Haptic feedback
                        if (navigator.vibrate) navigator.vibrate(30);
                    })
                    .catch(error => {
                        console.error('Error updating reminder settings:', error);
                        showToast('Error updating reminder settings');
                        
                        // Restore previous state
                        pushToggle.checked = !pushToggle.checked;
                    });
            });
        }
        
        if (emailToggle) {
            emailToggle.addEventListener('change', (e) => {
                e.stopPropagation(); // Prevent navigation
                
                // If enabling email but no email address set, show prompt
                if (emailToggle.checked && (!sub.reminderEmail || sub.reminderEmail.trim() === '')) {
                    const email = prompt('Please enter your email address for notifications:');
                    
                    if (!email || !isValidEmail(email)) {
                        showToast('Please enter a valid email address');
                        emailToggle.checked = false;
                        return;
                    }
                    
                    // Get the subscription from the database
                    SubscriptionDB.get(sub.id)
                        .then(subscription => {
                            if (subscription) {
                                subscription.reminderEmailEnabled = true;
                                subscription.reminderEmail = email;
                                return SubscriptionDB.update(subscription);
                            }
                        })
                        .then(() => {
                            // Show confirmation
                            showToast(`Email notifications enabled for ${sub.name}`);
                            
                            // Haptic feedback
                            if (navigator.vibrate) navigator.vibrate(30);
                        })
                        .catch(error => {
                            console.error('Error updating reminder settings:', error);
                            showToast('Error updating reminder settings');
                            
                            // Restore previous state
                            emailToggle.checked = false;
                        });
                } else {
                    // Update subscription in database
                    SubscriptionDB.get(sub.id)
                        .then(subscription => {
                            if (subscription) {
                                subscription.reminderEmailEnabled = emailToggle.checked;
                                return SubscriptionDB.update(subscription);
                            }
                        })
                        .then(() => {
                            // Show confirmation
                            showToast(`Email notifications ${emailToggle.checked ? 'enabled' : 'disabled'} for ${sub.name}`);
                            
                            // Haptic feedback
                            if (navigator.vibrate) navigator.vibrate(30);
                        })
                        .catch(error => {
                            console.error('Error updating reminder settings:', error);
                            showToast('Error updating reminder settings');
                            
                            // Restore previous state
                            emailToggle.checked = !emailToggle.checked;
                        });
                }
            });
        }
        
        remindersList.appendChild(reminderItem);
    });
}

// Save subscription to IndexedDB
function saveSubscription(subscription) {
    // Save to IndexedDB
    SubscriptionDB.add(subscription)
        .then(savedSubscription => {
            // Clear the form
            const subscriptionForm = document.getElementById('subscriptionForm');
            if (subscriptionForm) {
                subscriptionForm.reset();
            }
            
            // Update total amount and chart - this will also reload the subscription cards
            loadSubscriptions();
            
            // Show toast
            showToast('Subscription added successfully');
            
            // Haptic feedback
            if (navigator.vibrate) {
                navigator.vibrate([50, 30, 100]);
            }
        })
        .catch(error => {
            console.error('Error saving subscription to IndexedDB:', error);
            showToast('Error adding subscription. Please try again.');
        });
}

// Delete subscription
function deleteSubscription(id) {
    if (confirm('Are you sure you want to delete this subscription?')) {
        // Delete from IndexedDB
        SubscriptionDB.delete(id)
            .then(() => {
                // Remove from UI
                const card = document.getElementById(`subscription-${id}`);
                if (card) {
                    card.remove();
                }
                
                // Update total amount and chart
                loadSubscriptions();
                
                // Show toast
                showToast('Subscription deleted');
            })
            .catch(error => {
                console.error('Error deleting subscription from IndexedDB:', error);
                showToast('Error deleting subscription. Please try again.');
            });
    }
}

/**
 * Update UI with subscription data
 * @param {Array} subscriptions - The list of subscriptions to display
 */
function updateUI(subscriptions) {
    console.log('updateUI called with', subscriptions ? subscriptions.length : 0, 'subscriptions');
    
    // Try to get the main container, fall back to the fallback container if needed
    let subscriptionsList = document.getElementById('subscriptionCards');
    
    // If main container not found, try to use the fallback
    if (!subscriptionsList) {
        console.warn('Main subscriptionCards container not found in updateUI, trying fallback');
        subscriptionsList = document.getElementById('subscriptionCardsFallback');
        
        // Make the fallback visible if it exists
        if (subscriptionsList) {
            subscriptionsList.style.display = 'block';
        }
    }
    
    console.log('subscriptionCards element in updateUI:', subscriptionsList);
    
    if (!subscriptionsList) {
        console.error('subscriptionCards element not found in the DOM in updateUI!');
        showToast('Error: Cannot display subscriptions. Please refresh the page.', 5000, 'error');
        hideAppLoader();
        return; // Exit early to avoid the error
    }
    
    subscriptionsList.innerHTML = '';

    // Get the empty state element
    const emptyState = document.querySelector('.empty-state');
    console.log('emptyState element:', emptyState);

    // Show or hide empty state based on subscriptions
    if (subscriptions.length === 0) {
        // Show the empty state message
        if (emptyState) {
            emptyState.style.display = 'flex';
        } else {
            // Create a temporary empty state if the main one doesn't exist
            const tempEmptyState = document.createElement('div');
            tempEmptyState.className = 'temporary-empty-state';
            tempEmptyState.innerHTML = `
                <div style="text-align: center; padding: 30px;">
                    <i class="fas fa-bookmark" style="font-size: 48px; opacity: 0.5;"></i>
                    <p>No subscriptions added yet. Add your first subscription to track it.</p>
                </div>
            `;
            subscriptionsList.appendChild(tempEmptyState);
        }
    } else {
        // Hide the empty state message
        if (emptyState) {
            emptyState.style.display = 'none';
        }
        
        // Sort subscriptions by due date
        subscriptions.sort((a, b) => {
            const dateA = new Date(a.dueDate);
            const dateB = new Date(b.dueDate);
            return dateA - dateB;
        });

        // Render each subscription
        subscriptions.forEach(subscription => {
            try {
                const card = createSubscriptionCard(subscription);
                subscriptionsList.appendChild(card);
                
                // Setup swipe actions for mobile
                setupSwipeActions(card, subscription.id);
                
                // Animate the card
                animateElement(card);
            } catch (error) {
                console.error('Error creating card for subscription:', error, subscription);
            }
        });
    }

    // Update analytics if the elements exist
    try {
        updateTotalAmount(subscriptions);
        updateCategoryChart(subscriptions);
    } catch (error) {
        console.error('Error updating analytics:', error);
    }
    
    // Dispatch an event to notify that subscriptions have been updated
    document.dispatchEvent(new CustomEvent('subscriptions-updated', { detail: { subscriptions } }));
    
    // Hide loader
    hideAppLoader();
}

// Create a subscription card - optimized version
function createSubscriptionCard(subscription) {
    // Create card element
    const card = document.createElement('div');
    card.className = 'subscription-card';
    card.id = `subscription-${subscription.id}`;
    card.dataset.category = subscription.category; // Add category as data attribute for CSS styling
    
    // Calculate days until due
    const dueDate = new Date(subscription.dueDate);
    const today = new Date();
    const diffTime = dueDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // Format due date only once
    const formattedDueDate = formatDate(dueDate);
    
    // Get currency symbol from localStorage - only once
    const currencySymbol = getCurrencySymbol();
    
    // Use template literals for better performance instead of lots of DOM manipulations
    card.innerHTML = `
        <span class="category-badge ${subscription.category}">${escapeHTML(capitalizeFirstLetter(subscription.category))}</span>
        <div class="subscription-name">${escapeHTML(subscription.name)}</div>
        <div class="card-detail">
            <span class="detail-label">Amount:</span>
            <span class="subscription-amount">${currencySymbol}${subscription.amount}</span>
        </div>
        <div class="card-detail">
            <span class="detail-label">Billing:</span>
            <span class="cycle-value">${escapeHTML(subscription.billingCycle)}</span>
        </div>
        <div class="card-detail">
            <span class="detail-label">Due Date:</span>
            <span>${formattedDueDate}</span>
        </div>
        <div class="days-left ${diffDays <= 3 ? 'warning' : ''}">
            ${diffDays <= 0 ? 'Due today!' : diffDays === 1 ? 'Due tomorrow!' : `${diffDays} days until due`}
        </div>
        <div class="card-actions">
            <button class="action-btn edit touch-target" aria-label="Edit">
                <i class="fas fa-pencil-alt"></i>
            </button>
            <button class="action-btn delete touch-target" aria-label="Delete">
                <i class="fas fa-trash"></i>
            </button>
            ${navigator.share ? `
            <button class="action-btn share-btn touch-target" aria-label="Share">
                <i class="fas fa-share-alt"></i>
            </button>
            ` : ''}
        </div>
    `;
    
    // Use event delegation for better performance
    card.addEventListener('click', (e) => {
        // Edit button click
        if (e.target.closest('.action-btn.edit')) {
            // Open edit modal and populate with subscription data
            openEditModal(subscription);
            
            // Haptic feedback
            if (navigator.vibrate) navigator.vibrate(50);
            e.stopPropagation();
        }
        // Delete button click
        else if (e.target.closest('.action-btn.delete')) {
            deleteSubscription(subscription.id);
            
            // Haptic feedback
            if (navigator.vibrate) navigator.vibrate(100);
            e.stopPropagation();
        }
        // Share button click
        else if (e.target.closest('.share-btn')) {
            if (navigator.share) {
                navigator.share({
                    title: 'Subscription Details',
                    text: `${subscription.name} - ${currencySymbol}${subscription.amount} (${subscription.billingCycle})`,
                    url: window.location.href
                })
                .then(() => console.log('Shared successfully'))
                .catch(err => console.error('Share failed:', err));
                
                // Haptic feedback
                if (navigator.vibrate) navigator.vibrate(50);
            }
            e.stopPropagation();
        }
    });
    
    // Make card swipeable on mobile
    if ('ontouchstart' in window) {
        setupSwipeActions(card, subscription.id);
    }
    
    return card;
}

// Helper function to format date - cached version for performance
const dateFormatterCache = {};
function formatDate(date) {
    const dateString = date.toISOString().split('T')[0]; // YYYY-MM-DD
    
    // Return from cache if already formatted
    if (dateFormatterCache[dateString]) {
        return dateFormatterCache[dateString];
    }
    
    // Format date
    const formatted = date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
    
    // Cache the result
    dateFormatterCache[dateString] = formatted;
    
    return formatted;
}

// Helper function to prevent XSS
function escapeHTML(str) {
    if (!str) return '';
    return str
        .toString()
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Helper function to get currency symbol
function getCurrencySymbol() {
    // Default to ₹ (INR)
    let symbol = '₹';
    
    // Get currency from localStorage
    const currency = localStorage.getItem('currency') || 'INR';
    
    // Map currency code to symbol
    const symbols = {
        'INR': '₹',
        'USD': '$',
        'EUR': '€',
        'GBP': '£',
        'JPY': '¥',
        'CAD': '$',
        'AUD': '$',
        'CNY': '¥',
        'SGD': '$',
        'RUB': '₽'
    };
    
    return symbols[currency] || symbol;
}

// Open the edit modal with subscription data
function openEditModal(subscription) {
    const modal = document.getElementById('editModal');
    if (!modal) return;
    
    // Get form elements
    const form = document.getElementById('editSubscriptionForm');
    const idInput = document.getElementById('editSubscriptionId');
    const nameInput = document.getElementById('editSubscriptionName');
    const amountInput = document.getElementById('editSubscriptionAmount');
    const billingCycleInput = document.getElementById('editBillingCycle');
    const dueDateInput = document.getElementById('editDueDate');
    const categoryInput = document.getElementById('editCategory');
    const enableReminderInput = document.getElementById('editEnableReminder');
    const enableEmailReminderInput = document.getElementById('editEnableEmailReminder');
    const reminderDaysInput = document.getElementById('editReminderDays');
    const reminderDaysContainer = document.getElementById('editReminderDaysContainer');
    const editEmailAddressGroup = document.getElementById('editEmailAddressGroup');
    const editReminderEmail = document.getElementById('editReminderEmail');
    
    // Populate form with subscription data
    idInput.value = subscription.id;
    nameInput.value = subscription.name;
    amountInput.value = subscription.amount;
    billingCycleInput.value = subscription.billingCycle;
    
    // Format date for input (YYYY-MM-DD)
    const dueDate = new Date(subscription.dueDate);
    const year = dueDate.getFullYear();
    const month = String(dueDate.getMonth() + 1).padStart(2, '0');
    const day = String(dueDate.getDate()).padStart(2, '0');
    dueDateInput.value = `${year}-${month}-${day}`;
    
    categoryInput.value = subscription.category;
    
    // Set reminder toggle and days
    enableReminderInput.checked = subscription.reminderEnabled || false;
    enableEmailReminderInput.checked = subscription.reminderEmailEnabled || false;
    reminderDaysInput.value = subscription.reminderDays || "3";
    
    // Set email address if available
    if (subscription.reminderEmail) {
        editReminderEmail.value = subscription.reminderEmail;
    } else {
        // Use saved email if available
        const savedEmail = localStorage.getItem('savedReminderEmail');
        if (savedEmail) {
            editReminderEmail.value = savedEmail;
        } else {
            editReminderEmail.value = '';
        }
    }
    
    // Set reminder days container visibility
    if (reminderDaysContainer) {
        reminderDaysContainer.style.display = (enableReminderInput.checked || enableEmailReminderInput.checked) ? 'flex' : 'none';
    }
    
    // Set email address group visibility
    if (editEmailAddressGroup) {
        editEmailAddressGroup.style.display = enableEmailReminderInput.checked ? 'block' : 'none';
    }
    
    // Show the modal
    modal.classList.add('show');
    
    // Setup form submission
    setupEditFormListeners();
}

// Setup edit form listeners
function setupEditFormListeners() {
    const modal = document.getElementById('editModal');
    const form = document.getElementById('editSubscriptionForm');
    const closeBtn = document.getElementById('closeEditModal');
    const cancelBtn = document.getElementById('cancelEditBtn');
    const enableReminderToggle = document.getElementById('editEnableReminder');
    const enableEmailReminderToggle = document.getElementById('editEnableEmailReminder');
    const reminderDaysContainer = document.getElementById('editReminderDaysContainer');
    const editEmailAddressGroup = document.getElementById('editEmailAddressGroup');
    
    // Close modal when clicking close or cancel buttons
    const closeModal = () => {
        modal.classList.remove('show');
        form.removeEventListener('submit', handleEditFormSubmit);
    };
    
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
    
    // Toggle reminder days visibility
    if (enableReminderToggle && reminderDaysContainer) {
        enableReminderToggle.addEventListener('change', () => {
            reminderDaysContainer.style.display = (enableReminderToggle.checked || enableEmailReminderToggle.checked) ? 'flex' : 'none';
            if (navigator.vibrate) navigator.vibrate(30);
        });
        
        reminderDaysContainer.style.display = (enableReminderToggle.checked || enableEmailReminderToggle.checked) ? 'flex' : 'none';
    }
    
    // Toggle email address group visibility
    if (enableEmailReminderToggle && editEmailAddressGroup) {
        enableEmailReminderToggle.addEventListener('change', () => {
            editEmailAddressGroup.style.display = enableEmailReminderToggle.checked ? 'block' : 'none';
            if (navigator.vibrate) navigator.vibrate(30);
        });
    }
    
    // Handle form submission
    form.addEventListener('submit', handleEditFormSubmit);
}

// Function to handle user sign-in
function handleSignIn() {
    const signInModal = document.getElementById('signInModal');
    if (!signInModal) return;
    
    signInModal.classList.add('show');
    
    const closeSignInModal = document.getElementById('closeSignInModal');
    closeSignInModal.addEventListener('click', () => {
        signInModal.classList.remove('show');
    });
    
    const signInForm = document.getElementById('signInForm');
    signInForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        // Mock sign-in success for demo purposes
        const email = document.getElementById('signInEmail').value;
        updateUserProfile(email);
        signInModal.classList.remove('show');
        
        // Show a success message
        showToast('Signed in successfully!');
    });
    
    const createAccountBtn = document.getElementById('createAccountBtn');
    createAccountBtn.addEventListener('click', () => {
        // For demo, just use the same form but change the title
        const modalHeader = signInModal.querySelector('h3');
        modalHeader.textContent = 'Create Account';
        
        const submitBtn = signInModal.querySelector('button[type="submit"]');
        submitBtn.textContent = 'Create Account';
        
        // Update form submit handler for account creation
        signInForm.onsubmit = (e) => {
            e.preventDefault();
            const email = document.getElementById('signInEmail').value;
            updateUserProfile(email);
            signInModal.classList.remove('show');
            showToast('Account created successfully!');
        };
    });
}

// Function to update user profile
function updateUserProfile(email) {
    const profileName = document.querySelector('.profile-name');
    const profileEmail = document.querySelector('.profile-email');
    const signInBtn = document.getElementById('signInBtn');
    const verifyEmailBtn = document.getElementById('verifyEmailBtn');
    
    // Extract name from email (before @)
    const name = email.split('@')[0];
    const displayName = name.charAt(0).toUpperCase() + name.slice(1);
    
    profileName.textContent = displayName;
    profileEmail.textContent = email;
    
    // Update button to sign out
    signInBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i> Sign Out';
    signInBtn.removeEventListener('click', handleSignIn);
    signInBtn.addEventListener('click', handleSignOut);
    
    // Enable email verification
    verifyEmailBtn.disabled = false;
    
    // Store user info
    localStorage.setItem('userEmail', email);
    localStorage.setItem('userName', displayName);
}

// Function to handle sign out
function handleSignOut() {
    const profileName = document.querySelector('.profile-name');
    const profileEmail = document.querySelector('.profile-email');
    const signInBtn = document.getElementById('signInBtn');
    const verifyEmailBtn = document.getElementById('verifyEmailBtn');
    
    profileName.textContent = 'Guest User';
    profileEmail.textContent = 'Not signed in';
    
    // Update button to sign in
    signInBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign In';
    signInBtn.removeEventListener('click', handleSignOut);
    signInBtn.addEventListener('click', handleSignIn);
    
    // Disable email verification
    verifyEmailBtn.disabled = true;
    
    // Remove user info
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userName');
    
    showToast('Signed out successfully');
}

// Helper function to capitalize first letter
function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

// Helper function to escape HTML
function escapeHtml(unsafe) {
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

// Function to initialize settings
function initializeSettings() {
    // Load saved user profile if exists
    const savedEmail = localStorage.getItem('userEmail');
    const savedName = localStorage.getItem('userName');
    
    if (savedEmail && savedName) {
        const profileName = document.querySelector('.profile-name');
        const profileEmail = document.querySelector('.profile-email');
        const signInBtn = document.getElementById('signInBtn');
        const verifyEmailBtn = document.getElementById('verifyEmailBtn');
        
        profileName.textContent = savedName;
        profileEmail.textContent = savedEmail;
        
        // Update button to sign out
        signInBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i> Sign Out';
        signInBtn.addEventListener('click', handleSignOut);
        
        // Enable email verification
        verifyEmailBtn.disabled = false;
    } else {
        // Set up sign in button
        const signInBtn = document.getElementById('signInBtn');
        signInBtn.addEventListener('click', handleSignIn);
    }
    
    // Initialize other setting buttons
    const verifyEmailBtn = document.getElementById('verifyEmailBtn');
    verifyEmailBtn.addEventListener('click', () => {
        showToast('Verification email sent!', 'success');
    });
    
    const privacyPolicyLink = document.getElementById('privacyPolicyLink');
    privacyPolicyLink.addEventListener('click', (e) => {
        e.preventDefault();
        alert('Privacy Policy would open here.');
    });
    
    const termsLink = document.getElementById('termsLink');
    termsLink.addEventListener('click', (e) => {
        e.preventDefault();
        alert('Terms of Service would open here.');
    });
    
    // Initialize backup toggle
    const autoBackupToggle = document.getElementById('autoBackup');
    autoBackupToggle.checked = localStorage.getItem('autoBackup') === 'true';
    autoBackupToggle.addEventListener('change', () => {
        localStorage.setItem('autoBackup', autoBackupToggle.checked);
        showToast(autoBackupToggle.checked ? 'Auto backup enabled' : 'Auto backup disabled');
    });
    
    // Initialize cloud sync toggle
    const cloudSyncToggle = document.getElementById('cloudSync');
    cloudSyncToggle.checked = localStorage.getItem('cloudSync') === 'true';
    cloudSyncToggle.addEventListener('change', () => {
        localStorage.setItem('cloudSync', cloudSyncToggle.checked);
        showToast(cloudSyncToggle.checked ? 'Cloud sync enabled' : 'Cloud sync disabled');
    });
}

// Function to handle database errors and provide recovery options
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
    container.insertBefore(errorBanner, container.firstChild);
    
    // Add event listeners
    document.getElementById('retryDbBtn').addEventListener('click', () => {
        errorBanner.remove();
        window.location.reload();
    });
    
    document.getElementById('resetDbBtn').addEventListener('click', () => {
        if (confirm('This will delete all your subscription data. Continue?')) {
            resetDatabase();
            errorBanner.remove();
            showToast('Database has been reset', 'warning');
            window.location.reload();
        }
    });
    
    document.getElementById('closeErrorBtn').addEventListener('click', () => {
        errorBanner.remove();
    });
}

// Function to reset the database
function resetDatabase() {
    return new Promise((resolve, reject) => {
        const DBDeleteRequest = window.indexedDB.deleteDatabase('subscriptionTrackerDB');
        
        DBDeleteRequest.onerror = function(event) {
            reject(new Error('Error deleting database'));
        };
        
        DBDeleteRequest.onsuccess = function(event) {
            resolve();
        };
    });
}

// DOM validation to ensure required elements exist
function validateAppDOM() {
    console.log('Validating app DOM elements');
    const requiredElements = {
        'subscriptionCards': document.getElementById('subscriptionCards'),
        'totalMonthly': document.getElementById('totalMonthly'),
        'categoryChart': document.getElementById('categoryChart'),
        'subscriptionForm': document.getElementById('subscriptionForm'),
        'settingsButton': document.getElementById('settingsButton'),
        'settingsPanel': document.getElementById('settingsPanel'),
        'settingsBackdrop': document.getElementById('settingsBackdrop'),
        'darkMode': document.getElementById('darkMode'),
        'systemTheme': document.getElementById('systemTheme')
    };
    
    // Log found and missing elements
    const foundElements = {};
    const missingElements = [];
    
    for (const [name, element] of Object.entries(requiredElements)) {
        foundElements[name] = !!element;
        if (!element) {
            missingElements.push(name);
            console.error(`Missing required element: ${name}`);
        }
    }
    
    console.log('DOM Validation - Elements found:', foundElements);
    
    if (missingElements.length > 0) {
        console.error('Critical elements missing:', missingElements);
        return false;
    }
    
    return true;
}

// Load budget analytics functionality
function loadBudgetAnalytics() {
    console.log('Loading budget analytics...');
    
    // First check if Chart.js is available
    if (typeof Chart === 'undefined') {
        console.error('Chart.js not found, attempting to load it');
        const chartScript = document.createElement('script');
        chartScript.src = 'https://cdn.jsdelivr.net/npm/chart.js@3.7.0/dist/chart.min.js';
        chartScript.onload = function() {
            console.log('Chart.js loaded dynamically');
            loadAnalyticsScript();
        };
        chartScript.onerror = function(e) {
            console.error('Failed to load Chart.js:', e);
            showToast('Failed to load analytics components', 5000, 'error');
        };
        document.head.appendChild(chartScript);
    } else {
        loadAnalyticsScript();
    }
    
    function loadAnalyticsScript() {
        // Check if the script is already loaded
        const isAnalyticsScriptLoaded = Array.from(document.querySelectorAll('script')).some(
            script => script.src && script.src.includes('budget-analytics.js')
        );
        
        if (isAnalyticsScriptLoaded) {
            console.log('Analytics script is already in the DOM');
            
            // Give it a bit more time to initialize
            setTimeout(() => {
                const result = checkAndInitializeAnalytics();
                if (!result) {
                    console.warn('Analytics still not initialized, trying analytics fix script');
                    loadAnalyticsFixScript();
                }
            }, 1000);
            
            return;
        }
        
        // If not loaded, add the script
        try {
            console.log('Adding analytics script to DOM');
            const budgetScript = document.createElement('script');
            budgetScript.src = 'js/budget-analytics.js';
            budgetScript.defer = true;
            
            budgetScript.onload = function() {
                console.log('Budget analytics script loaded successfully');
                
                // Wait a short time to ensure functions are defined
                setTimeout(() => {
                    const result = checkAndInitializeAnalytics();
                    if (!result) {
                        console.warn('Analytics not initialized after script load, trying fix script');
                        loadAnalyticsFixScript();
                    }
                }, 1000);
            };
            
            budgetScript.onerror = function(e) {
                console.error('Failed to load budget analytics script:', e);
                showToast('Failed to load analytics components. Please refresh the page.', 5000, 'error');
            };
            
            document.head.appendChild(budgetScript);
        } catch (error) {
            console.error('Error loading analytics script:', error);
            showToast('Failed to load analytics components. Please refresh the page.', 5000, 'error');
        }
    }
    
    function loadAnalyticsFixScript() {
        // Check if the analytics fix script is already loaded
        const isFixScriptLoaded = Array.from(document.querySelectorAll('script')).some(
            script => script.src && script.src.includes('analytics-fix.js')
        );
        
        if (isFixScriptLoaded) {
            console.log('Analytics fix script is already loaded');
            return;
        }
        
        console.log('Loading analytics fix script');
        const fixScript = document.createElement('script');
        fixScript.src = 'js/analytics-fix.js';
        document.head.appendChild(fixScript);
    }
}

// Helper function to check and initialize analytics if available
function checkAndInitializeAnalytics() {
    // Analytics features have been removed
    console.log('Analytics features have been disabled');
    return false;
}

// Initialize budget analytics components - legacy function kept for backward compatibility
function initializeBudgetAnalyticsComponents() {
    return checkAndInitializeAnalytics();
}

// Initialize theme
function initializeTheme() {
    console.log('Initializing theme...');
    const darkModeToggle = document.getElementById('darkMode');
    const topDarkModeToggle = document.getElementById('topDarkMode');
    const systemThemeToggle = document.getElementById('systemTheme');
    const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');
    
    // Set initial state from localStorage
    const isDarkMode = localStorage.getItem('darkMode') === 'true';
    const useSystemTheme = localStorage.getItem('useSystemTheme') === 'true';
    
    // Apply initial theme
    if (useSystemTheme) {
        document.body.classList.toggle('dark-mode', prefersDarkScheme.matches);
        systemThemeToggle.checked = true;
        darkModeToggle.checked = prefersDarkScheme.matches;
        topDarkModeToggle.checked = prefersDarkScheme.matches;
    } else {
        document.body.classList.toggle('dark-mode', isDarkMode);
        darkModeToggle.checked = isDarkMode;
        topDarkModeToggle.checked = isDarkMode;
        systemThemeToggle.checked = false;
    }
    
    // Function to update dark mode state
    function updateDarkMode(isDark) {
        document.body.classList.toggle('dark-mode', isDark);
        localStorage.setItem('darkMode', isDark);
        localStorage.setItem('useSystemTheme', false);
        systemThemeToggle.checked = false;
        darkModeToggle.checked = isDark;
        topDarkModeToggle.checked = isDark;
    }
    
    // Handle dark mode toggle in settings
    if (darkModeToggle) {
        darkModeToggle.addEventListener('change', () => {
            updateDarkMode(darkModeToggle.checked);
        });
    }
    
    // Handle dark mode toggle in header
    if (topDarkModeToggle) {
        topDarkModeToggle.addEventListener('change', () => {
            updateDarkMode(topDarkModeToggle.checked);
        });
    }
    
    // Handle system theme toggle
    if (systemThemeToggle) {
        systemThemeToggle.addEventListener('change', () => {
            const useSystem = systemThemeToggle.checked;
            if (useSystem) {
                document.body.classList.toggle('dark-mode', prefersDarkScheme.matches);
                darkModeToggle.checked = prefersDarkScheme.matches;
                topDarkModeToggle.checked = prefersDarkScheme.matches;
            } else {
                const isDark = localStorage.getItem('darkMode') === 'true';
                document.body.classList.toggle('dark-mode', isDark);
                darkModeToggle.checked = isDark;
                topDarkModeToggle.checked = isDark;
            }
            localStorage.setItem('useSystemTheme', useSystem);
        });
    }
    
    // Listen for system theme changes
    prefersDarkScheme.addEventListener('change', (e) => {
        if (systemThemeToggle && systemThemeToggle.checked) {
            document.body.classList.toggle('dark-mode', e.matches);
            darkModeToggle.checked = e.matches;
            topDarkModeToggle.checked = e.matches;
        }
    });
}

// Call initializeTheme when the DOM is loaded
document.addEventListener('DOMContentLoaded', initializeTheme);

// Settings Panel Functions
function setupSettingsPanel() {
    console.log('Setting up settings panel...');
    const settingsButton = document.getElementById('settingsButton');
    const settingsPanel = document.getElementById('settingsPanel');
    const settingsBackdrop = document.getElementById('settingsBackdrop');
    const closeButton = document.querySelector('.settings-close');

    if (!settingsButton || !settingsPanel || !settingsBackdrop || !closeButton) {
        console.error('Settings panel elements not found');
        return;
    }

    // Toggle settings panel
    window.toggleSettingsPanel = function(e) {
        if (e) {
            e.preventDefault();
        }
        settingsPanel.classList.toggle('active');
        settingsBackdrop.classList.toggle('active');
        
        // Prevent body scroll when panel is open
        document.body.style.overflow = settingsPanel.classList.contains('active') ? 'hidden' : '';
    };

    // Open settings panel
    settingsButton.addEventListener('click', toggleSettingsPanel);

    // Close settings panel
    closeButton.addEventListener('click', (e) => {
        e.preventDefault();
        toggleSettingsPanel();
    });

    // Close on backdrop click
    settingsBackdrop.addEventListener('click', (e) => {
        if (e.target === settingsBackdrop) {
            toggleSettingsPanel();
        }
    });

    // Close on escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && settingsPanel.classList.contains('active')) {
            toggleSettingsPanel();
        }
    });

    // Initialize settings content
    initializeSettingsContent();
}

// Initialize settings content
function initializeSettingsContent() {
    console.log('Initializing settings content...');
    
    // Initialize dark mode toggle
    initializeTheme();
    
    // Initialize notifications toggle
    const notificationsToggle = document.getElementById('notificationsToggle');
    if (notificationsToggle) {
        notificationsToggle.checked = localStorage.getItem('notificationsEnabled') === 'true';
        notificationsToggle.addEventListener('change', () => {
            localStorage.setItem('notificationsEnabled', notificationsToggle.checked);
            showToast(notificationsToggle.checked ? 'Notifications enabled' : 'Notifications disabled');
        });
    }
    
    // Initialize data management buttons
    const exportBtn = document.getElementById('exportData');
    const importBtn = document.getElementById('importData');
    const clearBtn = document.getElementById('clearData');
    
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            // Export functionality
            showToast('Export functionality coming soon');
        });
    }
    
    if (importBtn) {
        importBtn.addEventListener('click', () => {
            // Import functionality
            showToast('Import functionality coming soon');
        });
    }
    
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
                SubscriptionDB.clear()
                    .then(() => {
                        showToast('All data cleared successfully');
                        window.location.reload();
                    })
                    .catch(error => {
                        console.error('Error clearing data:', error);
                        showToast('Error clearing data');
                    });
            }
        });
    }
}

// Show toast notification
function showToast(message, duration = 3000) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 10);
    
    // Remove after duration
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// Add toggleSettingsPanel function
function toggleSettingsPanel() {
    const settingsPanel = document.getElementById('settingsPanel');
    const settingsBackdrop = document.getElementById('settingsBackdrop');
    
    if (settingsPanel && settingsBackdrop) {
        settingsPanel.classList.toggle('active');
        settingsBackdrop.classList.toggle('active');
        
        // Prevent body scroll when panel is open
        document.body.style.overflow = settingsPanel.classList.contains('active') ? 'hidden' : '';
    }
}

// Add event listeners for settings panel
document.addEventListener('DOMContentLoaded', function() {
    const settingsButton = document.getElementById('settingsButton');
    const settingsClose = document.querySelector('.settings-close');
    const settingsBackdrop = document.getElementById('settingsBackdrop');
    
    if (settingsButton) {
        settingsButton.addEventListener('click', toggleSettingsPanel);
    }
    
    if (settingsClose) {
        settingsClose.addEventListener('click', toggleSettingsPanel);
    }
    
    if (settingsBackdrop) {
        settingsBackdrop.addEventListener('click', toggleSettingsPanel);
    }
    
    // Close settings panel on escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && document.getElementById('settingsPanel').classList.contains('active')) {
            toggleSettingsPanel();
        }
    });
});