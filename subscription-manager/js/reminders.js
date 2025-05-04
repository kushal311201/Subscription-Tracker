/**
 * Reminders Management for Subscription Manager
 * Handles creation, editing and sending of reminders
 */

let reminders = [];

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Setup event listeners
    setupEventListeners();
    
    // Load reminders data
    loadReminders();
    
    // Initialize UI based on saved preferences
    initPreferences();
    
    // Setup notification option selectors
    setupNotificationOptions();
});

// Setup event listeners for reminders page
function setupEventListeners() {
    // Quick action buttons
    const enableAllBtn = document.getElementById('enableAllBtn');
    const disableAllBtn = document.getElementById('disableAllBtn');
    const setDefaultsBtn = document.getElementById('setDefaultsBtn');
    const testReminderBtn = document.getElementById('testReminderBtn');
    
    if (enableAllBtn) {
        enableAllBtn.addEventListener('click', enableAllReminders);
    }
    
    if (disableAllBtn) {
        disableAllBtn.addEventListener('click', disableAllReminders);
    }
    
    if (setDefaultsBtn) {
        setDefaultsBtn.addEventListener('click', saveDefaultPreferences);
    }
    
    if (testReminderBtn) {
        testReminderBtn.addEventListener('click', sendTestReminder);
    }
    
    // Default preferences change handlers
    const defaultReminderType = document.getElementById('defaultReminderType');
    const defaultReminderDays = document.getElementById('defaultReminderDays');
    
    if (defaultReminderType) {
        defaultReminderType.addEventListener('change', () => {
            if (navigator.vibrate) navigator.vibrate(30);
        });
    }
    
    if (defaultReminderDays) {
        defaultReminderDays.addEventListener('change', () => {
            if (navigator.vibrate) navigator.vibrate(30);
        });
    }
    
    // Modal event listeners
    setupReminderModalListeners();
}

// Initialize preferences from localStorage
function initPreferences() {
    const defaultReminderType = document.getElementById('defaultReminderType');
    const defaultReminderDays = document.getElementById('defaultReminderDays');
    
    // Load saved preferences from localStorage
    const savedType = localStorage.getItem('defaultReminderType') || 'push';
    const savedDays = localStorage.getItem('defaultReminderDays') || '3';
    
    // Set values in UI
    if (defaultReminderType) defaultReminderType.value = savedType;
    if (defaultReminderDays) defaultReminderDays.value = savedDays;
}

// Save current preferences as defaults
function saveDefaultPreferences() {
    const defaultReminderType = document.getElementById('defaultReminderType');
    const defaultReminderDays = document.getElementById('defaultReminderDays');
    
    if (defaultReminderType && defaultReminderDays) {
        // Save preferences to localStorage
        localStorage.setItem('defaultReminderType', defaultReminderType.value);
        localStorage.setItem('defaultReminderDays', defaultReminderDays.value);
        
        // Show confirmation
        showToast('Default preferences saved');
        
        // Haptic feedback
        if (navigator.vibrate) navigator.vibrate([40, 30, 40]);
    }
}

// Load reminders from IndexedDB
function loadReminders() {
    // Get reminders container
    const reminderList = document.getElementById('reminderList');
    const noReminders = document.getElementById('noReminders');
    
    if (!reminderList) return;
    
    // Clear existing content except the noReminders element
    Array.from(reminderList.children).forEach(child => {
        if (child !== noReminders) {
            child.remove();
        }
    });
    
    // Get all subscriptions from IndexedDB
    SubscriptionDB.getAll()
        .then(subscriptions => {
            // Filter to get only subscriptions with reminders enabled
            reminders = subscriptions.filter(sub => sub.reminderEnabled !== false);
            
            // Update counter
            document.getElementById('totalReminders').textContent = reminders.length;
            
            // Show/hide empty state
            if (reminders.length > 0) {
                if (noReminders) noReminders.style.display = 'none';
                
                // Create reminder cards
                reminders.forEach(createReminderCard);
                
                // Sort reminders by due date (closest first)
                sortReminderCards();
            } else {
                if (noReminders) noReminders.style.display = 'flex';
            }
        })
        .catch(error => {
            console.error('Error loading reminders:', error);
            showToast('Error loading reminders');
        });
}

