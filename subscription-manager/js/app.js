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

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Start the loading sequence
    showAppLoader();
    
    // Check browser support first
    if (!SubscriptionDB.isSupported()) {
        console.error('IndexedDB is not supported in this browser');
        showDatabaseError('Your browser does not support offline storage. Try using a modern browser like Chrome or Edge.');
        hideAppLoader();
        return;
    }
    
    // Initialize critical features first
    setupNavigation();
    loadThemePreference();
    updateOnlineStatus();
    
    // Initialize IndexedDB
    SubscriptionDB.init()
        .then(() => {
            console.log('IndexedDB initialized');
            
            // Load subscriptions - most important task first
            loadSubscriptions();
            
            // Setup event listeners after DB initialization
            setupEventListeners();
            
            // Register for notifications - background task
            setTimeout(() => {
                setupNotifications();
            }, 1000);
        })
        .catch(error => {
            console.error('Failed to initialize IndexedDB:', error);
            
            // Try to determine the specific error cause for better error messages
            let errorMessage = 'Failed to initialize offline storage. Some features may not work correctly.';
            let errorDetails = '';
            
            if (error.name === 'QuotaExceededError' || error.message.includes('quota')) {
                errorDetails = 'This may happen in private browsing mode or if your device is low on storage.';
            } else if (error.name === 'SecurityError' || error.message.includes('security')) {
                errorDetails = 'This may be due to browser security restrictions.';
            } else if (error.message.includes('timed out')) {
                errorDetails = 'Database initialization timed out. Try refreshing the page.';
            }
            
            // Display a more user-friendly error message
            showDatabaseError(errorMessage, errorDetails);
            
            // Hide loader even if there's an error
            hideAppLoader();
            
            // Setup the app in limited mode (read-only)
            setupLimitedMode();
        });
    
    // Listen for online/offline events
    window.addEventListener('online', handleOnlineStatusChange);
    window.addEventListener('offline', handleOnlineStatusChange);
    
    // Listen for sync messages from service worker
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.addEventListener('message', event => {
            if (event.data.type === 'SYNC_STARTED') {
                syncInProgress = true;
                showSyncIndicator(true, 'Syncing data...');
            } else if (event.data.type === 'SYNC_COMPLETED') {
                syncInProgress = false;
                showSyncIndicator(false, 'Sync completed');
                // Reload subscriptions to get the latest data
                loadSubscriptions();
            }
        });
    }
});

// Setup all event listeners - extracted for better organization
function setupEventListeners() {
    // Setup in order of importance
    setupFormListener();
    setupCategoryFilter();
    setupSearch();
    setupSettingsPanel();
}

// Show the app loader
function showAppLoader() {
    const loader = document.querySelector('.app-loader');
    if (loader) {
        loader.classList.remove('hidden');
    }
}

