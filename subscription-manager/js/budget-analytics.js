/**
 * Budget Planning & Advanced Analytics
 * Adds budget management and spending visualization to Subscription Tracker
 */

// Use the billing cycle factors from app.js or define them if not available
const BILLING_CYCLE_FACTORS = {
  'monthly': 1,
  'yearly': 1/12,
  'quarterly': 1/3,
  'weekly': 4.33, // Average weeks in a month
  'biweekly': 2.17, // Average bi-weekly periods in a month
  'daily': 30.42 // Average days in a month
};

// Initialize budget functionality
document.addEventListener('DOMContentLoaded', () => {
    console.log('Budget analytics module loaded, initializing...');
    
    // Add a small delay to ensure SubscriptionDB and Chart are loaded
    setTimeout(() => {
        initializeAnalyticsModule();
    }, 500);
});

// Separate function to initialize analytics
function initializeAnalyticsModule() {
    // Check if SubscriptionDB is defined
    if (typeof SubscriptionDB === 'undefined') {
        console.error('SubscriptionDB is not defined. Budget analytics will not work.');
        showToast('Error loading budget analytics. Please refresh the page.', 5000, 'error');
        
        // Try loading db.js dynamically
        const dbScript = document.createElement('script');
        dbScript.src = 'js/db.js';
        dbScript.onload = function() {
            console.log('SubscriptionDB loaded dynamically');
            checkAndInitializeAnalytics();
        };
        dbScript.onerror = function() {
            console.error('Failed to load SubscriptionDB dynamically');
        };
        document.head.appendChild(dbScript);
        return;
    }
    
    // Make sure Chart.js is loaded
    if (typeof Chart === 'undefined') {
        console.error('Chart.js is not loaded. Analytics will not be available.');
        showToast('Analytics could not be loaded. Please refresh the page.', 5000, 'error');
        
        // Try loading Chart.js dynamically
        const chartScript = document.createElement('script');
        chartScript.src = 'https://cdn.jsdelivr.net/npm/chart.js@3.7.0/dist/chart.min.js';
        chartScript.onload = function() {
            console.log('Chart.js loaded dynamically');
            checkAndInitializeAnalytics();
        };
        chartScript.onerror = function() {
            console.error('Failed to load Chart.js dynamically');
        };
        document.head.appendChild(chartScript);
        return;
    }
    
    // If we have both dependencies, initialize analytics
    checkAndInitializeAnalytics();
}

// Initialize analytics if dependencies are available
function checkAndInitializeAnalytics() {
    if (typeof SubscriptionDB !== 'undefined' && typeof Chart !== 'undefined') {
        try {
            console.log('Initializing budget planner and analytics dashboard');
            initializeBudgetPlanner();
            initializeAnalyticsDashboard();
            
            // Subscribe to subscription updates
            document.addEventListener('subscriptions-updated', (event) => {
                const subscriptions = event.detail.subscriptions;
                updateBudgetCalculations(subscriptions);
                updateAnalyticsDashboard(subscriptions);
            });
            
            // Initial load of data
            SubscriptionDB.getAll().then(subscriptions => {
                updateBudgetCalculations(subscriptions);
                updateAnalyticsDashboard(subscriptions);
                console.log('Analytics initialized successfully with', subscriptions.length, 'subscriptions');
            }).catch(error => {
                console.error('Error loading initial subscription data:', error);
            });
            
            showToast('Analytics loaded successfully', 2000, 'success');
        } catch (error) {
            console.error('Error initializing budget analytics:', error);
            showToast('There was an error loading the analytics. Please refresh the page.', 5000, 'error');
        }
    } else {
        console.error('Dependencies still missing after attempted dynamic loading');
    }
}

// Current budget state
const currentBudget = {
    monthly: 0,
    yearly: 0,
    currentPeriod: 'monthly'
};

