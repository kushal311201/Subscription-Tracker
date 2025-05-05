/**
 * Reminders Management for Subscription Manager
 * Handles creation, editing and sending of reminders
 */

let reminders = [];

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Show the app loader
    showAppLoader();
    
    // Setup event listeners
    setupEventListeners();
    
    // Load reminders data
    loadReminders();
    
    // Initialize UI based on saved preferences
    initPreferences();
    
    // Hide loader after initialization with a slight delay for better UX
    setTimeout(hideAppLoader, 1000);
    
    // Start animations
    setTimeout(startPageAnimations, 1200);
});

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

// Start page animations
function startPageAnimations() {
    // Animate elements with the animate-in class
    const animatedElements = document.querySelectorAll('.animate-in');
    animatedElements.forEach((element, index) => {
        // Add staggered delay
        setTimeout(() => {
            element.classList.add('animate-fade-in');
        }, index * 150);
    });
    
    // Use GSAP for reminder cards animation if available
    if (window.gsap && document.querySelector('.reminder-card')) {
        gsap.from('.reminder-card', {
            duration: 0.6,
            opacity: 0,
            y: 30,
            stagger: 0.1,
            ease: "power2.out"
        });
    }
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
    const defaultReminderDays = document.getElementById('defaultReminderDays');
    
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
    const defaultReminderDays = document.getElementById('defaultReminderDays');
    
    // Load saved preferences from localStorage
    const savedDays = localStorage.getItem('defaultReminderDays') || '3';
    
    // Set values in UI
    if (defaultReminderDays) defaultReminderDays.value = savedDays;
}