// Create a reminder card
function createReminderCard(subscription) {
    const reminderList = document.getElementById('reminderList');
    if (!reminderList) return;
    
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
    
    // Determine reminder date based on days before
    const reminderDays = subscription.reminderDays || 3;
    const reminderDate = new Date(dueDate);
    reminderDate.setDate(reminderDate.getDate() - reminderDays);
    
    // Format reminder date
    const formattedReminderDate = reminderDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
    
    // Determine if reminder is active (due date is in the future)
    const isActive = diffDays > 0;
    
    // Get reminder type label
    const reminderType = subscription.reminderType || 'push';
    let reminderTypeLabel = 'Push notification';
    if (reminderType === 'email') {
        reminderTypeLabel = 'Email';
    } else if (reminderType === 'both') {
        reminderTypeLabel = 'Push & Email';
    }
    
    // Create card element
    const card = document.createElement('div');
    card.className = 'reminder-card';
    card.id = `reminder-${subscription.id}`;
    card.dataset.dueDate = subscription.dueDate;
    
    // Set card HTML
    card.innerHTML = `
        <div class="reminder-card-header">
            <span class="reminder-card-title">${subscription.name}</span>
            <button class="action-btn edit touch-target" aria-label="Edit reminder">
                <i class="fas fa-pencil-alt"></i>
            </button>
        </div>
        <div class="reminder-info">
            <span class="reminder-label">Subscription Amount:</span>
            <span class="reminder-value">₹${subscription.amount} (${subscription.billingCycle})</span>
        </div>
        <div class="reminder-info">
            <span class="reminder-label">Due Date:</span>
            <span class="reminder-value">${formattedDueDate}</span>
        </div>
        <div class="reminder-info">
            <span class="reminder-label">Reminder On:</span>
            <span class="reminder-value">${formattedReminderDate}</span>
        </div>
        <div class="reminder-info">
            <span class="reminder-label">Reminder Via:</span>
            <span class="reminder-value">${reminderTypeLabel}</span>
        </div>
        <div class="reminder-status">
            <span class="status-indicator ${isActive ? 'status-active' : 'status-inactive'}"></span>
            <span class="status-text">${isActive ? 'Active' : 'Inactive'}</span>
            ${isActive ? `<span class="reminder-badge">${diffDays} days until due</span>` : ''}
        </div>
    `;
    
    // Add event listener for edit button
    card.querySelector('.action-btn.edit').addEventListener('click', () => {
        openReminderEditModal(subscription);
        
        // Haptic feedback
        if (navigator.vibrate) navigator.vibrate(50);
    });
    
    // Add to container
    reminderList.appendChild(card);
}

// Sort reminder cards by due date
function sortReminderCards() {
    const reminderList = document.getElementById('reminderList');
    if (!reminderList) return;
    
    const cards = Array.from(reminderList.querySelectorAll('.reminder-card'));
    
    // Sort cards by due date
    cards.sort((a, b) => {
        const dateA = new Date(a.dataset.dueDate);
        const dateB = new Date(b.dataset.dueDate);
        return dateA - dateB;
    });
    
    // Reappend in sorted order
    cards.forEach(card => {
        reminderList.appendChild(card);
    });
}

// Enable all reminders
function enableAllReminders() {
    if (reminders.length === 0) {
        showToast('No reminders to enable');
        return;
    }
    
    // Update reminders locally
    const updatePromises = reminders.map(subscription => {
        subscription.reminderEnabled = true;
        return SubscriptionDB.update(subscription);
    });
    
    // Wait for all updates to complete
    Promise.all(updatePromises)
        .then(() => {
            loadReminders();  // Reload UI
            showToast('All reminders enabled');
            
            // Haptic feedback
            if (navigator.vibrate) navigator.vibrate([40, 30, 40]);
        })
        .catch(error => {
            console.error('Error enabling reminders:', error);
            showToast('Error enabling reminders');
        });
}