// Initialize the Budget Planner
function initializeBudgetPlanner() {
    // DOM Elements
    const budgetDisplay = document.getElementById('currentBudgetDisplay');
    const budgetValueDisplay = document.getElementById('budgetValueDisplay');
    const budgetPeriodDisplay = document.querySelector('.budget-period');
    const editBudgetBtn = document.getElementById('editBudgetBtn');
    const budgetInputForm = document.getElementById('budgetInputForm');
    const budgetLimitInput = document.getElementById('budgetLimit');
    const saveBudgetBtn = document.getElementById('saveBudgetBtn');
    const cancelBudgetBtn = document.getElementById('cancelBudgetBtn');
    const budgetProgressBar = document.getElementById('budgetProgressBar');
    const budgetPercentage = document.getElementById('budgetPercentage');
    const currentSpending = document.getElementById('currentSpending');
    const budgetRemaining = document.getElementById('budgetRemaining');
    const budgetAlert = document.getElementById('budgetAlert');
    const budgetPlannerElement = document.querySelector('.budget-planner');
    const periodOptions = document.querySelectorAll('.period-option');
    const monthlyProjection = document.getElementById('monthlyProjection');
    const yearlyProjection = document.getElementById('yearlyProjection');
    const currencySymbolElements = document.querySelectorAll('.budget-currency-symbol');
    
    if (!budgetDisplay) {
        console.error('Budget display element not found in the DOM');
        return;
    }
    
    // Load saved budget from localStorage
    loadSavedBudget();
    
    // Initialize currency symbols
    updateCurrencySymbols();
    
    // Set up period selector
    periodOptions.forEach(option => {
        option.addEventListener('click', () => {
            periodOptions.forEach(opt => opt.classList.remove('active'));
            option.classList.add('active');
            
            currentBudget.currentPeriod = option.dataset.period;
            localStorage.setItem('budgetPeriod', currentBudget.currentPeriod);
            
            // Toggle yearly active class on budget planner element
            if (budgetPlannerElement) {
                budgetPlannerElement.classList.toggle('yearly-active', currentBudget.currentPeriod === 'yearly');
            }
            
            // Update budget display with current period
            updateBudgetDisplay();
            
            // Also update the input field with the new period's value
            if (budgetLimitInput && currentBudget.currentPeriod) {
                const currentBudgetValue = currentBudget[currentBudget.currentPeriod];
                budgetLimitInput.value = currentBudgetValue > 0 ? currentBudgetValue : '';
            }
        });
    });
    
    // Edit button event listener
    if (editBudgetBtn) {
        editBudgetBtn.addEventListener('click', () => {
            if (!budgetDisplay || !budgetInputForm || !budgetLimitInput) {
                console.error('Budget form elements not found');
                return;
            }
            
            const currentBudgetValue = currentBudget[currentBudget.currentPeriod];
            budgetLimitInput.value = currentBudgetValue > 0 ? currentBudgetValue : '';
            
            // Show the budget period in the label
            const periodLabel = document.querySelector('label[for="budgetLimit"]');
            if (periodLabel) {
                periodLabel.textContent = `Set ${currentBudget.currentPeriod.charAt(0).toUpperCase() + currentBudget.currentPeriod.slice(1)} Budget Limit:`;
            }
            
            budgetDisplay.style.display = 'none';
            budgetInputForm.style.display = 'flex';
            budgetLimitInput.focus();
        });
    }
    
    // Cancel button event listener
    if (cancelBudgetBtn) {
        cancelBudgetBtn.addEventListener('click', () => {
            if (!budgetInputForm || !budgetDisplay) return;
            
            budgetInputForm.style.display = 'none';
            budgetDisplay.style.display = 'flex';
        });
    }
    
    // Save button event listener
    if (saveBudgetBtn) {
        saveBudgetBtn.addEventListener('click', handleBudgetSave);
    }
    
    // Also allow form submission with Enter key
    if (budgetInputForm) {
        budgetInputForm.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                handleBudgetSave();
            }
        });
    }
    
    // Handle budget save functionality
    function handleBudgetSave() {
        if (!budgetLimitInput) return;
        
        const newBudget = parseFloat(budgetLimitInput.value) || 0;
        
        if (currentBudget.currentPeriod === 'monthly') {
            currentBudget.monthly = newBudget;
            localStorage.setItem('monthlyBudget', newBudget.toString());
            
            // Update yearly budget proportionally unless it was manually set
            if (!localStorage.getItem('yearlyBudgetManuallySet')) {
                currentBudget.yearly = newBudget * 12;
                localStorage.setItem('yearlyBudget', currentBudget.yearly.toString());
            }
        } else if (currentBudget.currentPeriod === 'yearly') {
            currentBudget.yearly = newBudget;
            localStorage.setItem('yearlyBudget', newBudget.toString());
            localStorage.setItem('yearlyBudgetManuallySet', 'true');
            
            // Optionally update monthly budget for consistency
            if (newBudget > 0) {
                currentBudget.monthly = newBudget / 12;
                localStorage.setItem('monthlyBudget', currentBudget.monthly.toString());
            }
        }
        
        if (budgetInputForm && budgetDisplay) {
            budgetInputForm.style.display = 'none';
            budgetDisplay.style.display = 'flex';
        }
        
        updateBudgetDisplay();
        
        // Show toast confirmation
        if (typeof showToast === 'function') {
            showToast(`${currentBudget.currentPeriod.charAt(0).toUpperCase() + currentBudget.currentPeriod.slice(1)} budget updated successfully!`, 3000, 'success');
        }
        
        // Haptic feedback on success
        if (navigator.vibrate) {
            navigator.vibrate(50);
        }
        
        // Load subscriptions to update budget calculations
        if (typeof SubscriptionDB !== 'undefined') {
            SubscriptionDB.getAll().then(subscriptions => {
                updateBudgetCalculations(subscriptions);
            }).catch(error => {
                console.error('Error loading subscriptions for budget update:', error);
            });
        }
    }
    
    // Initial load of subscriptions to update budget calculations
    if (typeof SubscriptionDB !== 'undefined') {
        SubscriptionDB.getAll().then(subscriptions => {
            updateBudgetCalculations(subscriptions);
        }).catch(error => {
            console.error('Error loading subscriptions for budget calculations:', error);
        });
    }
}

