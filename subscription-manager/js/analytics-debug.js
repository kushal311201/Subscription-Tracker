/**
 * Analytics Debug Helper
 * Load this script in the console to diagnose analytics issues
 */

(function() {
    console.log('Analytics Debug Helper loaded');
    
    // Check for key dependencies
    const dependencies = [
        { name: 'Chart.js', check: () => typeof Chart !== 'undefined' },
        { name: 'SubscriptionDB', check: () => typeof SubscriptionDB !== 'undefined' },
        { name: 'initializeBudgetPlanner', check: () => typeof initializeBudgetPlanner === 'function' },
        { name: 'initializeAnalyticsDashboard', check: () => typeof initializeAnalyticsDashboard === 'function' },
        { name: 'updateAnalyticsDashboard', check: () => typeof updateAnalyticsDashboard === 'function' }
    ];
    
    console.log('Checking dependencies:');
    let allDependenciesLoaded = true;
    
    dependencies.forEach(dep => {
        const isAvailable = dep.check();
        console.log(`${dep.name}: ${isAvailable ? '✓ Available' : '✗ Missing'}`);
        if (!isAvailable) allDependenciesLoaded = false;
    });
    
    // Check if analytics elements exist in the DOM
    const analyticsElements = [
        { name: 'Analytics Dashboard', selector: '.analytics-dashboard' },
        { name: 'Trend Chart', selector: '#trendChart' },
        { name: 'Category Analysis Chart', selector: '#categoryAnalysisChart' },
        { name: 'Analytics Tabs', selector: '.analytics-tab' }
    ];
    
    console.log('\nChecking DOM elements:');
    analyticsElements.forEach(el => {
        const element = document.querySelector(el.selector);
        console.log(`${el.name}: ${element ? '✓ Found' : '✗ Missing'}`);
        if (element) {
            console.log(`   Visibility: ${window.getComputedStyle(element).display}`);
        }
    });
    
    // Check for script loading issues
    const scripts = Array.from(document.querySelectorAll('script')).map(script => {
        return {
            src: script.src,
            async: script.async,
            defer: script.defer,
            type: script.type
        };
    });
    
    console.log('\nLoaded Scripts:');
    scripts.filter(script => script.src).forEach(script => {
        console.log(`${script.src} (async: ${script.async}, defer: ${script.defer})`);
    });
    
    // Try to fix analytics if they're not working
    if (!allDependenciesLoaded) {
        console.log('\nAttempting to repair analytics...');
        
        // 1. Make sure Chart.js is loaded
        if (typeof Chart === 'undefined') {
            console.log('Loading Chart.js dynamically');
            const chartScript = document.createElement('script');
            chartScript.src = 'https://cdn.jsdelivr.net/npm/chart.js@3.7.0/dist/chart.min.js';
            document.head.appendChild(chartScript);
        }
        
        // 2. Check if analytics script is loaded
        if (typeof initializeAnalyticsDashboard !== 'function') {
            console.log('Reloading budget-analytics.js');
            const analyticsScript = document.createElement('script');
            analyticsScript.src = 'js/budget-analytics.js';
            document.head.appendChild(analyticsScript);
        }
        
        // 3. Wait and then try to initialize
        setTimeout(() => {
            console.log('Attempting to initialize analytics after waiting...');
            
            if (typeof initializeAnalyticsModule === 'function') {
                initializeAnalyticsModule();
            } else if (typeof initializeAnalyticsDashboard === 'function') {
                if (typeof initializeBudgetPlanner === 'function') {
                    initializeBudgetPlanner();
                }
                initializeAnalyticsDashboard();
                
                // Load data
                if (typeof SubscriptionDB !== 'undefined') {
                    SubscriptionDB.getAll().then(subscriptions => {
                        if (typeof updateAnalyticsDashboard === 'function') {
                            updateAnalyticsDashboard(subscriptions);
                        }
                    });
                }
            }
            
            // Ensure dashboard is visible
            const dashboard = document.querySelector('.analytics-dashboard');
            if (dashboard) {
                dashboard.style.display = 'block';
                console.log('Made analytics dashboard visible');
            }
            
        }, 1000);
    } else {
        console.log('\nAll dependencies are loaded. If analytics still aren\'t working, try:');
        console.log('1. Check the browser console for errors');
        console.log('2. Make sure you have subscriptions added to see analytics data');
        console.log('3. Try refreshing the page');
        
        // Make sure dashboard is visible anyway
        const dashboard = document.querySelector('.analytics-dashboard');
        if (dashboard) {
            dashboard.style.display = 'block';
            console.log('Made analytics dashboard visible');
        }
    }
    
    // Add a debug button to the page
    function addDebugButton() {
        const debugBtn = document.createElement('button');
        debugBtn.textContent = 'Fix Analytics';
        debugBtn.style.position = 'fixed';
        debugBtn.style.bottom = '10px';
        debugBtn.style.right = '10px';
        debugBtn.style.zIndex = '9999';
        debugBtn.style.padding = '10px';
        debugBtn.style.backgroundColor = '#4CAF50';
        debugBtn.style.color = 'white';
        debugBtn.style.border = 'none';
        debugBtn.style.borderRadius = '4px';
        debugBtn.style.cursor = 'pointer';
        
        debugBtn.addEventListener('click', () => {
            if (typeof loadBudgetAnalytics === 'function') {
                loadBudgetAnalytics();
                setTimeout(() => {
                    if (typeof SubscriptionDB !== 'undefined') {
                        SubscriptionDB.getAll().then(subscriptions => {
                            if (typeof updateAnalyticsDashboard === 'function') {
                                updateAnalyticsDashboard(subscriptions);
                            }
                        });
                    }
                }, 1000);
            }
            
            // Make dashboard visible
            const dashboard = document.querySelector('.analytics-dashboard');
            if (dashboard) {
                dashboard.style.display = 'block';
            }
        });
        
        document.body.appendChild(debugBtn);
    }
    
    // Only add debug button if requested
    if (window.location.search.includes('debug=true')) {
        addDebugButton();
    }
    
    // Return the public API
    return {
        fixAnalytics: function() {
            if (typeof loadBudgetAnalytics === 'function') {
                loadBudgetAnalytics();
            }
        },
        showDashboard: function() {
            const dashboard = document.querySelector('.analytics-dashboard');
            if (dashboard) {
                dashboard.style.display = 'block';
            }
        },
        reloadData: function() {
            if (typeof SubscriptionDB !== 'undefined' && typeof updateAnalyticsDashboard === 'function') {
                SubscriptionDB.getAll().then(subscriptions => {
                    updateAnalyticsDashboard(subscriptions);
                });
            }
        },
        addDebugButton: addDebugButton
    };
})(); 