// Hide the app loader
function hideAppLoader() {
    const loader = document.querySelector('.app-loader');
    if (loader) {
        loader.classList.add('hidden');
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

// Load subscriptions from IndexedDB with progressive loading
function loadSubscriptions() {
    // First, check if IndexedDB is supported
    if (!SubscriptionDB.isSupported()) {
        console.error('IndexedDB is not supported in this browser');
        showToast('Your browser does not support offline storage. Some features may not work correctly.', 4000, 'warning');
        hideAppLoader();
        return;
    }
    
    // Show loading indicator
    const container = document.getElementById('subscriptionCards');
    if (container) {
        // Clear existing cards
        container.innerHTML = '';
        
        // Show loading indicator in container
        const loadingEl = document.createElement('div');
        loadingEl.className = 'loading-indicator';
        loadingEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
        loadingEl.style.textAlign = 'center';
        loadingEl.style.padding = '30px';
        loadingEl.style.color = 'var(--text-secondary)';
        container.appendChild(loadingEl);
    }
    
    // Set a timeout for slow database operations
    const timeoutID = setTimeout(() => {
        console.warn('Loading subscriptions is taking longer than expected');
        if (container && container.querySelector('.loading-indicator')) {
            container.querySelector('.loading-indicator').innerHTML = 
                '<i class="fas fa-spinner fa-spin"></i> Still loading... taking longer than expected';
        }
    }, 3000);
    
    // Get all subscriptions from IndexedDB
    SubscriptionDB.getAll()
        .then(subscriptions => {
            clearTimeout(timeoutID);
            
            // Sort subscriptions by due date
            subscriptions.sort((a, b) => {
                const dateA = new Date(a.dueDate || '3000-01-01');
                const dateB = new Date(b.dueDate || '3000-01-01');
                return dateA - dateB;
            });
            
            // First fast update the UI with the data
            updateUI(subscriptions);
            
            // Then update charts and other visualizations progressively
            // to avoid blocking the main thread
            setTimeout(() => {
                updateCategoryChart(subscriptions);
                
                // After charts, load reminders
                setTimeout(() => {
                    loadUpcomingReminders(subscriptions);
                    
                    // Start animations last
                    setTimeout(startPageAnimations, 100);
                }, 100);
            }, 100);
        })
        .catch(error => {
            clearTimeout(timeoutID);
            console.error('Error loading subscriptions:', error);
            
            // Display error in the container
            if (container) {
                container.innerHTML = `
                    <div class="subscription-error">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>Error loading subscriptions: ${error.message || 'Unknown error'}</p>
                        <button id="retryLoadBtn" class="btn primary-btn">Try Again</button>
                    </div>
                `;
                
                // Add retry button functionality
                const retryBtn = document.getElementById('retryLoadBtn');
                if (retryBtn) {
                    retryBtn.addEventListener('click', () => {
                        loadSubscriptions();
                    });
                }
            }
            
            // Show error toast
            showToast('Error loading subscriptions. Please try again.', 4000, 'error');
            
            // Still update the chart with empty data
            updateCategoryChart([]);
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
        reminderItem.innerHTML = `
            <div class="reminder-item-content">
                <div class="reminder-item-title">${sub.name}</div>
                <div class="reminder-item-date">${formattedDate} (${sub.billingCycle})</div>
            </div>
            <div class="reminder-status-tag ${tagClass}">${tagText}</div>
        `;
        
        // Add click event to navigate to reminders page
        reminderItem.addEventListener('click', () => {
            window.location.href = 'reminders.html';
        });
        
        remindersList.appendChild(reminderItem);
    });
}

// Save subscription to IndexedDB
function saveSubscription(subscription) {
    // Save to IndexedDB
    SubscriptionDB.add(subscription)
        .then(savedSubscription => {
            // Update the UI with the new subscription
            createSubscriptionCard(savedSubscription);
            
            // Clear the form
            document.getElementById('subscriptionForm').reset();
            
            // Update total amount and chart
            loadSubscriptions();
            
            // Show toast
            showToast('Subscription added successfully');
        })
        .catch(error => {
            console.error('Error saving subscription to IndexedDB:', error);
            showToast('Error saving subscription. Please try again.');
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
    // Clear current subscriptions
    const subscriptionsList = document.getElementById('subscriptionsList');
    subscriptionsList.innerHTML = '';

    // Add message if no subscriptions
    if (subscriptions.length === 0) {
        const message = document.createElement('div');
        message.className = 'no-subscriptions-message';
        message.innerHTML = `
            <i class="fas fa-info-circle"></i>
            <p>You haven't added any subscriptions yet. Add your first subscription to get started!</p>
        `;
        subscriptionsList.appendChild(message);
    } else {
        // Sort subscriptions by due date
        subscriptions.sort((a, b) => {
            const dateA = new Date(a.dueDate);
            const dateB = new Date(b.dueDate);
            return dateA - dateB;
        });

        // Render each subscription
        subscriptions.forEach(subscription => {
            const card = createSubscriptionCard(subscription);
            subscriptionsList.appendChild(card);
            
            // Setup swipe actions for mobile
            setupSwipeActions(card, subscription.id);
            
            // Animate the card
            animateElement(card);
        });
    }

    // Update analytics
    updateTotalAmount(subscriptions);
    updateCategoryChart(subscriptions);
    
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
    // Get modal and form elements
    const modal = document.getElementById('editModal');
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
    modal.style.display = 'block';
    
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
        modal.style.display = 'none';
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
    
    if (enableEmailReminderToggle && editEmailAddressGroup) {
        enableEmailReminderToggle.addEventListener('change', () => {
            editEmailAddressGroup.style.display = enableEmailReminderToggle.checked ? 'block' : 'none';
            reminderDaysContainer.style.display = (enableReminderToggle.checked || enableEmailReminderToggle.checked) ? 'flex' : 'none';
            if (navigator.vibrate) navigator.vibrate(30);
        });
        
        editEmailAddressGroup.style.display = enableEmailReminderToggle.checked ? 'block' : 'none';
    }
    
    // Handle form submission
    form.addEventListener('submit', handleEditFormSubmit);
}

// Handle edit form submission
function handleEditFormSubmit(event) {
    event.preventDefault();
    
    try {
        // Get form values
        const id = document.getElementById('editSubscriptionId').value;
        const name = document.getElementById('editSubscriptionName').value.trim();
        const amountElement = document.getElementById('editSubscriptionAmount');
        const amount = parseFloat(amountElement.value);
        const billingCycle = document.getElementById('editBillingCycle').value;
        const dueDateElement = document.getElementById('editDueDate');
        const dueDate = dueDateElement.value;
        const category = document.getElementById('editCategory').value;
        
        // Get reminder settings
        const reminderEnabled = document.getElementById('editEnableReminder').checked;
        const reminderEmailEnabled = document.getElementById('editEnableEmailReminder').checked;
        const reminderEmail = reminderEmailEnabled ? document.getElementById('editReminderEmail').value : '';
        const reminderDays = document.getElementById('editReminderDays').value;
        const rememberEmail = document.getElementById('editRememberEmailCheck').checked;
        
        // Validate inputs
        if (!name) {
            showToast('Please enter a subscription name');
            return;
        }
        
        if (isNaN(amount) || amount <= 0) {
            showToast('Please enter a valid amount');
            amountElement.focus();
            return;
        }
        
        if (!dueDate) {
            showToast('Please select a due date');
            dueDateElement.focus();
            return;
        }
        
        // Validate email if email notification is enabled
        if (reminderEmailEnabled && (!reminderEmail || !isValidEmail(reminderEmail))) {
            showToast('Please enter a valid email address');
            document.getElementById('editReminderEmail').focus();
            return;
        }
        
        // Save email for future use if remember option is checked
        if (reminderEmailEnabled && rememberEmail && reminderEmail) {
            localStorage.setItem('savedReminderEmail', reminderEmail);
        }
        
        // Create updated subscription object
        const updatedSubscription = {
            id,
            name,
            amount,
            billingCycle,
            dueDate,
            category,
            reminderEnabled,
            reminderEmailEnabled,
            reminderDays,
            reminderEmail: reminderEmailEnabled ? reminderEmail : undefined,
            updatedAt: new Date().toISOString()
        };
        
        // Update the subscription
        updateSubscription(updatedSubscription);
        
        // Close the modal
        document.getElementById('editModal').style.display = 'none';
        
        // Haptic feedback
        if (navigator.vibrate) {
            navigator.vibrate([50, 30, 100]);
        }
    } catch (error) {
        console.error('Error in edit form submission:', error);
        showToast('An error occurred. Please try again.');
    }
}

// Update a subscription
function updateSubscription(subscription) {
    // Update in IndexedDB
    SubscriptionDB.update(subscription)
        .then(() => {
            // Update the UI
            const card = document.getElementById(`subscription-${subscription.id}`);
            if (card) {
                card.remove();
            }
            
            // Create new card with updated data
            createSubscriptionCard(subscription);
            
            // Update total amount and chart
            loadSubscriptions();
            
            // Show toast
            showToast('Subscription updated successfully');
        })
        .catch(error => {
            console.error('Error updating subscription in IndexedDB:', error);
            showToast('Error updating subscription. Please try again.');
        });
}

// Setup swipe actions for mobile
function setupSwipeActions(card, id) {
    let startX, moveX, isDragging = false;
    const threshold = 100; // minimum distance to trigger action
    
    card.addEventListener('touchstart', e => {
        startX = e.touches[0].clientX;
        isDragging = true;
    });
    
    card.addEventListener('touchmove', e => {
        if (!isDragging) return;
        moveX = e.touches[0].clientX;
        const diff = moveX - startX;
        
        // Only allow swiping left (negative diff)
        if (diff < 0) {
            card.style.transform = `translateX(${diff}px)`;
        }
    });
    
    card.addEventListener('touchend', e => {
        isDragging = false;
        const diff = moveX - startX;
        
        if (diff < -threshold) {
            // Swiped far enough to trigger delete
            deleteSubscription(id);
            
            // Haptic feedback
            if (navigator.vibrate) navigator.vibrate(100);
        }
        
        // Reset position
        card.style.transform = '';
    });
}

// Setup form submission
function setupFormListener() {
    const form = document.getElementById('subscriptionForm');
    
    if (!form) {
        console.error('Subscription form not found');
        return;
    }
    
    // Check for saved email and populate it if exists
    const savedEmail = localStorage.getItem('savedReminderEmail');
    if (savedEmail) {
        const reminderEmailInput = document.getElementById('reminderEmailAdd');
        if (reminderEmailInput) {
            reminderEmailInput.value = savedEmail;
        }
    }
    
    form.addEventListener('submit', event => {
        event.preventDefault();
        console.log('Form submitted');
        
        try {
            // Get form values
            const name = document.getElementById('subscriptionName').value.trim();
            const amountElement = document.getElementById('subscriptionAmount');
            const amount = parseFloat(amountElement.value);
            const billingCycle = document.getElementById('billingCycle').value;
            const dueDateElement = document.getElementById('dueDate');
            const dueDate = dueDateElement.value;
            const category = document.getElementById('category').value;
            
            // Get reminder settings
            const reminderEnabled = document.getElementById('enableReminder').checked;
            const reminderEmailEnabled = document.getElementById('enableEmailReminder').checked;
            const reminderEmail = reminderEmailEnabled ? document.getElementById('reminderEmailAdd').value : '';
            const reminderDays = document.getElementById('reminderDays').value;
            const rememberEmail = document.getElementById('rememberEmailCheck').checked;
            
            // Validate inputs
            if (!name) {
                showToast('Please enter a subscription name');
                return;
            }
            
            if (isNaN(amount) || amount <= 0) {
                showToast('Please enter a valid amount');
                amountElement.focus();
                return;
            }
            
            if (!dueDate) {
                showToast('Please select a due date');
                dueDateElement.focus();
                return;
            }
            
            // Validate email if email notification is enabled
            if (reminderEmailEnabled && (!reminderEmail || !isValidEmail(reminderEmail))) {
                showToast('Please enter a valid email address');
                document.getElementById('reminderEmailAdd').focus();
                return;
            }
            
            // Save email for future use if remember option is checked
            if (reminderEmailEnabled && rememberEmail && reminderEmail) {
                localStorage.setItem('savedReminderEmail', reminderEmail);
            }
            
            // Create subscription object
            const subscription = {
                id: generateUUID(),
                name,
                amount,
                billingCycle,
                dueDate,
                category,
                reminderEnabled,
                reminderEmailEnabled,
                reminderDays,
                reminderEmail: reminderEmailEnabled ? reminderEmail : undefined,
                createdAt: new Date().toISOString()
            };
            
            console.log('Saving subscription:', subscription);
            
            // Save subscription
            saveSubscription(subscription);
            
            // Haptic feedback
            if (navigator.vibrate) {
                navigator.vibrate([50, 30, 100]);
            }
        } catch (error) {
            console.error('Error in form submission:', error);
            showToast('An error occurred. Please try again.');
        }
    });
    
    // Set default due date to today
    const dueDateInput = document.getElementById('dueDate');
    if (dueDateInput) {
        dueDateInput.valueAsDate = new Date();
    }
    
    // Set up reminder toggle visibility
    const enableReminder = document.getElementById('enableReminder');
    const enableEmailReminder = document.getElementById('enableEmailReminder');
    const reminderDaysContainer = document.getElementById('reminderDaysContainer');
    const emailAddressGroupAdd = document.getElementById('emailAddressGroupAdd');
    
    if (enableReminder && reminderDaysContainer) {
        enableReminder.addEventListener('change', () => {
            reminderDaysContainer.style.display = (enableReminder.checked || enableEmailReminder.checked) ? 'flex' : 'none';
            if (navigator.vibrate) navigator.vibrate(30);
        });
        
        reminderDaysContainer.style.display = (enableReminder.checked || enableEmailReminder.checked) ? 'flex' : 'none';
    }
    
    if (enableEmailReminder && emailAddressGroupAdd) {
        enableEmailReminder.addEventListener('change', () => {
            emailAddressGroupAdd.style.display = enableEmailReminder.checked ? 'block' : 'none';
            reminderDaysContainer.style.display = (enableReminder.checked || enableEmailReminder.checked) ? 'flex' : 'none';
            if (navigator.vibrate) navigator.vibrate(30);
        });
        
        emailAddressGroupAdd.style.display = enableEmailReminder.checked ? 'block' : 'none';
    }
}

// Cached conversion factors for recurring billing
const BILLING_CYCLE_FACTORS = {
    'monthly': 1,
    'yearly': 1/12,
    'quarterly': 1/3,
    'weekly': 4.33, // Average weeks in a month
    'biweekly': 2.17, // Average bi-weekly periods in a month
    'daily': 30.42 // Average days in a month
};

// Update total monthly amount - optimized
function updateTotalAmount(subscriptions) {
    // Use reduce for better performance
    const total = subscriptions.reduce((acc, subscription) => {
        const amount = parseFloat(subscription.amount);
        const cycle = subscription.billingCycle;
        
        // Use cached conversion factors
        const factor = BILLING_CYCLE_FACTORS[cycle] || 1;
        return acc + (amount * factor);
    }, 0);
    
    // Update the UI only once
    const totalElement = document.getElementById('totalMonthly');
    if (totalElement) {
        totalElement.textContent = total.toFixed(2);
    }
}

// Update category chart - optimized with requestAnimationFrame
function updateCategoryChart(subscriptions) {
    // Use requestAnimationFrame to prevent blocking the main thread
    window.requestAnimationFrame(() => {
        const ctx = document.getElementById('categoryChart');
        if (!ctx) return;
        
        const ctxContext = ctx.getContext('2d');
        
        // Group by category using reduce for better performance
        const categories = subscriptions.reduce((acc, subscription) => {
            const amount = parseFloat(subscription.amount);
            const category = subscription.category;
            const cycle = subscription.billingCycle;
            
            // Calculate monthly amount using cached conversion factors
            const factor = BILLING_CYCLE_FACTORS[cycle] || 1;
            const monthlyAmount = amount * factor;
            
            // Add to category total
            if (!acc[category]) {
                acc[category] = 0;
            }
            acc[category] += monthlyAmount;
            
            return acc;
        }, {});
        
        // Color palette for categories - cached
        const categoryColors = {
            'streaming': '#e91e63',
            'fitness': '#4caf50',
            'productivity': '#ff9800',
            'music': '#9c27b0',
            'cloud': '#2196f3',
            'other': '#607d8b'
        };
        
        // Default colors for other categories
        const defaultColors = [
            '#3f51b5', '#009688', '#ffc107', '#795548', 
            '#9e9e9e', '#f44336', '#cddc39', '#00bcd4'
        ];
        
        // Prepare data for chart
        const labels = Object.keys(categories);
        const data = Object.values(categories);
        
        // Create colors array by mapping category names to colors
        const colors = labels.map(category => 
            categoryColors[category.toLowerCase()] || 
            defaultColors[Math.abs(hashCode(category)) % defaultColors.length]
        );
        
        // Chart config
        const chartData = {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors,
                borderWidth: 0,
                hoverOffset: 5
            }]
        };
        
        const options = {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        usePointStyle: true,
                        padding: 15,
                        font: {
                            size: 11
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: (context) => {
                            const label = context.label || '';
                            const value = context.formattedValue;
                            const currency = getCurrencySymbol();
                            const percentage = Math.round(context.raw / data.reduce((a, b) => a + b, 0) * 100);
                            return `${label}: ${currency}${value} (${percentage}%)`;
                        }
                    }
                }
            },
            animation: {
                animateScale: true,
                animateRotate: true,
                duration: 500
            }
        };
        
        // Create chart if it doesn't exist, update otherwise
        if (window.categoryChart) {
            window.categoryChart.data = chartData;
            window.categoryChart.options = options;
            window.categoryChart.update('none'); // Use 'none' mode for better performance
        } else {
            window.categoryChart = new Chart(ctxContext, {
                type: 'doughnut',
                data: chartData,
                options: options
            });
        }
    });
}