// Load saved budget values from localStorage
function loadSavedBudget() {
    const savedMonthlyBudget = localStorage.getItem('monthlyBudget');
    const savedYearlyBudget = localStorage.getItem('yearlyBudget');
    const savedPeriod = localStorage.getItem('budgetPeriod');
    
    if (savedMonthlyBudget) {
        currentBudget.monthly = parseFloat(savedMonthlyBudget);
    }
    
    if (savedYearlyBudget) {
        currentBudget.yearly = parseFloat(savedYearlyBudget);
    } else if (savedMonthlyBudget) {
        // Default yearly budget as 12x monthly if not set
        currentBudget.yearly = currentBudget.monthly * 12;
        localStorage.setItem('yearlyBudget', currentBudget.yearly.toString());
    }
    
    if (savedPeriod) {
        currentBudget.currentPeriod = savedPeriod;
        
        // Set active period option
        const periodOptions = document.querySelectorAll('.period-option');
        periodOptions.forEach(option => {
            option.classList.toggle('active', option.dataset.period === currentBudget.currentPeriod);
        });
        
        // Set class on budget planner element
        if (budgetPlannerElement) {
            budgetPlannerElement.classList.toggle('yearly-active', currentBudget.currentPeriod === 'yearly');
        }
    }
    
    updateBudgetDisplay();
}

// Update budget display with current values
function updateBudgetDisplay() {
    const budgetValueDisplay = document.getElementById('budgetValueDisplay');
    const budgetPeriodDisplay = document.querySelector('.budget-period');
    
    if (!budgetValueDisplay || !budgetPeriodDisplay) {
        console.warn('Budget display elements not found');
        return;
    }
    
    const currencySymbol = getCurrencySymbol();
    const budgetValue = currentBudget[currentBudget.currentPeriod] || 0;
    const periodText = currentBudget.currentPeriod === 'monthly' ? '/month' : '/year';
    
    budgetValueDisplay.textContent = `${currencySymbol}${budgetValue.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })}`;
    
    budgetPeriodDisplay.textContent = periodText;
    
    // Update any other elements that display budget information
    const budgetHeading = document.querySelector('.budget-heading');
    if (budgetHeading) {
        const periodName = currentBudget.currentPeriod.charAt(0).toUpperCase() + currentBudget.currentPeriod.slice(1);
        budgetHeading.textContent = `${periodName} Budget`;
    }
    
    // Update alternate period info if available
    const alternatePeriodInfo = document.querySelector('.alternate-period-info');
    if (alternatePeriodInfo) {
        const alternatePeriod = currentBudget.currentPeriod === 'monthly' ? 'yearly' : 'monthly';
        const alternateBudgetValue = currentBudget[alternatePeriod] || 0;
        const alternatePeriodText = alternatePeriod === 'monthly' ? '/month' : '/year';
        
        alternatePeriodInfo.textContent = `(${currencySymbol}${alternateBudgetValue.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })}${alternatePeriodText})`;
    }
}