// Disable all reminders
function disableAllReminders() {
    if (reminders.length === 0) {
        showToast('No reminders to disable');
        return;
    }
    
    // Update reminders locally
    const updatePromises = reminders.map(subscription => {
        subscription.reminderEnabled = false;
        return SubscriptionDB.update(subscription);
    });
    
    // Wait for all updates to complete
    Promise.all(updatePromises)
        .then(() => {
            loadReminders();  // Reload UI
            showToast('All reminders disabled');
            
            // Haptic feedback
            if (navigator.vibrate) navigator.vibrate([40, 30, 40]);
        })
        .catch(error => {
            console.error('Error disabling reminders:', error);
            showToast('Error disabling reminders');
        });
}

// Open the edit reminder modal
function openReminderEditModal(subscription) {
    const modal = document.getElementById('editReminderModal');
    const form = document.getElementById('editReminderForm');
    const idInput = document.getElementById('editReminderSubscriptionId');
    const enabledInput = document.getElementById('reminderEnabled');
    const daysInput = document.getElementById('reminderDays');
    const typeInput = document.getElementById('reminderType');
    const emailInput = document.getElementById('reminderEmail');
    const emailGroup = document.getElementById('emailAddressGroup');
    
    if (!modal || !form) return;
    
    // Set form values
    idInput.value = subscription.id;
    enabledInput.checked = subscription.reminderEnabled !== false;
    daysInput.value = subscription.reminderDays || '3';
    
    // Set reminder type and update UI
    const reminderType = subscription.reminderType || 'push';
    typeInput.value = reminderType;
    
    // Select the correct notification option
    document.querySelectorAll('.notification-option').forEach(option => {
        option.classList.remove('selected');
        if (option.dataset.value === reminderType) {
            option.classList.add('selected');
        }
    });
    
    // Show/hide email field based on reminder type
    emailGroup.style.display = (reminderType === 'email' || reminderType === 'both') ? 'block' : 'none';
    
    // Set email if available
    if (subscription.reminderEmail) {
        emailInput.value = subscription.reminderEmail;
    } else {
        emailInput.value = '';
    }
    
    // Show modal
    modal.style.display = 'block';
}

// Setup event listeners for the reminder edit modal
function setupReminderModalListeners() {
    const modal = document.getElementById('editReminderModal');
    const form = document.getElementById('editReminderForm');
    const closeBtn = document.getElementById('closeReminderModal');
    const cancelBtn = document.getElementById('cancelReminderBtn');
    const enabledToggle = document.getElementById('reminderEnabled');
    const typeInput = document.getElementById('reminderType');
    const emailGroup = document.getElementById('emailAddressGroup');
    
    // Close modal when clicking close or cancel buttons
    const closeModal = () => {
        if (modal) modal.style.display = 'none';
    };
    
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
    
    // Setup notification options
    document.querySelectorAll('.notification-option').forEach(option => {
        option.addEventListener('click', () => {
            // Remove selected class from all options
            document.querySelectorAll('.notification-option').forEach(opt => {
                opt.classList.remove('selected');
            });
            
            // Add selected class to clicked option
            option.classList.add('selected');
            
            // Update hidden input value
            if (typeInput) typeInput.value = option.dataset.value;
            
            // Show/hide email field based on selection
            if (emailGroup) {
                emailGroup.style.display = 
                    (option.dataset.value === 'email' || option.dataset.value === 'both') 
                    ? 'block' : 'none';
            }
            
            // Haptic feedback
            if (navigator.vibrate) navigator.vibrate(30);
        });
    });
    
    // Form submission
    if (form) {
        form.addEventListener('submit', handleReminderFormSubmit);
    }
}

// Setup notification options in the edit modal
function setupNotificationOptions() {
    document.querySelectorAll('.notification-option').forEach(option => {
        option.addEventListener('click', () => {
            // Remove selected class from all options
            document.querySelectorAll('.notification-option').forEach(opt => {
                opt.classList.remove('selected');
            });
            
            // Add selected class to clicked option
            option.classList.add('selected');
            
            // Update hidden input value
            const typeInput = document.getElementById('reminderType');
            if (typeInput) typeInput.value = option.dataset.value;
            
            // Show/hide email field based on selection
            const emailGroup = document.getElementById('emailAddressGroup');
            if (emailGroup) {
                emailGroup.style.display = 
                    (option.dataset.value === 'email' || option.dataset.value === 'both') 
                    ? 'block' : 'none';
            }
            
            // Haptic feedback
            if (navigator.vibrate) navigator.vibrate(30);
        });
    });
}

