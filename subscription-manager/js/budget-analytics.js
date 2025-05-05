/**
 * Budget Planning & Advanced Analytics
 * Adds budget management and spending visualization to Subscription Tracker
 */

// Initialize budget functionality
document.addEventListener('DOMContentLoaded', () => {
    initializeBudgetPlanner();
    initializeAnalyticsDashboard();
    
    // Subscribe to subscription updates
    document.addEventListener('subscriptions-updated', (event) => {
        const subscriptions = event.detail.subscriptions;
        updateBudgetCalculations(subscriptions);
        updateAnalyticsDashboard(subscriptions);
    });
});

// Budget variables
let currentBudget = {
    monthly: parseFloat(localStorage.getItem('budgetLimitMonthly') || 0),
    yearly: parseFloat(localStorage.getItem('budgetLimitYearly') || 0),
    currentPeriod: localStorage.getItem('budgetPeriod') || 'monthly'
};

// Initialize budget planner UI and functionality
function initializeBudgetPlanner() {
    const budgetLimitInput = document.getElementById('budgetLimit');
    const saveBudgetBtn = document.getElementById('saveBudgetBtn');
    const periodOptions = document.querySelectorAll('.period-option');
    const budgetCurrencySymbol = document.getElementById('budgetCurrencySymbol');
    
    // Set currency symbol
    if (budgetCurrencySymbol) {
        budgetCurrencySymbol.textContent = getCurrencySymbol();
    }
    
    // Set active period
    periodOptions.forEach(option => {
        if (option.dataset.period === currentBudget.currentPeriod) {
            option.classList.add('active');
        }
        
        option.addEventListener('click', () => {
            // Update active state
            periodOptions.forEach(o => o.classList.remove('active'));
            option.classList.add('active');
            
            // Update current period
            currentBudget.currentPeriod = option.dataset.period;
            localStorage.setItem('budgetPeriod', currentBudget.currentPeriod);
            
            // Update the input value
            if (budgetLimitInput) {
                budgetLimitInput.value = currentBudget[currentBudget.currentPeriod] || '';
            }
            
            // Update calculations
            SubscriptionDB.getAll().then(subscriptions => {
                updateBudgetCalculations(subscriptions);
            });
        });
    });
    
    // Set initial budget value
    if (budgetLimitInput) {
        budgetLimitInput.value = currentBudget[currentBudget.currentPeriod] || '';
    }
    
    // Save budget button
    if (saveBudgetBtn) {
        saveBudgetBtn.addEventListener('click', () => {
            if (budgetLimitInput && budgetLimitInput.value.trim() !== '') {
                const budgetValue = parseFloat(budgetLimitInput.value);
                if (!isNaN(budgetValue) && budgetValue >= 0) {
                    // Save to local storage
                    currentBudget[currentBudget.currentPeriod] = budgetValue;
                    localStorage.setItem(`budgetLimit${capitalize(currentBudget.currentPeriod)}`, budgetValue);
                    
                    // Update UI
                    SubscriptionDB.getAll().then(subscriptions => {
                        updateBudgetCalculations(subscriptions);
                    });
                    
                    // Show success message
                    showToast('Budget saved successfully');
                    
                    // Haptic feedback
                    if (navigator.vibrate) navigator.vibrate(30);
                } else {
                    showToast('Please enter a valid budget amount', 3000, 'error');
                }
            } else {
                // Clear budget
                currentBudget[currentBudget.currentPeriod] = 0;
                localStorage.setItem(`budgetLimit${capitalize(currentBudget.currentPeriod)}`, 0);
                
                // Update UI
                SubscriptionDB.getAll().then(subscriptions => {
                    updateBudgetCalculations(subscriptions);
                });
                
                showToast('Budget cleared');
            }
        });
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

// Calculate monthly and yearly totals
function calculateTotals(subscriptions) {
    let totalMonthly = 0;
    
    // Calculate monthly total using the billing cycle conversion factors
    subscriptions.forEach(subscription => {
        const amount = parseFloat(subscription.amount);
        const cycle = subscription.billingCycle;
        
        // Use the cached conversion factors from app.js
        const factor = BILLING_CYCLE_FACTORS[cycle] || 1;
        totalMonthly += amount * factor;
    });
    
    // Calculate yearly total (monthly × 12)
    const totalYearly = totalMonthly * 12;
    
    return { totalMonthly, totalYearly };
}

// Update budget progress UI
function updateBudgetProgressUI(currentSpending, budgetLimit) {
    const budgetPercentageEl = document.getElementById('budgetPercentage');
    const budgetProgressBar = document.getElementById('budgetProgressBar');
    const currentSpendingEl = document.getElementById('currentSpending');
    const budgetRemainingEl = document.getElementById('budgetRemaining');
    const budgetAlert = document.getElementById('budgetAlert');
    
    // Currency symbol for formatting
    const currencySymbol = getCurrencySymbol();
    
    // Calculate percentage
    let percentage = 0;
    if (budgetLimit > 0) {
        percentage = Math.min(Math.round((currentSpending / budgetLimit) * 100), 100);
    }
    
    // Update elements
    if (budgetPercentageEl) {
        budgetPercentageEl.textContent = `${percentage}%`;
    }
    
    if (budgetProgressBar) {
        budgetProgressBar.style.width = `${percentage}%`;
        
        // Change color based on percentage
        budgetProgressBar.className = 'progress-bar';
        if (percentage >= 90) {
            budgetProgressBar.classList.add('critical');
        } else if (percentage >= 75) {
            budgetProgressBar.classList.add('warning');
        } else if (percentage >= 50) {
            budgetProgressBar.classList.add('caution');
        } else {
            budgetProgressBar.classList.add('good');
        }
    }
    
    if (currentSpendingEl) {
        currentSpendingEl.textContent = `${currencySymbol}${currentSpending.toFixed(2)} spent`;
    }
    
    if (budgetRemainingEl && budgetLimit > 0) {
        const remaining = Math.max(budgetLimit - currentSpending, 0);
        budgetRemainingEl.textContent = `${currencySymbol}${remaining.toFixed(2)} remaining`;
    } else if (budgetRemainingEl) {
        budgetRemainingEl.textContent = 'No budget set';
    }
    
    // Show/hide budget alert
    if (budgetAlert) {
        if (budgetLimit > 0 && percentage >= 80) {
            budgetAlert.style.display = 'flex';
            budgetAlert.innerHTML = `
                <i class="fas fa-exclamation-triangle"></i>
                <div class="budget-alert-message">
                    You're ${percentage >= 100 ? 'over' : 'approaching'} your budget limit! 
                    Consider reviewing your subscriptions.
                </div>
            `;
        } else {
            budgetAlert.style.display = 'none';
        }
    }
}

// Update spending projections
function updateProjections(monthlySpending, yearlySpending) {
    const monthlyProjectionEl = document.getElementById('monthlyProjection');
    const yearlyProjectionEl = document.getElementById('yearlyProjection');
    
    // Currency symbol for formatting
    const currencySymbol = getCurrencySymbol();
    
    if (monthlyProjectionEl) {
        monthlyProjectionEl.textContent = `${currencySymbol}${monthlySpending.toFixed(2)} / month`;
    }
    
    if (yearlyProjectionEl) {
        yearlyProjectionEl.textContent = `${currencySymbol}${yearlySpending.toFixed(2)} / year`;
    }
}

// Initialize Analytics Dashboard
function initializeAnalyticsDashboard() {
    const periodButtons = document.querySelectorAll('.time-period-btn');
    const analyticsTabs = document.querySelectorAll('.analytics-tab');
    
    // Set up period buttons
    periodButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Update active state
            periodButtons.forEach(b => b.classList.remove('active'));
            button.classList.add('active');
            
            // Update charts with new period
            SubscriptionDB.getAll().then(subscriptions => {
                updateAnalyticsDashboard(subscriptions, button.dataset.period);
            });
        });
    });
    
    // Set up analytics tabs
    analyticsTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Update active state
            analyticsTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // Show active tab content
            const tabContents = document.querySelectorAll('.analytics-tab-content');
            tabContents.forEach(content => {
                content.style.display = 'none';
            });
            
            const activeContent = document.getElementById(`${tab.dataset.tab}Tab`);
            if (activeContent) {
                activeContent.style.display = 'block';
            }
        });
    });
}