// Update budget calculations based on subscriptions
function updateBudgetCalculations(subscriptions) {
    // Calculate total spending
    const { totalMonthly, totalYearly } = calculateTotals(subscriptions);
    
    // Update budget progress UI
    updateBudgetProgressUI(
        currentBudget.currentPeriod === 'monthly' ? totalMonthly : totalYearly,
        currentBudget[currentBudget.currentPeriod]
    );
    
    // Update projections
    updateProjections(totalMonthly, totalYearly);
}

// Calculate total monthly and yearly spending
function calculateTotals(subscriptions) {
    let totalMonthly = 0;
    
    subscriptions.forEach(subscription => {
        totalMonthly += calculateMonthlyAmount(subscription);
    });
    
    const totalYearly = totalMonthly * 12;
    
    return { totalMonthly, totalYearly };
}

// Update budget progress UI with current spending and budget limit
function updateBudgetProgressUI(currentSpending, budgetLimit) {
    const budgetProgressBar = document.getElementById('budgetProgressBar');
    const budgetPercentage = document.getElementById('budgetPercentage');
    const currentSpendingElement = document.getElementById('currentSpending');
    const budgetRemainingElement = document.getElementById('budgetRemaining');
    const budgetAlert = document.getElementById('budgetAlert');
    
    if (!budgetProgressBar || !budgetPercentage || !currentSpendingElement || !budgetRemainingElement) return;
    
    const currencySymbol = getCurrencySymbol();
    
    if (budgetLimit <= 0) {
        // No budget set
        budgetProgressBar.style.width = '0%';
        budgetPercentage.textContent = 'No budget set';
        currentSpendingElement.textContent = `${currencySymbol}${currentSpending.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })} spent`;
        budgetRemainingElement.textContent = 'Set a budget limit';
        if (budgetAlert) budgetAlert.style.display = 'none';
        return;
    }
    
    // Calculate percentage
    const percent = Math.min((currentSpending / budgetLimit) * 100, 100);
    const remaining = Math.max(budgetLimit - currentSpending, 0);
    
    // Update progress bar
    budgetProgressBar.style.width = `${percent}%`;
    budgetPercentage.textContent = `${Math.round(percent)}%`;
    
    // Update status text
    currentSpendingElement.textContent = `${currencySymbol}${currentSpending.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })} spent`;
    
    budgetRemainingElement.textContent = `${currencySymbol}${remaining.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })} remaining`;
    
    // Update progress bar color and alert
    if (percent < 60) {
        budgetProgressBar.className = 'progress-bar good';
        if (budgetAlert) budgetAlert.style.display = 'none';
    } else if (percent < 85) {
        budgetProgressBar.className = 'progress-bar caution';
        if (budgetAlert) budgetAlert.style.display = 'none';
    } else {
        budgetProgressBar.className = 'progress-bar warning';
        if (budgetAlert) budgetAlert.style.display = 'flex';
    }
}

// Update spending projections
function updateProjections(monthlySpending, yearlySpending) {
    const monthlyProjection = document.getElementById('monthlyProjection');
    const yearlyProjection = document.getElementById('yearlyProjection');
    
    if (!monthlyProjection || !yearlyProjection) return;
    
    const currencySymbol = getCurrencySymbol();
    
    monthlyProjection.textContent = `${currencySymbol}${monthlySpending.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })} / month`;
    
    yearlyProjection.textContent = `${currencySymbol}${yearlySpending.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })} / year`;
}

// Update currency symbols throughout the UI
function updateCurrencySymbols() {
    const currencySymbol = getCurrencySymbol();
    const currencySymbolElements = document.querySelectorAll('.budget-currency-symbol');
    
    currencySymbolElements.forEach(element => {
        element.textContent = currencySymbol;
    });
}

