// Subscription Manager - Main JavaScript File
//
// IMPORTANT: Before using this app, you need to:
// 1. Create an Airtable account at https://airtable.com
// 2. Create a base with a table named "Subscriptions"
// 3. Get your API key from https://airtable.com/account
// 4. Get your Base ID from https://airtable.com/api
// 5. Replace the values below with your actual keys
//
// The Subscriptions table should have these fields:
// - name (Single line text)
// - amount (Number)
// - billingCycle (Single select: monthly, yearly, quarterly)
// - dueDate (Date)
// - category (Single select: streaming, fitness, productivity, music, cloud, other)
//
// To install this app as a PWA (Progressive Web App):
// 1. Open the app in Chrome or Edge browser
// 2. Click the install icon in the address bar (or find "Install app" in the menu)
// 3. Follow the prompts to install
// 4. The app will appear on your home screen or Start menu

// Initialize Airtable API
// You'll need to replace 'YOUR_API_KEY' and 'YOUR_BASE_ID' with actual values
const airtableApiKey = 'YOUR_API_KEY';
const airtableBaseId = 'YOUR_BASE_ID';
const airtableTableName = 'Subscriptions';

// Initialize Airtable
const base = new Airtable({ apiKey: airtableApiKey }).base(airtableBaseId);
const table = base(airtableTableName);

// DOM Elements
const subscriptionForm = document.getElementById('subscriptionForm');
const subscriptionCards = document.getElementById('subscriptionCards');
const totalMonthlyElement = document.getElementById('totalMonthly');
const filterCategorySelect = document.getElementById('filterCategory');
const searchInput = document.getElementById('searchInput');
const resetDataLink = document.getElementById('resetDataLink');
const categoryChartCanvas = document.getElementById('categoryChart');

// Global Variables
let subscriptions = [];
let categoryChart = null;

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    loadSubscriptions();
    
    subscriptionForm.addEventListener('submit', handleFormSubmit);
    filterCategorySelect.addEventListener('change', filterSubscriptions);
    searchInput.addEventListener('input', filterSubscriptions);
    resetDataLink.addEventListener('click', handleDataReset);
});