// Simple string hash function for consistent colors
function hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0; // Convert to 32bit integer
    }
    return hash;
}

// Setup category filter
function setupCategoryFilter() {
    const filterSelect = document.getElementById('filterCategory');
    
    filterSelect.addEventListener('change', () => {
        const category = filterSelect.value;
        const cards = document.querySelectorAll('.subscription-card');
        
        cards.forEach(card => {
            const cardCategory = card.querySelector('.card-category').textContent;
            
            if (category === 'all' || cardCategory === category) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });
        
        // Haptic feedback
        if (navigator.vibrate) navigator.vibrate(30);
    });
}

// Setup search functionality with debouncing
function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    
    if (!searchInput) return;
    
    // Implement debouncing for better performance
    let debounceTimeout;
    
    searchInput.addEventListener('input', () => {
        // Clear previous timeout
        clearTimeout(debounceTimeout);
        
        // Show loading indicator
        const container = document.getElementById('subscriptionCards');
        if (container) {
            const loadingIndicator = container.querySelector('.search-loading');
            if (!loadingIndicator && searchInput.value.trim() !== '') {
                const indicator = document.createElement('div');
                indicator.className = 'search-loading';
                indicator.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Searching...';
                indicator.style.textAlign = 'center';
                indicator.style.padding = '20px';
                indicator.style.color = 'var(--text-light)';
                
                // Only add if container has cards
                if (container.querySelectorAll('.subscription-card').length > 0) {
                    container.prepend(indicator);
                }
            }
        }
        
        // Set debounced search after 300ms
        debounceTimeout = setTimeout(() => {
            // Use optimized search function instead of filtering DOM
            const searchTerm = searchInput.value.trim().toLowerCase();
            
            if (searchTerm === '') {
                // If search is cleared, show all subscriptions
                document.querySelectorAll('.subscription-card').forEach(card => {
                    card.style.display = 'block';
                });
                
                // Remove loading indicator
                const loadingIndicator = document.querySelector('.search-loading');
                if (loadingIndicator) {
                    loadingIndicator.remove();
                }
                return;
            }
            
            // Use database search for better performance
            SubscriptionDB.search(searchTerm)
                .then(results => {
                    // Get all cards and first hide them all
                    const cards = document.querySelectorAll('.subscription-card');
                    cards.forEach(card => {
                        card.style.display = 'none';
                    });
                    
                    // Show matching cards
                    if (results.length > 0) {
                        const matchingIds = results.map(sub => sub.id);
                        cards.forEach(card => {
                            const cardId = card.id.replace('subscription-', '');
                            if (matchingIds.includes(cardId)) {
                                card.style.display = 'block';
                            }
                        });
                    }
                    
                    // Show no results message if needed
                    const noResultsEl = document.querySelector('.no-search-results');
                    if (results.length === 0 && !noResultsEl) {
                        const noResults = document.createElement('div');
                        noResults.className = 'no-search-results';
                        noResults.innerHTML = `
                            <i class="fas fa-search"></i>
                            <p>No subscriptions matching "${searchTerm}"</p>
                            <button id="clearSearchBtn" class="btn secondary-btn">Clear Search</button>
                        `;
                        container.appendChild(noResults);
                        
                        // Add clear search button handler
                        document.getElementById('clearSearchBtn').addEventListener('click', () => {
                            searchInput.value = '';
                            // Trigger the input event to update the search
                            searchInput.dispatchEvent(new Event('input'));
                        });
                    } else if (results.length > 0 && noResultsEl) {
                        noResultsEl.remove();
                    }
                    
                    // Remove loading indicator
                    const loadingIndicator = document.querySelector('.search-loading');
                    if (loadingIndicator) {
                        loadingIndicator.remove();
                    }
                })
                .catch(error => {
                    console.error('Search error:', error);
                    // Remove loading indicator
                    const loadingIndicator = document.querySelector('.search-loading');
                    if (loadingIndicator) {
                        loadingIndicator.remove();
                    }
                });
        }, 300);
    });
    
    // Add clear button to search input
    const searchWrapper = searchInput.parentElement;
    if (searchWrapper && searchWrapper.classList.contains('search-wrapper')) {
        const clearBtn = document.createElement('button');
        clearBtn.className = 'clear-search';
        clearBtn.innerHTML = '<i class="fas fa-times-circle"></i>';
        clearBtn.setAttribute('aria-label', 'Clear search');
        
        clearBtn.addEventListener('click', () => {
            searchInput.value = '';
            // Trigger the input event to update the search
            searchInput.dispatchEvent(new Event('input'));
            searchInput.focus();
        });
        
        searchWrapper.appendChild(clearBtn);
    }
}

