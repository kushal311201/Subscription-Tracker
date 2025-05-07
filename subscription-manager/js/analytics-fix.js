// Chart initialization fix
function initializeChart() {
    if (typeof Chart === 'undefined') {
        console.warn('Chart.js not available');
        return;
    }

    try {
        const ctx = document.getElementById('categoryChart');
        if (!ctx) {
            console.warn('Chart canvas element not found');
            return;
        }

        const subscriptions = window.appState?.subscriptions || [];
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
    } catch (error) {
        console.warn('Failed to initialize chart:', error);
    }
}

// Helper function to capitalize first letter
function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Wait for app.js to load
    setTimeout(initializeChart, 1000);
}); 