// Initialize Analytics Dashboard
function initializeAnalyticsDashboard() {
    const periodButtons = document.querySelectorAll('.time-period-btn');
    const analyticsTabs = document.querySelectorAll('.analytics-tab');
    
    if (!periodButtons.length || !analyticsTabs.length) {
        console.error('Analytics elements not found in the DOM');
        return;
    }
    
    console.log('Setting up analytics dashboard with', periodButtons.length, 'period buttons and', analyticsTabs.length, 'tabs');
    
    // Set up period buttons
    periodButtons.forEach(button => {
        // First remove any existing event listeners by cloning
        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);
        
        newButton.addEventListener('click', () => {
            // Update active state
            periodButtons.forEach(b => b.classList.remove('active'));
            newButton.classList.add('active');
            
            console.log('Period button clicked:', newButton.dataset.period);
            
            // Update charts with new period
            SubscriptionDB.getAll().then(subscriptions => {
                updateAnalyticsDashboard(subscriptions, newButton.dataset.period);
            }).catch(error => {
                console.error('Error loading subscriptions for analytics:', error);
            });
        });
    });
    
    // Set up analytics tabs
    analyticsTabs.forEach(tab => {
        // First remove any existing event listeners by cloning
        const newTab = tab.cloneNode(true);
        tab.parentNode.replaceChild(newTab, tab);
        
        newTab.addEventListener('click', () => {
            console.log('Analytics tab clicked:', newTab.dataset.tab);
            
            // Update active state
            analyticsTabs.forEach(t => t.classList.remove('active'));
            newTab.classList.add('active');
            
            // Show active tab content
            const tabContents = document.querySelectorAll('.analytics-tab-content');
            tabContents.forEach(content => {
                content.style.display = 'none';
            });
            
            const activeContent = document.getElementById(`${newTab.dataset.tab}Tab`);
            if (activeContent) {
                activeContent.style.display = 'block';
                console.log('Showing tab content:', newTab.dataset.tab);
            } else {
                console.error('Tab content not found for:', newTab.dataset.tab);
            }
        });
    });
    
    // Ensure the first tab is active and visible
    const firstTab = document.querySelector('.analytics-tab');
    const firstTabContent = document.getElementById(`${firstTab?.dataset.tab}Tab`);
    if (firstTabContent) {
        firstTabContent.style.display = 'block';
    }
    
    // Initial load of analytics
    SubscriptionDB.getAll().then(subscriptions => {
        updateAnalyticsDashboard(subscriptions);
    }).catch(error => {
        console.error('Error loading initial analytics data:', error);
    });
}

// Update Analytics Dashboard
function updateAnalyticsDashboard(subscriptions, period = '6m') {
    try {
        console.log('Updating analytics dashboard with', subscriptions?.length || 0, 'subscriptions');
        
        // Make sure the dashboard is visible
        const dashboard = document.querySelector('.analytics-dashboard');
        if (dashboard) {
            dashboard.style.display = 'block';
        }
        
        // Show empty state for analytics if no subscriptions
        const analyticsContent = document.querySelector('.analytics-content');
        if (!subscriptions || subscriptions.length === 0) {
            if (analyticsContent) {
                analyticsContent.innerHTML = `
                <div class="empty-analytics">
                    <i class="fas fa-chart-bar"></i>
                    <p>Add subscriptions to see analytics and insights.</p>
                </div>`;
            }
            return;
        }
        
        // Calculate data for analytics
        const today = new Date();
        const monthlyTotal = subscriptions.reduce((total, sub) => total + calculateMonthlyAmount(sub), 0);
        
        // Update active period button
        const periodButtons = document.querySelectorAll('.time-period-btn');
        periodButtons.forEach(button => {
            if (button.dataset.period === period) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        });
        
        // Ensure tab content containers exist
        ensureTabContainersExist();
        
        // Update tab content
        updateTrendChart(subscriptions, period);
        updateCategoryAnalysisChart(subscriptions, period);
        updateComparisonMetrics(subscriptions);
        
        // Make sure the active tab content is visible
        showActiveTabContent();
        
        console.log('Analytics dashboard updated successfully');
    } catch (error) {
        console.error('Error updating analytics dashboard:', error);
        // Attempt recovery by showing empty state
        const analyticsContent = document.querySelector('.analytics-content');
        if (analyticsContent) {
            analyticsContent.innerHTML = `
            <div class="empty-analytics">
                <i class="fas fa-exclamation-triangle"></i>
                <p>There was an error loading the analytics data. Please try refreshing the page.</p>
            </div>`;
        }
    }
}