// Load dark mode preference
function loadThemePreference() {
    const darkMode = localStorage.getItem('darkMode') === 'true';
    const useSystemTheme = localStorage.getItem('useSystemTheme') !== 'false';
    
    // Set toggle states
    const darkModeToggle = document.getElementById('darkMode');
    const topDarkModeToggle = document.getElementById('topDarkMode');
    const systemThemeToggle = document.getElementById('systemTheme');
    
    if (darkModeToggle) darkModeToggle.checked = darkMode;
    if (topDarkModeToggle) topDarkModeToggle.checked = darkMode;
    if (systemThemeToggle) systemThemeToggle.checked = useSystemTheme;
    
    // Apply theme
    if (useSystemTheme) {
        // Follow system preference
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (prefersDark) {
            document.body.classList.add('dark-mode');
            if (darkModeToggle) darkModeToggle.checked = true;
            if (topDarkModeToggle) topDarkModeToggle.checked = true;
        } else {
            document.body.classList.remove('dark-mode');
            if (darkModeToggle) darkModeToggle.checked = false;
            if (topDarkModeToggle) topDarkModeToggle.checked = false;
        }
    } else if (darkMode) {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
    
    // Setup top dark mode toggle
    if (topDarkModeToggle) {
        topDarkModeToggle.addEventListener('change', () => {
            const isDarkMode = topDarkModeToggle.checked;
            localStorage.setItem('darkMode', isDarkMode);
            
            // Sync with settings toggle
            if (darkModeToggle) darkModeToggle.checked = isDarkMode;
            
            // If system theme is enabled, disable it
            if (systemThemeToggle && systemThemeToggle.checked) {
                systemThemeToggle.checked = false;
                localStorage.setItem('useSystemTheme', false);
            }
            
            // Apply theme
            if (isDarkMode) {
                document.body.classList.add('dark-mode');
            } else {
                document.body.classList.remove('dark-mode');
            }
            
            // Haptic feedback
            if (navigator.vibrate) navigator.vibrate(30);
        });
    }
}

// Setup notification permissions
function setupNotifications() {
    const notificationToggle = document.getElementById('enableNotifications');
    
    // Set initial state based on stored preference
    const notificationsEnabled = localStorage.getItem('notificationsEnabled') === 'true';
    notificationToggle.checked = notificationsEnabled;
    
    // Request permission if enabled
    if (notificationsEnabled && 'Notification' in window) {
        Notification.requestPermission();
    }
    
    // Listen for changes
    notificationToggle.addEventListener('change', () => {
        localStorage.setItem('notificationsEnabled', notificationToggle.checked);
        
        if (notificationToggle.checked) {
            if ('Notification' in window) {
                Notification.requestPermission()
                    .then(permission => {
                        if (permission === 'granted') {
                            showToast('Notifications enabled');
                            subscribeToPushNotifications();
                        } else {
                            showToast('Notification permission denied');
                            notificationToggle.checked = false;
                            localStorage.setItem('notificationsEnabled', false);
                        }
                    });
            }
        } else {
            showToast('Notifications disabled');
        }
    });
}

// Subscribe to push notifications
function subscribeToPushNotifications() {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
        navigator.serviceWorker.ready
            .then(registration => {
                // Check if already subscribed
                return registration.pushManager.getSubscription()
                    .then(subscription => {
                        if (subscription) {
                            return subscription;
                        }
                        
                        // Subscribe user
                        return registration.pushManager.subscribe({
                            userVisibleOnly: true,
                            applicationServerKey: urlBase64ToUint8Array(
                                // This would be your VAPID public key in a real app
                                'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U'
                            )
                        });
                    });
            })
            .then(subscription => {
                // Send the subscription to your server
                console.log('Push subscription:', subscription);
                
                // Normally you would send this to your server
                // sendSubscriptionToServer(subscription);
            })
            .catch(error => {
                console.error('Push subscription error:', error);
            });
    }
}