// Create Subscription Card
function createSubscriptionCard(subscription) {
    const card = document.createElement('div');
    card.className = 'subscription-card';
    card.dataset.id = subscription.id;
    
    // Format category for display
    const categoryDisplay = subscription.category.charAt(0).toUpperCase() + subscription.category.slice(1);
    
    // Calculate days left
    const dueDate = new Date(subscription.dueDate);
    const today = new Date();
    const timeDiff = dueDate.getTime() - today.getTime();
    const daysLeft = Math.ceil(timeDiff / (1000 * 3600 * 24));
    
    // Determine warning class
    const warningClass = daysLeft <= 3 ? 'warning' : '';
    
    // Calculate monthly cost
    let monthlyCost = parseFloat(subscription.amount);
    if (subscription.billingCycle === 'yearly') {
        monthlyCost = monthlyCost / 12;
    } else if (subscription.billingCycle === 'quarterly') {
        monthlyCost = monthlyCost / 3;
    }
    
    // Format next due date
    const formattedDueDate = dueDate.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
    
    card.innerHTML = `
        <span class="card-category">${categoryDisplay}</span>
        <h3 class="card-title">${subscription.name}</h3>
        <div class="card-detail">
            <span class="detail-label">Amount:</span>
            <span>₹${parseFloat(subscription.amount).toFixed(2)} / ${subscription.billingCycle}</span>
        </div>
        <div class="card-detail">
            <span class="detail-label">Monthly Cost:</span>
            <span>₹${monthlyCost.toFixed(2)}</span>
        </div>
        <div class="card-detail">
            <span class="detail-label">Due Date:</span>
            <span>${formattedDueDate}</span>
        </div>
        <div class="days-left ${warningClass}">
            ${daysLeft} days left until renewal
        </div>
        <div class="card-actions">
            <button class="action-btn edit" onclick="handleEditSubscription('${subscription.id}')">
                <i class="fas fa-edit"></i>
            </button>
            <button class="action-btn delete" onclick="handleDeleteSubscription('${subscription.id}')">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;
    
    return card;
}

// Add Subscription
async function addSubscription(subscription) {
    try {
        const record = await table.create({
            name: subscription.name,
            amount: subscription.amount,
            billingCycle: subscription.billingCycle,
            dueDate: subscription.dueDate,
            category: subscription.category
        });
        
        // Add id to subscription object
        subscription.id = record.id;
        
        // Add to local array
        subscriptions.push(subscription);
        
        // Update UI
        renderSubscriptions();
        calculateTotalMonthly();
        updateChart();
        
        // Show success message
        alert('Subscription added successfully!');
        
        return true;
    } catch (error) {
        console.error('Error adding subscription:', error);
        alert('Failed to add subscription. Please try again.');
        return false;
    }
}

// Update Subscription
async function updateSubscription(id, updatedData) {
    try {
        await table.update(id, updatedData);
        
        // Update local array
        const index = subscriptions.findIndex(sub => sub.id === id);
        if (index !== -1) {
            subscriptions[index] = { ...subscriptions[index], ...updatedData };
        }
        
        // Update UI
        renderSubscriptions();
        calculateTotalMonthly();
        updateChart();
        
        return true;
    } catch (error) {
        console.error('Error updating subscription:', error);
        alert('Failed to update subscription. Please try again.');
        return false;
    }
}

// Delete Subscription
async function deleteSubscription(id) {
    try {
        await table.destroy(id);
        
        // Remove from local array
        subscriptions = subscriptions.filter(sub => sub.id !== id);
        
        // Update UI
        renderSubscriptions();
        calculateTotalMonthly();
        updateChart();
        
        return true;
    } catch (error) {
        console.error('Error deleting subscription:', error);
        alert('Failed to delete subscription. Please try again.');
        return false;
    }
}

// Load Subscriptions from Airtable
async function loadSubscriptions() {
    try {
        // Show loading indicator
        subscriptionCards.innerHTML = '<div class="empty-state"><i class="fas fa-spinner fa-spin"></i><p>Loading your subscriptions...</p></div>';
        
        const records = await table.select().all();
        subscriptions = records.map(record => ({
            id: record.id,
            name: record.get('name'),
            amount: record.get('amount'),
            billingCycle: record.get('billingCycle'),
            dueDate: record.get('dueDate'),
            category: record.get('category')
        }));
        
        // Update UI
        renderSubscriptions();
        calculateTotalMonthly();
        initChart();
        
    } catch (error) {
        console.error('Error loading subscriptions:', error);
        subscriptionCards.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-circle"></i><p>Error loading subscriptions. Please try again later.</p></div>';
    }
}

// Render Subscriptions
function renderSubscriptions(filteredSubscriptions) {
    const subsToRender = filteredSubscriptions || subscriptions;
    
    // Clear container
    subscriptionCards.innerHTML = '';
    
    if (subsToRender.length === 0) {
        subscriptionCards.innerHTML = '<div class="empty-state"><i class="fas fa-list-ul"></i><p>No subscriptions found. Add your first subscription using the form.</p></div>';
        return;
    }
    
    // Sort by due date
    subsToRender.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    
    // Create and append cards
    subsToRender.forEach(subscription => {
        const card = createSubscriptionCard(subscription);
        subscriptionCards.appendChild(card);
    });
}

// Filter Subscriptions
function filterSubscriptions() {
    const category = filterCategorySelect.value;
    const searchTerm = searchInput.value.toLowerCase();
    
    let filteredSubs = subscriptions;
    
    // Filter by category
    if (category !== 'all') {
        filteredSubs = filteredSubs.filter(sub => sub.category === category);
    }
    
    // Filter by search term
    if (searchTerm) {
        filteredSubs = filteredSubs.filter(sub => 
            sub.name.toLowerCase().includes(searchTerm)
        );
    }
    
    renderSubscriptions(filteredSubs);
}

// Calculate Monthly Total
function calculateTotalMonthly() {
    let totalMonthly = 0;
    
    subscriptions.forEach(sub => {
        let amount = parseFloat(sub.amount);
        
        if (sub.billingCycle === 'yearly') {
            amount = amount / 12;
        } else if (sub.billingCycle === 'quarterly') {
            amount = amount / 3;
        }
        
        totalMonthly += amount;
    });
    
    totalMonthlyElement.textContent = totalMonthly.toFixed(2);
}

// Initialize Chart
function initChart() {
    // Destroy existing chart if it exists
    if (categoryChart) {
        categoryChart.destroy();
    }
    
    // Prepare data for chart
    updateChart();
}

// Update Chart
function updateChart() {
    // Group subscriptions by category
    const categoryTotals = {};
    
    subscriptions.forEach(sub => {
        let monthlyCost = parseFloat(sub.amount);
        
        if (sub.billingCycle === 'yearly') {
            monthlyCost = monthlyCost / 12;
        } else if (sub.billingCycle === 'quarterly') {
            monthlyCost = monthlyCost / 3;
        }
        
        if (!categoryTotals[sub.category]) {
            categoryTotals[sub.category] = 0;
        }
        
        categoryTotals[sub.category] += monthlyCost;
    });
    
    // Prepare chart data
    const categories = Object.keys(categoryTotals);
    const data = Object.values(categoryTotals);
    
    // Define colors for categories
    const colors = [
        '#4a6bdf', // Blue
        '#60cd90', // Green
        '#ffa726', // Orange
        '#ef5350', // Red
        '#ab47bc', // Purple
        '#26c6da', // Cyan
        '#8d6e63', // Brown
    ];
    
    // Initialize chart
    if (categoryChart) {
        categoryChart.destroy();
    }
    
    if (categories.length > 0) {
        categoryChart = new Chart(categoryChartCanvas, {
            type: 'pie',
            data: {
                labels: categories.map(cat => cat.charAt(0).toUpperCase() + cat.slice(1)),
                datasets: [{
                    data: data,
                    backgroundColor: colors.slice(0, categories.length),
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            boxWidth: 15,
                            padding: 10
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const value = context.raw;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = Math.round((value / total) * 100);
                                return `₹${value.toFixed(2)} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }
}