// Update Analytics Dashboard
function updateAnalyticsDashboard(subscriptions, period = '6m') {
    if (!subscriptions || subscriptions.length === 0) {
        // No data, show empty state
        return;
    }
    
    // Update trend chart
    updateTrendChart(subscriptions, period);
    
    // Update category analysis
    updateCategoryAnalysisChart(subscriptions, period);
    
    // Update comparison metrics
    updateComparisonMetrics(subscriptions);
}

// Update trend chart
function updateTrendChart(subscriptions, period = '6m') {
    const canvas = document.getElementById('trendChart');
    if (!canvas) return;
    
    // Generate data for the selected period
    const { labels, data } = generateTrendData(subscriptions, period);
    
    // Chart configuration
    const config = {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Monthly Spending',
                data: data,
                borderColor: '#8B5A2B',
                backgroundColor: 'rgba(139, 90, 43, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return getCurrencySymbol() + value;
                        }
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return getCurrencySymbol() + context.parsed.y.toFixed(2);
                        }
                    }
                }
            }
        }
    };
    
    // Create or update chart
    if (window.trendChart) {
        window.trendChart.data = config.data;
        window.trendChart.update();
    } else {
        window.trendChart = new Chart(canvas, config);
    }
}

// Generate trend data based on subscriptions
function generateTrendData(subscriptions, period) {
    const now = new Date();
    let months = 6; // Default to 6 months
    
    if (period === '1y') {
        months = 12;
    } else if (period === 'all') {
        // Find the earliest subscription date
        let earliest = now;
        subscriptions.forEach(sub => {
            const createdAt = new Date(sub.createdAt || sub.dueDate);
            if (createdAt < earliest) {
                earliest = createdAt;
            }
        });
        
        // Calculate months difference (minimum 6)
        const monthsDiff = (now.getFullYear() - earliest.getFullYear()) * 12 + 
                           now.getMonth() - earliest.getMonth();
        months = Math.max(6, monthsDiff);
    }
    
    // Generate labels (month names)
    const labels = [];
    const data = [];
    
    for (let i = months - 1; i >= 0; i--) {
        const d = new Date(now);
        d.setMonth(d.getMonth() - i);
        labels.push(d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }));
        
        // Calculate monthly spending for this month
        const monthlySpending = calculateMonthlySpendingForDate(subscriptions, d);
        data.push(monthlySpending);
    }
    
    return { labels, data };
}