// Convert base64 string to Uint8Array for push subscription
function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/');
        
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

// Setup bottom navigation
function setupNavigation() {
    const navHome = document.getElementById('nav-home');
    const navAdd = document.getElementById('nav-add');
    const navSettings = document.getElementById('nav-settings');
    const addSubscriptionSection = document.querySelector('.add-subscription');
    const subscriptionListSection = document.querySelector('.subscription-list');
    
    if (navHome) {
        navHome.addEventListener('click', e => {
            e.preventDefault();
            // Show subscription list, hide add form
            subscriptionListSection.style.display = 'block';
            addSubscriptionSection.style.display = 'none';
            
            // Update active nav
            document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
            navHome.classList.add('active');
            
            // Haptic feedback
            if (navigator.vibrate) navigator.vibrate(30);
        });
    }
    
    if (navAdd) {
        navAdd.addEventListener('click', e => {
            e.preventDefault();
            // Show add form, hide subscription list
            addSubscriptionSection.style.display = 'block';
            subscriptionListSection.style.display = 'none';
            
            // Update active nav
            document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
            navAdd.classList.add('active');
            
            // Haptic feedback
            if (navigator.vibrate) navigator.vibrate(30);
        });
    }
    
    if (navSettings) {
        navSettings.addEventListener('click', e => {
            e.preventDefault();
            // Show settings panel
            const settingsPanel = document.getElementById('settingsPanel');
            if (settingsPanel) {
                settingsPanel.classList.add('open');
                
                // Haptic feedback
                if (navigator.vibrate) navigator.vibrate(30);
            }
        });
    }
}