// Ensure tab content containers exist
function ensureTabContainersExist() {
    const tabs = ['trends', 'categories', 'comparison'];
    
    tabs.forEach(tabName => {
        const tabContent = document.getElementById(`${tabName}Tab`);
        if (!tabContent) {
            console.warn(`Tab content container for ${tabName} not found, creating it`);
            const newTabContent = document.createElement('div');
            newTabContent.id = `${tabName}Tab`;
            newTabContent.className = 'analytics-tab-content';
            newTabContent.style.display = 'none';
            
            if (tabName === 'trends' || tabName === 'categories') {
                const chartContainer = document.createElement('div');
                chartContainer.className = 'chart-container-large';
                
                const canvas = document.createElement('canvas');
                canvas.id = tabName === 'trends' ? 'trendChart' : 'categoryAnalysisChart';
                
                chartContainer.appendChild(canvas);
                newTabContent.appendChild(chartContainer);
            }
            
            const analyticsContent = document.querySelector('.analytics-content');
            if (analyticsContent) {
                analyticsContent.appendChild(newTabContent);
            }
        }
    });
}

// Show active tab content
function showActiveTabContent() {
    const activeTab = document.querySelector('.analytics-tab.active');
    
    if (activeTab) {
        const tabContents = document.querySelectorAll('.analytics-tab-content');
        tabContents.forEach(content => {
            content.style.display = 'none';
        });
        
        const activeContent = document.getElementById(`${activeTab.dataset.tab}Tab`);
        if (activeContent) {
            activeContent.style.display = 'block';
            console.log('Made tab content visible:', activeTab.dataset.tab);
        }
    } else {
        // If no active tab, activate the first one
        const firstTab = document.querySelector('.analytics-tab');
        if (firstTab) {
            firstTab.classList.add('active');
            
            const firstTabContent = document.getElementById(`${firstTab.dataset.tab}Tab`);
            if (firstTabContent) {
                firstTabContent.style.display = 'block';
            }
        }
    }
}