// Calculate monthly spending for a specific month
function calculateMonthlySpendingForDate(subscriptions, date) {
    let total = 0;
    
    // Filter subscriptions that were active in this month
    const activeSubscriptions = subscriptions.filter(sub => {
        const createdAt = new Date(sub.createdAt || sub.dueDate);
        return createdAt <= date;
    });
    
    // Sum up monthly spending
    activeSubscriptions.forEach(subscription => {
        const amount = parseFloat(subscription.amount);
        const cycle = subscription.billingCycle;
        
        // Use the cached conversion factors
        const factor = BILLING_CYCLE_FACTORS[cycle] || 1;
        total += amount * factor;
    });
    
    return total;
}

// Update category analysis chart
function updateCategoryAnalysisChart(subscriptions, period = '6m') {
    const canvas = document.getElementById('categoryAnalysisChart');
    if (!canvas) return;
    
    // Get category spending data
    const categoryData = getCategorySpendingData(subscriptions);
    
    // Sort categories by spending
    const sortedCategories = Object.keys(categoryData).sort((a, b) => 
        categoryData[b] - categoryData[a]
    );
    
    // Prepare data for chart
    const labels = sortedCategories.map(category => capitalize(category));
    const data = sortedCategories.map(category => categoryData[category]);
    
    // Color palette for categories
    const categoryColors = {
        'streaming': '#e91e63',
        'fitness': '#4caf50',
        'productivity': '#ff9800',
        'music': '#9c27b0',
        'cloud': '#2196f3',
        'other': '#607d8b'
    };
    
    // Chart configuration
    const config = {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Monthly Spending by Category',
                data: data,
                backgroundColor: sortedCategories.map(category => 
                    categoryColors[category] || '#8B5A2B'
                ),
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return getCurrencySymbol() + value;
                        }
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const value = context.parsed.y;
                            const total = data.reduce((a, b) => a + b, 0);
                            const percentage = Math.round((value / total) * 100);
                            return `${getCurrencySymbol()}${value.toFixed(2)} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    };
    
    // Create or update chart
    if (window.categoryAnalysisChart) {
        window.categoryAnalysisChart.data = config.data;
        window.categoryAnalysisChart.update();
    } else {
        window.categoryAnalysisChart = new Chart(canvas, config);
    }
}

// Get category spending data
function getCategorySpendingData(subscriptions) {
    const categoryData = {};
    
    subscriptions.forEach(subscription => {
        const amount = parseFloat(subscription.amount);
        const cycle = subscription.billingCycle;
        const category = subscription.category;
        
        // Use the cached conversion factors
        const factor = BILLING_CYCLE_FACTORS[cycle] || 1;
        const monthlyAmount = amount * factor;
        
        // Add to category total
        if (!categoryData[category]) {
            categoryData[category] = 0;
        }
        categoryData[category] += monthlyAmount;
    });
    
    return categoryData;
}

// Update comparison metrics
function updateComparisonMetrics(subscriptions) {
    if (!subscriptions || subscriptions.length === 0) return;
    
    // Most expensive subscription
    const mostExpensive = subscriptions.reduce((prev, current) => {
        const prevMonthly = calculateMonthlyAmount(prev);
        const currentMonthly = calculateMonthlyAmount(current);
        return prevMonthly > currentMonthly ? prev : current;
    });
    
    // Update UI
    const mostExpensiveEl = document.getElementById('mostExpensive');
    if (mostExpensiveEl) {
        mostExpensiveEl.textContent = `${mostExpensive.name} (${getCurrencySymbol()}${calculateMonthlyAmount(mostExpensive).toFixed(2)}/mo)`;
    }
    
    // Biggest category
    const categoryData = getCategorySpendingData(subscriptions);
    const biggestCategory = Object.keys(categoryData).reduce((a, b) => 
        categoryData[a] > categoryData[b] ? a : b
    );
    
    // Update UI
    const biggestCategoryEl = document.getElementById('biggestCategory');
    if (biggestCategoryEl) {
        biggestCategoryEl.textContent = `${capitalize(biggestCategory)} (${getCurrencySymbol()}${categoryData[biggestCategory].toFixed(2)}/mo)`;
    }
    
    // Year-over-year change
    // For this demo, we'll just calculate a simulated YoY change
    const totalMonthly = Object.values(categoryData).reduce((a, b) => a + b, 0);
    // Simulate last year's spending as 90-110% of current
    const randomFactor = 0.9 + Math.random() * 0.2;
    const lastYearMonthly = totalMonthly * randomFactor;
    const yoyChange = ((totalMonthly - lastYearMonthly) / lastYearMonthly) * 100;
    
    // Update UI
    const yearChangeEl = document.getElementById('yearChange');
    const yearChangePercentEl = document.getElementById('yearChangePercent');
    
    if (yearChangeEl) {
        yearChangeEl.textContent = `${getCurrencySymbol()}${Math.abs(totalMonthly - lastYearMonthly).toFixed(2)}`;
    }
    
    if (yearChangePercentEl) {
        yearChangePercentEl.textContent = `${yoyChange > 0 ? '+' : ''}${yoyChange.toFixed(1)}%`;
        yearChangePercentEl.className = 'comparison-change';
        yearChangePercentEl.classList.add(yoyChange > 0 ? 'increase' : 'decrease');
    }
    
    // Least used (we don't have usage data, so this is a placeholder)
    // In a real app, you would track actual usage vs cost
    const leastUsedEl = document.getElementById('leastUsed');
    if (leastUsedEl && subscriptions.length > 1) {
        // For demo purposes, select a random subscription
        const randomIndex = Math.floor(Math.random() * subscriptions.length);
        leastUsedEl.textContent = subscriptions[randomIndex].name;
    } else if (leastUsedEl) {
        leastUsedEl.textContent = 'N/A';
    }
}

// Calculate monthly amount for a subscription
function calculateMonthlyAmount(subscription) {
    const amount = parseFloat(subscription.amount);
    const cycle = subscription.billingCycle;
    const factor = BILLING_CYCLE_FACTORS[cycle] || 1;
    return amount * factor;
}

// Helper function to capitalize a string
function capitalize(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
} 