// Setup settings panel
function setupSettingsPanel() {
    const settingsPanel = document.getElementById('settingsPanel');
    const closeSettings = document.getElementById('closeSettings');
    const darkModeToggle = document.getElementById('darkMode');
    const systemThemeToggle = document.getElementById('systemTheme');
    const notificationsToggle = document.getElementById('enableNotifications');
    const biometricsToggle = document.getElementById('useBiometrics');
    const currencySelect = document.getElementById('currency');
    const languageSelect = document.getElementById('language');
    const exportDataLink = document.getElementById('exportDataLink');
    const importDataLink = document.getElementById('importDataLink');
    const resetDataLink = document.getElementById('resetDataLink');
    const importFileInput = document.getElementById('importFileInput');
    
    // Close settings panel
    if (closeSettings) {
        closeSettings.addEventListener('click', () => {
            settingsPanel.classList.remove('open');
            
            // Haptic feedback
            if (navigator.vibrate) navigator.vibrate(30);
        });
    }
    
    // Dark mode toggle
    if (darkModeToggle) {
        darkModeToggle.addEventListener('change', () => {
            const darkMode = darkModeToggle.checked;
            localStorage.setItem('darkMode', darkMode);
            
            // Sync with top dark mode toggle
            const topDarkModeToggle = document.getElementById('topDarkMode');
            if (topDarkModeToggle) topDarkModeToggle.checked = darkMode;
            
            if (systemThemeToggle.checked) {
                // If system theme is enabled, disable it
                systemThemeToggle.checked = false;
                localStorage.setItem('useSystemTheme', false);
            }
            
            if (darkMode) {
                document.body.classList.add('dark-mode');
            } else {
                document.body.classList.remove('dark-mode');
            }
            
            // Haptic feedback
            if (navigator.vibrate) navigator.vibrate(30);
        });
    }
    
    // System theme toggle
    if (systemThemeToggle) {
        systemThemeToggle.addEventListener('change', () => {
            const useSystemTheme = systemThemeToggle.checked;
            localStorage.setItem('useSystemTheme', useSystemTheme);
            
            if (useSystemTheme) {
                // Follow system preference
                const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                if (prefersDark) {
                    document.body.classList.add('dark-mode');
                    if (darkModeToggle) darkModeToggle.checked = true;
                    
                    // Sync with top dark mode toggle
                    const topDarkModeToggle = document.getElementById('topDarkMode');
                    if (topDarkModeToggle) topDarkModeToggle.checked = true;
                } else {
                    document.body.classList.remove('dark-mode');
                    if (darkModeToggle) darkModeToggle.checked = false;
                    
                    // Sync with top dark mode toggle
                    const topDarkModeToggle = document.getElementById('topDarkMode');
                    if (topDarkModeToggle) topDarkModeToggle.checked = false;
                }
            }
            
            // Haptic feedback
            if (navigator.vibrate) navigator.vibrate(30);
        });
    }
    
    // Notifications toggle
    if (notificationsToggle) {
        // Set initial state
        notificationsToggle.checked = localStorage.getItem('enableNotifications') === 'true';
        
        notificationsToggle.addEventListener('change', () => {
            const enableNotifications = notificationsToggle.checked;
            localStorage.setItem('enableNotifications', enableNotifications);
            
            if (enableNotifications) {
                // Request notification permission
                setupNotifications();
            }
            
            // Haptic feedback
            if (navigator.vibrate) navigator.vibrate(30);
        });
    }
    
    // Biometrics toggle
    if (biometricsToggle) {
        // Set initial state
        biometricsToggle.checked = localStorage.getItem('useBiometrics') === 'true';
        
        biometricsToggle.addEventListener('change', () => {
            const useBiometrics = biometricsToggle.checked;
            localStorage.setItem('useBiometrics', useBiometrics);
            
            // Haptic feedback
            if (navigator.vibrate) navigator.vibrate(30);
        });
    }
    
    // Currency selection
    if (currencySelect) {
        // Set initial value
        const savedCurrency = localStorage.getItem('currency');
        if (savedCurrency) {
            currencySelect.value = savedCurrency;
        }
        
        currencySelect.addEventListener('change', () => {
            const currency = currencySelect.value;
            localStorage.setItem('currency', currency);
            
            // Update currency symbols
            updateCurrencySymbols();
            
            // Reload subscriptions to update formatting
            loadSubscriptions();
            
            // Haptic feedback
            if (navigator.vibrate) navigator.vibrate(30);
        });
    }
    
    // Export data
    if (exportDataLink) {
        exportDataLink.addEventListener('click', event => {
            event.preventDefault();
            exportData();
        });
    }
    
    // Import data
    if (importDataLink && importFileInput) {
        importDataLink.addEventListener('click', event => {
            event.preventDefault();
            importFileInput.click();
        });
        
        importFileInput.addEventListener('change', event => {
            const file = event.target.files[0];
            if (file) {
                importData(file);
            }
        });
    }
    
    // Reset data
    if (resetDataLink) {
        resetDataLink.addEventListener('click', event => {
            event.preventDefault();
            resetData();
        });
    }
    
    // Notification channels
    setupNotificationChannels();
}