// Handle Form Submit
function handleFormSubmit(event) {
    event.preventDefault();
    
    const name = document.getElementById('subscriptionName').value;
    const amount = document.getElementById('subscriptionAmount').value;
    const billingCycle = document.getElementById('billingCycle').value;
    const dueDate = document.getElementById('dueDate').value;
    const category = document.getElementById('category').value;
    
    const newSubscription = {
        name,
        amount,
        billingCycle,
        dueDate,
        category
    };
    
    addSubscription(newSubscription);
    
    // Reset form
    subscriptionForm.reset();
}

// Handle Edit Subscription
function handleEditSubscription(id) {
    const subscription = subscriptions.find(sub => sub.id === id);
    
    if (!subscription) {
        alert('Subscription not found!');
        return;
    }
    
    // Populate form with subscription data
    document.getElementById('subscriptionName').value = subscription.name;
    document.getElementById('subscriptionAmount').value = subscription.amount;
    document.getElementById('billingCycle').value = subscription.billingCycle;
    document.getElementById('dueDate').value = subscription.dueDate;
    document.getElementById('category').value = subscription.category;
    
    // Change submit button to update button
    const submitButton = subscriptionForm.querySelector('button[type="submit"]');
    submitButton.textContent = 'Update Subscription';
    
    // Add data-id attribute to form
    subscriptionForm.dataset.editId = id;
    
    // Scroll to form
    subscriptionForm.scrollIntoView({ behavior: 'smooth' });
    
    // Change form submission handler for update
    subscriptionForm.removeEventListener('submit', handleFormSubmit);
    subscriptionForm.addEventListener('submit', handleUpdateSubmit);
}

// Handle Update Submit
function handleUpdateSubmit(event) {
    event.preventDefault();
    
    const id = subscriptionForm.dataset.editId;
    
    const updatedData = {
        name: document.getElementById('subscriptionName').value,
        amount: document.getElementById('subscriptionAmount').value,
        billingCycle: document.getElementById('billingCycle').value,
        dueDate: document.getElementById('dueDate').value,
        category: document.getElementById('category').value
    };
    
    updateSubscription(id, updatedData).then(success => {
        if (success) {
            // Reset form
            subscriptionForm.reset();
            
            // Change button text back
            const submitButton = subscriptionForm.querySelector('button[type="submit"]');
            submitButton.textContent = 'Add Subscription';
            
            // Remove data-id attribute
            delete subscriptionForm.dataset.editId;
            
            // Change form submission handler back to add
            subscriptionForm.removeEventListener('submit', handleUpdateSubmit);
            subscriptionForm.addEventListener('submit', handleFormSubmit);
        }
    });
}

// Handle Delete Subscription
function handleDeleteSubscription(id) {
    if (confirm('Are you sure you want to delete this subscription?')) {
        deleteSubscription(id);
    }
}

// Handle Data Reset
function handleDataReset(event) {
    event.preventDefault();
    
    if (confirm('Are you sure you want to reset all data? This will delete all your subscriptions.')) {
        // Delete all subscriptions
        const deletePromises = subscriptions.map(sub => deleteSubscription(sub.id));
        
        Promise.all(deletePromises)
            .then(() => {
                subscriptions = [];
                renderSubscriptions();
                calculateTotalMonthly();
                updateChart();
                alert('All data has been reset.');
            })
            .catch(error => {
                console.error('Error resetting data:', error);
                alert('Failed to reset all data. Please try again.');
            });
    }
} 