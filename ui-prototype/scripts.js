// Google Sheets API credentials and configuration
const SHEET_ID = 'YOUR_GOOGLE_SHEET_ID';
const API_KEY = 'YOUR_API_KEY';
const DISCOVERY_DOCS = ["https://sheets.googleapis.com/$discovery/rest?version=v4"];
const SCOPES = "https://www.googleapis.com/auth/spreadsheets";

// DOM elements cache
const elements = {
    subscriptionList: document.getElementById('subscription-list'),
    totalAmount: document.querySelector('.summary-amount'),
    addForm: document.querySelector('.subscription-form'),
    searchInput: document.getElementById('search-input'),
    categoryFilter: document.getElementById('category-filter')
};

// Application state
let subscriptions = [];
let gapi = null;
let sheetsLoaded = false;
let isSignedIn = false;

// Initialize the application
document.addEventListener('DOMContentLoaded', initApp);

function initApp() {
    // Load the Google API client library
    const script = document.createElement('script');
    script.src = 'https://apis.google.com/js/api.js';
    script.onload = loadGapiClient;
    document.body.appendChild(script);

    // Set up event listeners
    if (elements.addForm) {
        elements.addForm.addEventListener('submit', handleFormSubmit);
    }
    
    if (elements.searchInput) {
        elements.searchInput.addEventListener('input', filterSubscriptions);
    }
    
    if (elements.categoryFilter) {
        elements.categoryFilter.addEventListener('change', filterSubscriptions);
    }
}

function loadGapiClient() {
    gapi = window.gapi;
    gapi.load('client:auth2', initGapiClient);
}

function initGapiClient() {
    gapi.client.init({
        apiKey: API_KEY,
        discoveryDocs: DISCOVERY_DOCS,
        clientId: 'YOUR_CLIENT_ID.apps.googleusercontent.com',
        scope: SCOPES
    }).then(() => {
        // Listen for sign-in state changes
        gapi.auth2.getAuthInstance().isSignedIn.listen(updateSigninStatus);
        
        // Handle the initial sign-in state
        updateSigninStatus(gapi.auth2.getAuthInstance().isSignedIn.get());
        
        // Set up sign-in/out buttons if they exist
        const signInButton = document.getElementById('signin-button');
        const signOutButton = document.getElementById('signout-button');
        
        if (signInButton) {
            signInButton.addEventListener('click', handleSignIn);
        }
        
        if (signOutButton) {
            signOutButton.addEventListener('click', handleSignOut);
        }
    });
}

function updateSigninStatus(isSignedIn) {
    this.isSignedIn = isSignedIn;
    
    if (isSignedIn) {
        // User is signed in, load data
        loadSubscriptions();
    } else {
        // User is not signed in, show sign-in button
        const authSection = document.querySelector('.auth-section');
        if (authSection) {
            authSection.style.display = 'block';
        }
        
        if (elements.subscriptionList) {
            elements.subscriptionList.innerHTML = '<p>Please sign in to view your subscriptions.</p>';
        }
    }
}

function handleSignIn() {
    gapi.auth2.getAuthInstance().signIn();
}

function handleSignOut() {
    gapi.auth2.getAuthInstance().signOut();
}

// Load subscriptions from Google Sheets
function loadSubscriptions() {
    gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: 'Subscriptions!A2:G'
    }).then((response) => {
        const values = response.result.values || [];
        subscriptions = values.map((row, index) => ({
            id: index,
            name: row[0] || '',
            amount: row[1] || 0,
            billingCycle: row[2] || 'monthly',
            dueDate: row[3] || '',
            category: row[4] || 'other',
            email: row[5] || '',
            rowIndex: index + 2 // +2 because we start from A2 (1-indexed in Sheets)
        }));
        
        renderSubscriptions();
        updateTotalAmount();
    }).catch(error => {
        console.error('Error loading subscriptions:', error);
    });
}

// Render subscription cards
function renderSubscriptions() {
    if (!elements.subscriptionList) return;
    
    elements.subscriptionList.innerHTML = '';
    
    // Add section title
    const sectionTitle = document.createElement('h2');
    sectionTitle.className = 'section-title';
    sectionTitle.textContent = 'Your Subscriptions';
    elements.subscriptionList.appendChild(sectionTitle);
    
    // Add subscription cards
    subscriptions.forEach(subscription => {
        const card = createSubscriptionCard(subscription);
        elements.subscriptionList.appendChild(card);
    });
    
    // Show message if no subscriptions
    if (subscriptions.length === 0) {
        const emptyMessage = document.createElement('p');
        emptyMessage.className = 'empty-message';
        emptyMessage.textContent = 'No subscriptions yet. Add your first one!';
        elements.subscriptionList.appendChild(emptyMessage);
    }
}

