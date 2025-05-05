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
    // Initialize IndexedDB
    SubscriptionDB.init()
        .then(() => {
            console.log('IndexedDB initialized');
            // Load subscriptions
            loadSubscriptions();
            
            // Setup form submission
            setupFormListener();
            
            // Setup category filter
            setupCategoryFilter();
            
            // Setup search functionality
            setupSearch();
            
            // Load theme preference
            loadThemePreference();
            
            // Set initial online status
            updateOnlineStatus();
            
            // Register for notifications
            setupNotifications();
            
            // Setup bottom navigation and settings
            setupNavigation();
            setupSettingsPanel();
        })
        .catch(error => {
            console.error('Failed to initialize IndexedDB:', error);
            showToast('Failed to initialize offline storage. Some features may not work correctly.');
        });
    
    // Listen for online/offline events
    window.addEventListener('online', handleOnlineStatusChange);
    window.addEventListener('offline', handleOnlineStatusChange);
    
    // Listen for sync messages from service worker
    if ('serviceWorker' in navigator) {
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

// Load subscriptions from IndexedDB
function loadSubscriptions() {
    // Clear existing cards
    const container = document.getElementById('subscriptionCards');
    if (container) {
        container.innerHTML = '';
    }
    
    // Load from IndexedDB
    SubscriptionDB.getAll()
        .then(subscriptions => {
            // Display subscriptions from IndexedDB
            if (subscriptions && subscriptions.length > 0) {
                subscriptions.forEach(subscription => {
                    createSubscriptionCard(subscription);
                });
                
                // Update the total monthly amount
                updateTotalAmount(subscriptions);
                
                // Update category chart
                updateCategoryChart(subscriptions);
                
                // Load upcoming reminders
                loadUpcomingReminders(subscriptions);
                
                // Hide empty state
                const emptyState = document.querySelector('.empty-state');
                if (emptyState) {
                    emptyState.style.display = 'none';
                }
            } else {
                // Show empty state
                const emptyState = document.querySelector('.empty-state');
                if (emptyState) {
                    emptyState.style.display = 'flex';
                }
            }
        })
        .catch(error => {
            console.error('Error loading subscriptions from IndexedDB:', error);
            showToast('Error loading subscriptions. Please try again.');
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

// Create a subscription card
function createSubscriptionCard(subscription) {
    const container = document.getElementById('subscriptionCards');
    
    // Hide empty state if we have subscriptions
    if (container.children.length > 0) {
        document.querySelector('.empty-state').style.display = 'none';
    }
    
    // Create card element
    const card = document.createElement('div');
    card.className = 'subscription-card';
    card.id = `subscription-${subscription.id}`;
    
    // Calculate days until due
    const dueDate = new Date(subscription.dueDate);
    const today = new Date();
    const diffTime = dueDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // Format due date
    const formattedDueDate = dueDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
    
    // Set card HTML
    card.innerHTML = `
        <span class="card-category">${subscription.category}</span>
        <div class="card-title">${subscription.name}</div>
        <div class="card-detail">
            <span class="detail-label">Amount:</span>
            <span class="amount-value">₹${subscription.amount}</span>
        </div>
        <div class="card-detail">
            <span class="detail-label">Billing:</span>
            <span class="cycle-value">${subscription.billingCycle}</span>
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
    
    // Add event listeners
    card.querySelector('.action-btn.delete').addEventListener('click', () => {
        deleteSubscription(subscription.id);
        
        // Haptic feedback
        if (navigator.vibrate) navigator.vibrate(100);
    });
    
    card.querySelector('.action-btn.edit').addEventListener('click', () => {
        // Open edit modal and populate with subscription data
        openEditModal(subscription);
        
        // Haptic feedback
        if (navigator.vibrate) navigator.vibrate(50);
    });
    
    // Add share button if Web Share API is available
    const shareBtn = card.querySelector('.share-btn');
    if (shareBtn) {
        shareBtn.addEventListener('click', () => {
            navigator.share({
                title: 'Subscription Details',
                text: `${subscription.name} - ₹${subscription.amount} (${subscription.billingCycle})`,
                url: window.location.href
            })
            .then(() => console.log('Shared successfully'))
            .catch(err => console.error('Share failed:', err));
            
            // Haptic feedback
            if (navigator.vibrate) navigator.vibrate(50);
        });
    }
    
    // Make card swipeable on mobile
    if ('ontouchstart' in window) {
        setupSwipeActions(card, subscription.id);
    }
    
    // Add to container
    container.appendChild(card);
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
        editReminderEmail.value = '';
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

// Update total monthly amount
function updateTotalAmount(subscriptions) {
    let total = 0;
    
    subscriptions.forEach(subscription => {
        const amount = parseFloat(subscription.amount);
        
        if (subscription.billingCycle === 'monthly') {
            total += amount;
        } else if (subscription.billingCycle === 'yearly') {
            total += amount / 12;
        } else if (subscription.billingCycle === 'quarterly') {
            total += amount / 3;
        } else if (subscription.billingCycle === 'weekly') {
            total += amount * 4.33; // Average weeks in a month
        } else if (subscription.billingCycle === 'biweekly') {
            total += amount * 2.17; // Average bi-weekly periods in a month
        }
    });
    
    document.getElementById('totalMonthly').textContent = total.toFixed(2);
}

// Update category chart
function updateCategoryChart(subscriptions) {
    const ctx = document.getElementById('categoryChart').getContext('2d');
    
    // Group by category
    const categories = {};
    
    subscriptions.forEach(subscription => {
        const amount = parseFloat(subscription.amount);
        const category = subscription.category;
        
        if (!categories[category]) {
            categories[category] = 0;
        }
        
        // Convert to monthly amount
        if (subscription.billingCycle === 'monthly') {
            categories[category] += amount;
        } else if (subscription.billingCycle === 'yearly') {
            categories[category] += amount / 12;
        } else if (subscription.billingCycle === 'quarterly') {
            categories[category] += amount / 3;
        } else if (subscription.billingCycle === 'weekly') {
            categories[category] += amount * 4.33; // Average weeks in a month
        } else if (subscription.billingCycle === 'biweekly') {
            categories[category] += amount * 2.17; // Average bi-weekly periods in a month
        }
    });
    
    // Prepare data for chart
    const data = {
        labels: Object.keys(categories),
        datasets: [{
            data: Object.values(categories),
            backgroundColor: [
                '#e91e63', // streaming
                '#4caf50', // fitness
                '#ff9800', // productivity
                '#9c27b0', // music
                '#2196f3', // cloud
                '#607d8b'  // other
            ]
        }]
    };
    
    // Create chart if it doesn't exist, update otherwise
    if (window.categoryChart) {
        window.categoryChart.data = data;
        window.categoryChart.update();
    } else {
        window.categoryChart = new Chart(ctx, {
            type: 'doughnut',
            data: data,
            options: {
                responsive: true,
                cutout: '70%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            usePointStyle: true,
                            padding: 15
                        }
                    }
                }
            }
        });
    }
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

// Setup search functionality
function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    
    searchInput.addEventListener('input', () => {
        const searchTerm = searchInput.value.toLowerCase();
        const cards = document.querySelectorAll('.subscription-card');
        
        cards.forEach(card => {
            const title = card.querySelector('.card-title').textContent.toLowerCase();
            
            if (title.includes(searchTerm)) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });
    });
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

// Show toast notification
function showToast(message, duration = 3000) {
    // Remove any existing toasts
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
        existingToast.remove();
    }
    
    // Create new toast
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    // Show toast
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    // Hide toast after duration
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            toast.remove();
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