// Update currency symbols
function updateCurrencySymbols() {
    const currencySymbol = window.i18n.getCurrencySymbol();
    
    // Update currency symbols in the UI
    const amountSymbol = document.getElementById('amountCurrencySymbol');
    const editAmountSymbol = document.getElementById('editAmountCurrencySymbol');
    
    if (amountSymbol) amountSymbol.textContent = currencySymbol;
    if (editAmountSymbol) editAmountSymbol.textContent = currencySymbol;
    
    // Update amount in cards
    document.querySelectorAll('.amount-value').forEach(element => {
        const amount = element.textContent.replace(/[^0-9.]/g, '');
        element.textContent = `${currencySymbol}${amount}`;
    });
}

// Export data to JSON file
function exportData() {
    SubscriptionDB.getAll()
        .then(subscriptions => {
            const data = {
                subscriptions,
                exportDate: new Date().toISOString(),
                version: '1.0'
            };
            
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `subscription-data-${new Date().toISOString().slice(0,10)}.json`;
            document.body.appendChild(a);
            a.click();
            
            // Clean up
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 100);
            
            showToast('Data exported successfully');
        })
        .catch(error => {
            console.error('Error exporting data:', error);
            showToast('Error exporting data');
        });
}

// Import data from JSON file
function importData(file) {
    const reader = new FileReader();
    
    reader.onload = event => {
        try {
            const data = JSON.parse(event.target.result);
            
            if (!data.subscriptions || !Array.isArray(data.subscriptions)) {
                throw new Error('Invalid data format');
            }
            
            // Import each subscription
            Promise.all(data.subscriptions.map(subscription => SubscriptionDB.add(subscription)))
                .then(() => {
                    loadSubscriptions(); // Reload data
                    showToast('Data imported successfully');
                })
                .catch(error => {
                    console.error('Error importing data:', error);
                    showToast('Error importing data');
                });
        } catch (error) {
            console.error('Error parsing import file:', error);
            showToast('Invalid data file');
        }
    };
    
    reader.readAsText(file);
}

// Reset all data
function resetData() {
    if (confirm('Are you sure? This will delete all your subscriptions.')) {
        SubscriptionDB.clearAll()
            .then(() => {
                loadSubscriptions(); // Reload (empty) data
                showToast('All data has been reset');
            })
            .catch(error => {
                console.error('Error resetting data:', error);
                showToast('Error resetting data');
            });
    }
}

// Setup notification channels
function setupNotificationChannels() {
    const channelToggles = {
        'dueDateChannel': true,
        'weeklyDigestChannel': false,
        'priceChangesChannel': false
    };
    
    // Set initial states from localStorage
    Object.keys(channelToggles).forEach(channelId => {
        const toggle = document.getElementById(channelId);
        if (toggle) {
            const savedState = localStorage.getItem(channelId);
            toggle.checked = savedState !== null ? savedState === 'true' : channelToggles[channelId];
            
            // Add change listener
            toggle.addEventListener('change', () => {
                localStorage.setItem(channelId, toggle.checked);
                
                // If using Android notification channels, update them
                if ('serviceWorker' in navigator) {
                    navigator.serviceWorker.controller?.postMessage({
                        type: 'UPDATE_NOTIFICATION_CHANNEL',
                        channelId: channelId.replace('Channel', ''),
                        enabled: toggle.checked
                    });
                }
                
                // Haptic feedback
                if (navigator.vibrate) navigator.vibrate(30);
            });
        }
    });
}

/**
 * Display a toast notification
 * @param {string} message - The message to display
 * @param {number} duration - How long to show the toast in milliseconds
 * @param {string} type - Toast type ('error', 'success', 'warning', or empty for default)
 */