// Save current preferences as defaults
function saveDefaultPreferences() {
    const defaultReminderDays = document.getElementById('defaultReminderDays');
    
    if (defaultReminderDays) {
        // Save preferences to localStorage
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
            // Filter to get only subscriptions with reminders enabled (either push or email)
            reminders = subscriptions.filter(sub => sub.reminderEnabled || sub.reminderEmailEnabled);
            
            // Update counter
            document.getElementById('totalReminders').textContent = reminders.length;
            
            // Show/hide empty state
            if (reminders.length > 0) {
                if (noReminders) noReminders.style.display = 'none';
                
                // Create reminder cards
                reminders.forEach(createReminderCard);
                
                // Sort reminders by due date (closest first)
                sortReminderCards();
                
                // Load reminders by category
                loadRemindersByCategory(reminders);
                
                // Load monthly reminders
                loadMonthlyReminders(reminders);
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
    let notificationTypeText = "";
    if (subscription.reminderEnabled && subscription.reminderEmailEnabled) {
        notificationTypeText = "Push & Email";
    } else if (subscription.reminderEnabled) {
        notificationTypeText = "Push notification";
    } else if (subscription.reminderEmailEnabled) {
        notificationTypeText = "Email";
    } else {
        notificationTypeText = "None";
    }
    
    // Get currency symbol
    const currencySymbol = getCurrencySymbol();
    
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
            <span class="reminder-value">${currencySymbol}${subscription.amount} (${subscription.billingCycle})</span>
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
            <span class="reminder-value">${notificationTypeText}</span>
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
    
    // Animate the card
    animateElement(card);
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
        subscription.reminderEmailEnabled = false;
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
    const emailEnabledInput = document.getElementById('reminderEmailEnabled');
    const daysInput = document.getElementById('reminderDays');
    const emailInput = document.getElementById('reminderEmail');
    const emailGroup = document.getElementById('emailAddressGroup');
    
    if (!modal || !form) return;
    
    // Set form values
    idInput.value = subscription.id;
    enabledInput.checked = subscription.reminderEnabled || false;
    emailEnabledInput.checked = subscription.reminderEmailEnabled || false;
    daysInput.value = subscription.reminderDays || '3';
    
    // Show/hide email field based on email notification toggle
    emailGroup.style.display = emailEnabledInput.checked ? 'block' : 'none';
    
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
    const emailEnabledToggle = document.getElementById('reminderEmailEnabled');
    const emailGroup = document.getElementById('emailAddressGroup');
    
    // Close modal when clicking close or cancel buttons
    const closeModal = () => {
        if (modal) modal.style.display = 'none';
    };
    
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
    
    // Toggle email field visibility based on email notification toggle
    if (emailEnabledToggle) {
        emailEnabledToggle.addEventListener('change', () => {
            if (emailGroup) {
                emailGroup.style.display = emailEnabledToggle.checked ? 'block' : 'none';
            }
            
            // Haptic feedback
            if (navigator.vibrate) navigator.vibrate(30);
        });
    }
    
    // Form submission
    if (form) {
        form.addEventListener('submit', handleReminderFormSubmit);
    }
}

// Handle reminder form submission
function handleReminderFormSubmit(event) {
    event.preventDefault();
    
    try {
        // Get form values
        const id = document.getElementById('editReminderSubscriptionId').value;
        const enabled = document.getElementById('reminderEnabled').checked;
        const emailEnabled = document.getElementById('reminderEmailEnabled').checked;
        const days = document.getElementById('reminderDays').value;
        const email = document.getElementById('reminderEmail').value;
        
        // Validate email if email reminder is enabled
        if (emailEnabled && (!email || !isValidEmail(email))) {
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
                subscription.reminderEmailEnabled = emailEnabled;
                subscription.reminderDays = days;
                
                // Only include email if needed
                if (emailEnabled) {
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
    // Determine if email is required
    const emailInput = document.getElementById('reminderEmail');
    let email = '';
    let useEmail = false;
    
    // Prompt for email address if needed for testing
    email = prompt('Enter your email for test reminder (leave empty for push notification only):');
    useEmail = email && isValidEmail(email);
    
    // Create a test reminder
    const testReminder = {
        title: 'Test Reminder',
        message: 'This is a test reminder from Subscription Manager',
        useEmail: useEmail,
        email: useEmail ? email : ''
    };
    
    // Show sending indicator
    showToast('Sending test reminder...');
    
    // Simulate sending (in a real app, this would send to a server or use the Notifications API)
    setTimeout(() => {
        console.log('Test reminder sent:', testReminder);
        
        // Show test push notification
        showTestPushNotification(testReminder);
        
        // Show confirmation based on what was sent
        if (useEmail) {
            showToast(`Test notification sent and email would be sent to ${email}`);
        } else {
            showToast('Test push notification sent');
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

// Load reminders by category
function loadRemindersByCategory(reminders) {
    const categoryTags = document.getElementById('categoryTags');
    const categoryReminders = document.getElementById('categoryReminders');
    
    if (!categoryTags || !categoryReminders) return;
    
    // Clear existing tags
    categoryTags.innerHTML = '';
    categoryReminders.innerHTML = '';
    
    // Get unique categories
    const categories = {};
    reminders.forEach(reminder => {
        if (!categories[reminder.category]) {
            categories[reminder.category] = 0;
        }
        categories[reminder.category]++;
    });
    
    // Create "All" tag
    const allTag = document.createElement('div');
    allTag.className = 'category-tag active';
    allTag.textContent = 'All Categories';
    allTag.dataset.category = 'all';
    categoryTags.appendChild(allTag);
    
    // Create category tags
    Object.keys(categories).forEach(category => {
        const tag = document.createElement('div');
        tag.className = 'category-tag';
        tag.textContent = `${category} (${categories[category]})`;
        tag.dataset.category = category;
        categoryTags.appendChild(tag);
    });
    
    // Add click event to category tags
    const tags = categoryTags.querySelectorAll('.category-tag');
    tags.forEach(tag => {
        tag.addEventListener('click', () => {
            // Remove active class from all tags
            tags.forEach(t => t.classList.remove('active'));
            
            // Add active class to clicked tag
            tag.classList.add('active');
            
            // Filter reminders by category
            filterRemindersByCategory(tag.dataset.category);
            
            // Haptic feedback
            if (navigator.vibrate) navigator.vibrate(30);
        });
    });
    
    // Show all reminders initially
    filterRemindersByCategory('all');
}

// Filter reminders by category
function filterRemindersByCategory(category) {
    const reminderCards = document.querySelectorAll('.reminder-card');
    
    if (category === 'all') {
        // Show all reminders
        reminderCards.forEach(card => {
            card.style.display = 'block';
        });
    } else {
        // Show only reminders in the selected category
        reminderCards.forEach(card => {
            const subscription = reminders.find(r => `reminder-${r.id}` === card.id);
            if (subscription && subscription.category === category) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });
    }
}

// Load monthly reminders
function loadMonthlyReminders(reminders) {
    const monthlyRemindersList = document.getElementById('monthlyRemindersList');
    
    if (!monthlyRemindersList) return;
    
    // Clear existing reminders
    monthlyRemindersList.innerHTML = '';
    
    // Get current month
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    // Filter reminders due this month
    const thisMonthReminders = reminders.filter(reminder => {
        const dueDate = new Date(reminder.dueDate);
        return dueDate.getMonth() === currentMonth && dueDate.getFullYear() === currentYear;
    });
    
    // Sort by due date (ascending)
    thisMonthReminders.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    
    if (thisMonthReminders.length === 0) {
        // Show empty message
        monthlyRemindersList.innerHTML = `
            <div class="no-reminders">
                <i class="fas fa-calendar-times"></i>
                <p>No subscriptions due this month.</p>
            </div>
        `;
        return;
    }
    
    // Create reminder items
    thisMonthReminders.forEach(subscription => {
        const dueDate = new Date(subscription.dueDate);
        
        // Format date
        const formattedDate = dueDate.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
        });
        
        // Create reminder item
        const reminderItem = document.createElement('div');
        reminderItem.className = 'monthly-reminder-item';
        
        // Get currency symbol
        const currencySymbol = getCurrencySymbol();
        
        reminderItem.innerHTML = `
            <div class="monthly-reminder-date">${formattedDate}</div>
            <div class="monthly-reminder-name">${subscription.name}</div>
            <div class="monthly-reminder-amount">${currencySymbol}${subscription.amount}</div>
        `;
        
        // Add click event to navigate to edit
        reminderItem.addEventListener('click', () => {
            openReminderEditModal(subscription);
        });
        
        monthlyRemindersList.appendChild(reminderItem);
    });
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