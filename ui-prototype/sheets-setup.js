/**
 * Google Sheets Setup Helper
 * 
 * This script helps set up a new Google Sheet for the Subscription Manager app.
 * It creates the necessary structure and default columns.
 */

// Function to create a new Google Sheet for subscriptions
function createSubscriptionSheet() {
    // Check if gapi client library is loaded
    if (!gapi || !gapi.client) {
        console.error('Google API client library not loaded');
        return;
    }
    
    // Create a new spreadsheet
    gapi.client.sheets.spreadsheets.create({
        properties: {
            title: 'Subscription Manager Data'
        },
        sheets: [
            {
                properties: {
                    title: 'Subscriptions',
                    gridProperties: {
                        rowCount: 1000,
                        columnCount: 7
                    }
                }
            }
        ]
    }).then(response => {
        const spreadsheetId = response.result.spreadsheetId;
        console.log(`Created new spreadsheet with ID: ${spreadsheetId}`);
        
        // Store the spreadsheet ID in local storage
        localStorage.setItem('subscriptionSheetId', spreadsheetId);
        
        // Update the sheet ID in scripts.js
        if (window.SHEET_ID) {
            window.SHEET_ID = spreadsheetId;
        }
        
        // Add header row
        addHeaderRow(spreadsheetId);
        
        // Show success message
        showSetupSuccess(spreadsheetId);
        
    }).catch(error => {
        console.error('Error creating spreadsheet:', error);
        showSetupError(error);
    });
}

// Add header row to the spreadsheet
function addHeaderRow(spreadsheetId) {
    gapi.client.sheets.spreadsheets.values.update({
        spreadsheetId: spreadsheetId,
        range: 'Subscriptions!A1:G1',
        valueInputOption: 'RAW',
        resource: {
            values: [[
                'Subscription Name',
                'Amount',
                'Billing Cycle',
                'Next Due Date',
                'Category',
                'Email',
                'Notes'
            ]]
        }
    }).then(response => {
        console.log('Added header row');
        
        // Format header row to be bold
        formatHeaderRow(spreadsheetId);
        
    }).catch(error => {
        console.error('Error adding header row:', error);
    });
}

// Format header row (make bold and freeze)
function formatHeaderRow(spreadsheetId) {
    gapi.client.sheets.spreadsheets.batchUpdate({
        spreadsheetId: spreadsheetId,
        resource: {
            requests: [
                {
                    // Make text bold
                    repeatCell: {
                        range: {
                            sheetId: 0,
                            startRowIndex: 0,
                            endRowIndex: 1,
                            startColumnIndex: 0,
                            endColumnIndex: 7
                        },
                        cell: {
                            userEnteredFormat: {
                                textFormat: {
                                    bold: true
                                }
                            }
                        },
                        fields: 'userEnteredFormat.textFormat.bold'
                    }
                },
                {
                    // Freeze header row
                    updateSheetProperties: {
                        properties: {
                            sheetId: 0,
                            gridProperties: {
                                frozenRowCount: 1
                            }
                        },
                        fields: 'gridProperties.frozenRowCount'
                    }
                }
            ]
        }
    }).then(response => {
        console.log('Formatted header row');
    }).catch(error => {
        console.error('Error formatting header row:', error);
    });
}

// Show success message on the page
function showSetupSuccess(spreadsheetId) {
    const setupResult = document.getElementById('setup-result');
    if (setupResult) {
        setupResult.innerHTML = `
            <div class="success-message">
                <h3>Setup Complete!</h3>
                <p>Your Google Sheet has been created successfully.</p>
                <p>Sheet ID: <code>${spreadsheetId}</code></p>
                <p>Copy this ID to use in your configuration.</p>
                <a href="https://docs.google.com/spreadsheets/d/${spreadsheetId}" 
                   target="_blank" 
                   class="button primary-button">
                    Open Your Sheet
                </a>
            </div>
        `;
    }
}

// Show error message on the page
function showSetupError(error) {
    const setupResult = document.getElementById('setup-result');
    if (setupResult) {
        setupResult.innerHTML = `
            <div class="error-message">
                <h3>Setup Failed</h3>
                <p>There was an error creating your Google Sheet.</p>
                <p>Error: ${error.message || JSON.stringify(error)}</p>
                <button onclick="createSubscriptionSheet()" class="button primary-button">
                    Try Again
                </button>
            </div>
        `;
    }
}

// Initialize Google API client for sheet setup
function initSetupClient() {
    gapi.client.init({
        apiKey: API_KEY,
        discoveryDocs: ["https://sheets.googleapis.com/$discovery/rest?version=v4"],
        clientId: 'YOUR_CLIENT_ID.apps.googleusercontent.com',
        scope: "https://www.googleapis.com/auth/spreadsheets"
    }).then(() => {
        // Set up the create button
        const createButton = document.getElementById('create-sheet-button');
        if (createButton) {
            createButton.disabled = false;
            createButton.addEventListener('click', () => {
                // Check if user is signed in
                if (!gapi.auth2.getAuthInstance().isSignedIn.get()) {
                    gapi.auth2.getAuthInstance().signIn().then(() => {
                        createSubscriptionSheet();
                    });
                } else {
                    createSubscriptionSheet();
                }
            });
        }
    });
}

// Load the Google API client library for sheet setup
function loadSetupClient() {
    gapi.load('client:auth2', initSetupClient);
}

// Check if we're on the setup page
document.addEventListener('DOMContentLoaded', () => {
    const createButton = document.getElementById('create-sheet-button');
    if (createButton) {
        // Load the Google API client library
        const script = document.createElement('script');
        script.src = 'https://apis.google.com/js/api.js';
        script.onload = loadSetupClient;
        document.body.appendChild(script);
    }
}); 