function showToast(message, duration = 3000, type = '') {
    const existingToast = document.querySelector('.toast');
    
    // Remove existing toast if present
    if (existingToast) {
        existingToast.remove();
    }
    
    const toast = document.createElement('div');
    toast.className = 'toast';
    
    // Add type class if specified
    if (type && ['error', 'success', 'warning'].includes(type)) {
        toast.classList.add(type);
    }
    
    toast.textContent = message;
    document.body.appendChild(toast);
    
    // Show the toast
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    // Hide the toast after duration
    setTimeout(() => {
        toast.classList.remove('show');
        // Remove from DOM after animation completes
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, duration);
}

// Helper function to generate a UUID
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Helper function to validate an email address
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Show database error with details and recovery options
function showDatabaseError(message, details) {
    // Show toast with short message
    showToast(message, 5000, 'error');
    
    // Create a more detailed error banner
    const container = document.querySelector('.container');
    if (container) {
        const errorBanner = document.createElement('div');
        errorBanner.className = 'notification-banner error-banner';
        
        let bannerContent = `
            <div class="notification-content">
                <div class="notification-title">Database Error</div>
                <p>${message}</p>
        `;
        
        if (details) {
            bannerContent += `<p class="error-details">${details}</p>`;
        }
        
        bannerContent += `
                <div class="error-actions">
                    <button id="retryBtn" class="btn">Retry Connection</button>
                    <button id="clearDataBtn" class="btn secondary-btn">Clear Data & Reset</button>
                </div>
            </div>
            <button class="close-btn">&times;</button>
        `;
        
        errorBanner.innerHTML = bannerContent;
        
        // Insert at the top of the container
        container.insertBefore(errorBanner, container.firstChild);
        
        // Setup action buttons
        errorBanner.querySelector('#retryBtn').addEventListener('click', () => {
            location.reload();
        });
        
        errorBanner.querySelector('#clearDataBtn').addEventListener('click', () => {
            if (confirm('This will clear all local data and reset the application. Continue?')) {
                clearLocalStorage();
                indexedDB.deleteDatabase(DB_NAME);
                showToast('Data cleared. Reloading application...', 2000, 'success');
                setTimeout(() => location.reload(), 2000);
            }
        });
        
        errorBanner.querySelector('.close-btn').addEventListener('click', () => {
            errorBanner.remove();
        });
    }
}

// Clear all local storage data
function clearLocalStorage() {
    try {
        localStorage.clear();
        console.log('Local storage cleared');
    } catch (e) {
        console.error('Error clearing local storage:', e);
    }
}

// Setup app in limited mode when database fails
function setupLimitedMode() {
    console.log('Setting up app in limited mode');
    
    // Disable features that require database access
    const addForm = document.getElementById('addSubscriptionForm');
    if (addForm) {
        addForm.innerHTML = `
            <div class="limited-mode-message">
                <i class="fas fa-exclamation-circle"></i>
                <p>Database access is unavailable. Unable to add new subscriptions.</p>
                <button id="reloadAppBtn" class="btn primary-btn">Reload Application</button>
            </div>
        `;
        
        document.getElementById('reloadAppBtn')?.addEventListener('click', () => {
            location.reload();
        });
    }
}

// Function to render subscription cards with improved layout to prevent text overlap
function renderSubscriptionCard(subscription) {
    const cardEl = document.createElement('div');
    cardEl.className = 'subscription-card';
    cardEl.dataset.id = subscription.id;
    cardEl.dataset.category = subscription.category; // Add category as data attribute for CSS styling
    
    // Format the next due date
    const dueDate = new Date(subscription.dueDate);
    const formattedDueDate = new Intl.DateTimeFormat('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    }).format(dueDate);
    
    // Calculate days until due
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
    
    // Format amount with currency symbol
    const amount = parseFloat(subscription.amount).toFixed(2);
    const currencySymbol = getCurrencySymbol();
    
    // Create category label with proper contrast
    const categoryLabel = subscription.category.charAt(0).toUpperCase() + subscription.category.slice(1);
    
    cardEl.innerHTML = `
        <span class="category-badge ${subscription.category}">${categoryLabel}</span>
        <h3 class="subscription-name">${escapeHtml(subscription.name)}</h3>
        
        <div class="card-detail">
            <span class="detail-label">Amount:</span>
            <span class="subscription-amount">${currencySymbol}${amount}</span>
        </div>
        
        <div class="card-detail">
            <span class="detail-label">Billing:</span>
            <span class="detail-value">${capitalizeFirstLetter(subscription.billingCycle)}</span>
        </div>
        
        <div class="card-detail">
            <span class="detail-label">Next Due:</span>
            <span class="detail-value">${formattedDueDate}</span>
        </div>
        
        <div class="days-left ${daysUntilDue <= 5 ? 'warning' : ''}">
            ${daysUntilDue === 0 ? 'Due today' : 
              daysUntilDue < 0 ? `Overdue by ${Math.abs(daysUntilDue)} days` : 
              `${daysUntilDue} days until due`}
        </div>
        
        <div class="card-actions">
            <button class="action-btn edit" aria-label="Edit">
                <i class="fas fa-edit"></i>
            </button>
            <button class="action-btn delete" aria-label="Delete">
                <i class="fas fa-trash-alt"></i>
            </button>
        </div>
    `;
    
    // Add event listeners
    const editBtn = cardEl.querySelector('.edit');
    const deleteBtn = cardEl.querySelector('.delete');
    
    editBtn.addEventListener('click', () => {
        openEditModal(subscription);
    });
    
    deleteBtn.addEventListener('click', () => {
        deleteSubscription(subscription.id);
    });
    
    return cardEl;
}

// Function to handle user sign-in
function handleSignIn() {
    const signInModal = document.getElementById('signInModal');
    signInModal.style.display = 'block';
    
    const closeSignInModal = document.getElementById('closeSignInModal');
    closeSignInModal.addEventListener('click', () => {
        signInModal.style.display = 'none';
    });
    
    const signInForm = document.getElementById('signInForm');
    signInForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        // Mock sign-in success for demo purposes
        const email = document.getElementById('signInEmail').value;
        updateUserProfile(email);
        signInModal.style.display = 'none';
        
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
            signInModal.style.display = 'none';
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