// Handle reminder form submission
function handleReminderFormSubmit(event) {
    event.preventDefault();
    
    try {
        // Get form values
        const id = document.getElementById('editReminderSubscriptionId').value;
        const enabled = document.getElementById('reminderEnabled').checked;
        const days = document.getElementById('reminderDays').value;
        const type = document.getElementById('reminderType').value;
        const email = document.getElementById('reminderEmail').value;
        
        // Validate email if email reminder is selected
        if ((type === 'email' || type === 'both') && (!email || !isValidEmail(email))) {
            showToast('Please enter a valid email address');
            document.getElementById('reminderEmail').focus();
            return;
        }
        
        // Find the subscription to update
        SubscriptionDB.get(id)
            .then(subscription => {
                if (!subscription) {
                    throw new Error('Subscription not found');
                }
                
                // Update reminder settings
                subscription.reminderEnabled = enabled;
                subscription.reminderDays = days;
                subscription.reminderType = type;
                
                // Only include email if needed
                if (type === 'email' || type === 'both') {
                    subscription.reminderEmail = email;
                } else {
                    delete subscription.reminderEmail;
                }
                
                // Save to database
                return SubscriptionDB.update(subscription);
            })
            .then(() => {
                // Close modal
                document.getElementById('editReminderModal').style.display = 'none';
                
                // Reload reminders list
                loadReminders();
                
                // Show success message
                showToast('Reminder updated successfully');
                
                // Haptic feedback
                if (navigator.vibrate) navigator.vibrate([50, 30, 100]);
            })
            .catch(error => {
                console.error('Error updating reminder:', error);
                showToast('Error updating reminder');
            });
    } catch (error) {
        console.error('Error in reminder form submission:', error);
        showToast('An error occurred. Please try again.');
    }
}

// Send a test reminder
function sendTestReminder() {
    // Get preferences
    const type = document.getElementById('defaultReminderType').value;
    const emailInput = document.getElementById('reminderEmail');
    let email = '';
    
    // Check if we need an email address
    if ((type === 'email' || type === 'both')) {
        // First check if user provided an email in the form
        if (emailInput && emailInput.value && isValidEmail(emailInput.value)) {
            email = emailInput.value;
        } else {
            // Ask for email if not provided
            email = prompt('Please enter your email address for the test reminder:');
            
            // Validate email
            if (!email || !isValidEmail(email)) {
                showToast('Please enter a valid email address');
                return;
            }
        }
    }
    
    // Create a test reminder
    const testReminder = {
        title: 'Test Reminder',
        message: 'This is a test reminder from Subscription Manager',
        type: type,
        email: email
    };
    
    // Show sending indicator
    showToast('Sending test reminder...');
    
    // Simulate sending (in a real app, this would send to a server or use the Notifications API)
    setTimeout(() => {
        console.log('Test reminder sent:', testReminder);
        
        // Show different messages based on type
        if (type === 'push') {
            showTestPushNotification(testReminder);
            showToast('Test push notification sent');
        } else if (type === 'email') {
            showToast(`Test email would be sent to ${email}`);
        } else if (type === 'both') {
            showTestPushNotification(testReminder);
            showToast(`Test notification sent and email would be sent to ${email}`);
        }
        
        // Haptic feedback
        if (navigator.vibrate) navigator.vibrate([40, 30, 40]);
    }, 1000);
}

// Show a test push notification
function showTestPushNotification(reminder) {
    // Check if notifications are supported and permission is granted
    if ('Notification' in window && Notification.permission === 'granted') {
        // Create and show the notification
        const notification = new Notification(reminder.title, {
            body: reminder.message,
            icon: '/images/icon-192.png'
        });
        
        // Close notification after 5 seconds
        setTimeout(() => notification.close(), 5000);
    } else if ('Notification' in window && Notification.permission !== 'denied') {
        // Request permission
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                showTestPushNotification(reminder);
            }
        });
    }
}

// Helper function to validate email
function isValidEmail(email) {
    const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
}

// Show toast notification (copied from app.js for convenience)
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