// Create a subscription card element
function createSubscriptionCard(subscription) {
    const daysLeft = calculateDaysLeft(subscription.dueDate);
    
    const card = document.createElement('div');
    card.className = 'subscription-card';
    card.dataset.id = subscription.id;
    
    card.innerHTML = `
        <div class="card-header">
            <h3 class="subscription-name">${subscription.name}</h3>
            <span class="subscription-category ${subscription.category}">${capitalizeFirstLetter(subscription.category)}</span>
        </div>
        
        <div class="subscription-details">
            <div class="detail-row">
                <span class="detail-label">Amount:</span>
                <span class="detail-value">₹${subscription.amount}/${subscription.billingCycle}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Next Due:</span>
                <span class="detail-value">${formatDate(subscription.dueDate)}</span>
            </div>
            <div class="detail-row days-left ${daysLeft <= 5 ? 'warning' : ''}">
                <span class="detail-label">Days Left:</span>
                <span class="detail-value">${daysLeft}</span>
            </div>
        </div>
        
        <div class="card-actions">
            <button class="action-button edit" data-id="${subscription.id}">
                <i class="fas fa-pen"></i> Edit
            </button>
            <button class="action-button delete" data-id="${subscription.id}">
                <i class="fas fa-trash"></i> Delete
            </button>
        </div>
    `;
    
    // Add event listeners for edit and delete
    card.querySelector('.edit').addEventListener('click', () => handleEditSubscription(subscription));
    card.querySelector('.delete').addEventListener('click', () => handleDeleteSubscription(subscription));
    
    return card;
}

// Handle form submissions
function handleFormSubmit(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const subscriptionData = {
        name: formData.get('subscription-name'),
        amount: formData.get('amount'),
        billingCycle: formData.get('billing-cycle'),
        dueDate: formData.get('due-date'),
        category: formData.get('category'),
        email: formData.get('email') || ''
    };
    
    // Determine if editing or adding
    const editId = event.target.dataset.editId;
    
    if (editId !== undefined) {
        // Update existing subscription
        updateSubscription(editId, subscriptionData);
    } else {
        // Add new subscription
        addSubscription(subscriptionData);
    }
    
    // Reset form and redirect to home
    event.target.reset();
    delete event.target.dataset.editId;
    
    if (window.location.pathname.includes('add.html')) {
        window.location.href = 'index.html';
    }
}

// Add a new subscription
function addSubscription(subscriptionData) {
    gapi.client.sheets.spreadsheets.values.append({
        spreadsheetId: SHEET_ID,
        range: 'Subscriptions!A2:G2',
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        resource: {
            values: [[
                subscriptionData.name,
                subscriptionData.amount,
                subscriptionData.billingCycle,
                subscriptionData.dueDate,
                subscriptionData.category,
                subscriptionData.email
            ]]
        }
    }).then(response => {
        loadSubscriptions(); // Reload all subscriptions
    }).catch(error => {
        console.error('Error adding subscription:', error);
    });
}

// Update an existing subscription
function updateSubscription(id, subscriptionData) {
    const subscription = subscriptions.find(sub => sub.id.toString() === id.toString());
    
    if (!subscription) return;
    
    gapi.client.sheets.spreadsheets.values.update({
        spreadsheetId: SHEET_ID,
        range: `Subscriptions!A${subscription.rowIndex}:G${subscription.rowIndex}`,
        valueInputOption: 'USER_ENTERED',
        resource: {
            values: [[
                subscriptionData.name,
                subscriptionData.amount,
                subscriptionData.billingCycle,
                subscriptionData.dueDate,
                subscriptionData.category,
                subscriptionData.email
            ]]
        }
    }).then(response => {
        loadSubscriptions(); // Reload all subscriptions
    }).catch(error => {
        console.error('Error updating subscription:', error);
    });
}