// Update the spending trend chart
function updateTrendChart(subscriptions, period) {
    const canvas = document.getElementById('trendChart');
    if (!canvas) {
        console.error('Trend chart canvas not found');
        return;
    }
    
    try {
        // Clean up existing chart
        if (window.trendChartInstance && typeof window.trendChartInstance.destroy === 'function') {
            window.trendChartInstance.destroy();
        }
        
        // Ensure canvas is reset to avoid ghosting
        const parent = canvas.parentNode;
        const newCanvas = document.createElement('canvas');
        newCanvas.id = 'trendChart';
        newCanvas.width = canvas.width;
        newCanvas.height = canvas.height;
        parent.replaceChild(newCanvas, canvas);
        
        const currencySymbol = getCurrencySymbol();
        const { labels, data } = generateTrendData(subscriptions, period);
        
        // Create new chart
        window.trendChartInstance = new Chart(newCanvas, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Monthly Spending',
                    data: data,
                    backgroundColor: 'rgba(111, 29, 27, 0.2)',
                    borderColor: '#6f1d1b',
                    borderWidth: 2,
                    pointBackgroundColor: '#6f1d1b',
                    pointBorderColor: '#fff',
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: '#6f1d1b',
                    tension: 0.3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                return `${currencySymbol}${context.parsed.y.toFixed(2)}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        }
                    },
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: (value) => {
                                return `${currencySymbol}${value}`;
                            }
                        }
                    }
                }
            }
        });
        
        console.log('Trend chart updated successfully');
    } catch (error) {
        console.error('Error updating trend chart:', error);
    }
}

// Generate trend data for chart
function generateTrendData(subscriptions, period) {
    const now = new Date();
    let months = 6;
    
    switch (period) {
        case '1y':
            months = 12;
            break;
        case 'all':
            // Find earliest subscription
            const earliest = subscriptions.reduce((min, sub) => {
                const date = new Date(sub.dueDate);
                return date < min ? date : min;
            }, now);
            
            months = Math.max(
                6,
                Math.ceil((now - earliest) / (1000 * 60 * 60 * 24 * 30))
            );
            break;
    }
    
    // Generate labels and data points
    const labels = [];
    const data = [];
    
    for (let i = months - 1; i >= 0; i--) {
        const date = new Date(now);
        date.setMonth(date.getMonth() - i);
        
        // Format month name
        const monthName = date.toLocaleString('default', { month: 'short' });
        labels.push(`${monthName} ${date.getFullYear()}`);
        
        // Calculate spending for this month
        const spending = calculateMonthlySpendingForDate(subscriptions, date);
        data.push(spending);
    }
    
    return { labels, data };
}

// Calculate monthly spending for a specific date
function calculateMonthlySpendingForDate(subscriptions, date) {
    let totalMonthly = 0;
    
    // Only count subscriptions that existed on this date
    const filteredSubscriptions = subscriptions.filter(sub => {
        const startDate = new Date(sub.dueDate);
        return startDate <= date;
    });
    
    filteredSubscriptions.forEach(subscription => {
        totalMonthly += calculateMonthlyAmount(subscription);
    });
    
    return totalMonthly;
}

// Update category analysis chart
function updateCategoryAnalysisChart(subscriptions, period = '6m') {
    const canvas = document.getElementById('categoryAnalysisChart');
    if (!canvas) {
        console.error('Category analysis chart canvas not found');
        return;
    }
    
    try {
        // Clean up existing chart
        if (window.categoryChartInstance && typeof window.categoryChartInstance.destroy === 'function') {
            window.categoryChartInstance.destroy();
        }
        
        // Ensure canvas is reset to avoid ghosting
        const parent = canvas.parentNode;
        const newCanvas = document.createElement('canvas');
        newCanvas.id = 'categoryAnalysisChart';
        newCanvas.width = canvas.width;
        newCanvas.height = canvas.height;
        parent.replaceChild(newCanvas, canvas);
        
        const currencySymbol = getCurrencySymbol();
        const categoryData = getCategorySpendingData(subscriptions);
        
        // Handle case with no data
        if (categoryData.length === 0) {
            const context = newCanvas.getContext('2d');
            context.font = '16px Arial';
            context.fillStyle = '#666';
            context.textAlign = 'center';
            context.fillText('No category data available', newCanvas.width / 2, newCanvas.height / 2);
            return;
        }
        
        // Define category colors
        const categoryColors = {
            'streaming': '#6f1d1b', // Falu red
            'fitness': '#bb9457',   // Lion
            'productivity': '#432818', // Bistre
            'music': '#99582a',     // Brown
            'cloud': '#ffe6a7',     // Peach
            'other': '#d3a184'      // Lighter brown
        };
        
        // Prepare chart data
        const data = {
            labels: categoryData.map(item => capitalize(item.category)),
            datasets: [{
                data: categoryData.map(item => item.amount),
                backgroundColor: categoryData.map(item => categoryColors[item.category] || '#6f1d1b'),
                borderWidth: 1,
                borderColor: '#fff'
            }]
        };
        
        // Create new chart
        window.categoryChartInstance = new Chart(newCanvas, {
            type: 'doughnut',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            boxWidth: 15,
                            padding: 15
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const value = context.parsed;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = Math.round((value / total) * 100);
                                return `${currencySymbol}${value.toFixed(2)} (${percentage}%)`;
                            }
                        }
                    }
                },
                cutout: '60%',
                animation: {
                    animateScale: true,
                    animateRotate: true
                }
            }
        });
        
        console.log('Category chart updated successfully');
    } catch (error) {
        console.error('Error updating category chart:', error);
    }
}

// Get category spending data
function getCategorySpendingData(subscriptions) {
    const categories = {};
    
    subscriptions.forEach(subscription => {
        const category = subscription.category || 'other';
        const monthlyAmount = calculateMonthlyAmount(subscription);
        
        if (!categories[category]) {
            categories[category] = 0;
        }
        
        categories[category] += monthlyAmount;
    });
    
    // Convert to array for chart
    return Object.keys(categories).map(category => ({
        category,
        amount: categories[category]
    }));
}

// Update comparison metrics
function updateComparisonMetrics(subscriptions) {
    if (!subscriptions || subscriptions.length === 0) return;
    
    const mostExpensiveElement = document.getElementById('mostExpensive');
    const leastUsedElement = document.getElementById('leastUsed');
    const biggestCategoryElement = document.getElementById('biggestCategory');
    const yearChangeElement = document.getElementById('yearChange');
    const yearChangePercentElement = document.getElementById('yearChangePercent');
    
    const currencySymbol = getCurrencySymbol();
    
    // Most expensive subscription
    if (mostExpensiveElement) {
        const mostExpensive = subscriptions.reduce((max, sub) => {
            const monthlyAmount = calculateMonthlyAmount(sub);
            return monthlyAmount > max.amount ? { name: sub.name, amount: monthlyAmount } : max;
        }, { name: '', amount: 0 });
        
        mostExpensiveElement.textContent = mostExpensive.name ? 
            `${mostExpensive.name} (${currencySymbol}${mostExpensive.amount.toFixed(2)}/mo)` : 
            'None';
    }
    
    // Least used (placeholder - in a real app you'd track usage)
    if (leastUsedElement) {
        // Simulating least used based on oldest subscription
        const oldest = subscriptions.reduce((oldest, sub) => {
            const dueDate = new Date(sub.dueDate);
            return !oldest.date || dueDate < oldest.date ? 
                { name: sub.name, date: dueDate } : oldest;
        }, { name: '', date: null });
        
        leastUsedElement.textContent = oldest.name || 'None';
    }
    
    // Biggest category
    if (biggestCategoryElement) {
        const categoryTotals = {};
        
        subscriptions.forEach(sub => {
            const category = sub.category || 'other';
            const monthlyAmount = calculateMonthlyAmount(sub);
            
            if (!categoryTotals[category]) {
                categoryTotals[category] = 0;
            }
            
            categoryTotals[category] += monthlyAmount;
        });
        
        let biggestCategory = { category: '', amount: 0 };
        
        Object.keys(categoryTotals).forEach(category => {
            if (categoryTotals[category] > biggestCategory.amount) {
                biggestCategory = { 
                    category, 
                    amount: categoryTotals[category] 
                };
            }
        });
        
        biggestCategoryElement.textContent = biggestCategory.category ? 
            `${capitalize(biggestCategory.category)} (${currencySymbol}${biggestCategory.amount.toFixed(2)})` : 
            'None';
    }
    
    // Year over year change (placeholder - would normally compare to historical data)
    if (yearChangeElement && yearChangePercentElement) {
        // Simulating a YoY change
        yearChangeElement.textContent = `${currencySymbol}0.00`;
        yearChangePercentElement.textContent = `(0%)`;
        yearChangePercentElement.className = 'comparison-change neutral';
    }
}

// Calculate monthly amount from subscription based on billing cycle
function calculateMonthlyAmount(subscription) {
    const amount = parseFloat(subscription.amount) || 0;
    const factor = BILLING_CYCLE_FACTORS[subscription.billingCycle] || 1;
    return amount * factor;
}

// Get currency symbol from localStorage
function getCurrencySymbol() {
    const currency = localStorage.getItem('currency') || 'INR';
    const symbols = {
        'INR': '₹',
        'USD': '$',
        'EUR': '€',
        'GBP': '£',
        'JPY': '¥',
        'CAD': '$',
        'AUD': '$',
        'CNY': '¥',
        'RUB': '₽'
    };
    
    return symbols[currency] || symbols['INR'];
}

// Capitalize the first letter of a string
function capitalize(string) {
    if (!string) return '';
    return string.charAt(0).toUpperCase() + string.slice(1);
}

// Show toast notification
function showToast(message, duration = 3000, type = 'info') {
    // Using the app's showToast function if it exists
    if (typeof window.showToast === 'function') {
        window.showToast(message, duration, type);
        return;
    }
    
    // Otherwise, create our own toast
    let toast = document.querySelector('.analytics-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.className = 'analytics-toast';
        document.body.appendChild(toast);
    }
    
    toast.textContent = message;
    toast.className = `analytics-toast show ${type}`;
    
    setTimeout(() => {
        toast.className = toast.className.replace('show', '');
    }, duration);
} 