// Handle editing a subscription
function handleEditSubscription(subscription) {
    // If add form page exists, redirect there with query params
    if (window.location.pathname.includes('index.html')) {
        window.location.href = `add.html?edit=${subscription.id}`;
        return;
    }
    
    // If we're already on the add form page, populate it
    const form = elements.addForm;
    if (form) {
        form.elements['subscription-name'].value = subscription.name;
        form.elements['amount'].value = subscription.amount;
        form.elements['billing-cycle'].value = subscription.billingCycle;
        form.elements['due-date'].value = subscription.dueDate;
        form.elements['category'].value = subscription.category;
        form.elements['email'].value = subscription.email || '';
        
        // Set edit ID for form submission
        form.dataset.editId = subscription.id;
        
        // Change submit button text
        const submitButton = form.querySelector('button[type="submit"]');
        if (submitButton) {
            submitButton.textContent = 'Update Subscription';
        }
    }
}

// Handle deleting a subscription
function handleDeleteSubscription(subscription) {
    if (!confirm(`Are you sure you want to delete "${subscription.name}"?`)) {
        return;
    }
    
    gapi.client.sheets.spreadsheets.batchUpdate({
        spreadsheetId: SHEET_ID,
        resource: {
            requests: [{
                deleteDimension: {
                    range: {
                        sheetId: 0, // Assuming first sheet
                        dimension: 'ROWS',
                        startIndex: subscription.rowIndex - 1, // 0-indexed
                        endIndex: subscription.rowIndex // exclusive
                    }
                }
            }]
        }
    }).then(response => {
        loadSubscriptions(); // Reload all subscriptions
    }).catch(error => {
        console.error('Error deleting subscription:', error);
    });
}

// Filter subscriptions based on search input and category filter
function filterSubscriptions() {
    const searchTerm = elements.searchInput ? elements.searchInput.value.toLowerCase() : '';
    const category = elements.categoryFilter ? elements.categoryFilter.value : '';
    
    if (!searchTerm && !category) {
        // No filters, show all
        renderSubscriptions();
        return;
    }
    
    const filtered = subscriptions.filter(subscription => {
        const matchesSearch = searchTerm ? 
            subscription.name.toLowerCase().includes(searchTerm) : true;
            
        const matchesCategory = category ? 
            subscription.category === category : true;
            
        return matchesSearch && matchesCategory;
    });
    
    // Replace subscriptions with filtered list temporarily (for rendering only)
    const original = [...subscriptions];
    subscriptions = filtered;
    renderSubscriptions();
    subscriptions = original; // Restore original list
}

// Calculate and update total monthly amount
function updateTotalAmount() {
    if (!elements.totalAmount) return;
    
    let monthlyTotal = 0;
    
    subscriptions.forEach(subscription => {
        const amount = parseFloat(subscription.amount) || 0;
        
        if (subscription.billingCycle === 'monthly') {
            monthlyTotal += amount;
        } else if (subscription.billingCycle === 'yearly') {
            monthlyTotal += amount / 12;
        }
    });
    
    elements.totalAmount.textContent = `₹${monthlyTotal.toFixed(0)}`;
}

// Calculate days left until the due date
function calculateDaysLeft(dueDateStr) {
    if (!dueDateStr) return 0;
    
    const dueDate = new Date(dueDateStr);
    const today = new Date();
    
    // Reset the time part to compare dates only
    dueDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    
    const diffTime = dueDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays > 0 ? diffDays : 0;
}

// Format date for display
function formatDate(dateStr) {
    if (!dateStr) return '';
    
    const date = new Date(dateStr);
    const day = date.getDate();
    const month = new Intl.DateTimeFormat('en', { month: 'short' }).format(date);
    const year = date.getFullYear();
    
    return `${day} ${month} ${year}`;
}

// Helper function to capitalize first letter
function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

// Check for edit parameter in URL
function checkForEditParam() {
    const urlParams = new URLSearchParams(window.location.search);
    const editId = urlParams.get('edit');
    
    if (editId && isSignedIn) {
        const subscription = subscriptions.find(sub => sub.id.toString() === editId);
        if (subscription) {
            handleEditSubscription(subscription);
        }
    }
}

// Initialize edit form if on add.html
if (window.location.pathname.includes('add.html')) {
    document.addEventListener('DOMContentLoaded', () => {
        // Add email field to form if it doesn't exist
        const form = elements.addForm;
        if (form && !form.elements['email']) {
            const emailGroup = document.createElement('div');
            emailGroup.className = 'form-group';
            emailGroup.innerHTML = `
                <label for="email">Email for Reminders</label>
                <input 
                    type="email" 
                    id="email" 
                    name="email" 
                    placeholder="your@email.com"
                >
            `;
            
            // Insert before the form actions
            const formActions = form.querySelector('.form-actions');
            form.insertBefore(emailGroup, formActions);
        }
    });
} 