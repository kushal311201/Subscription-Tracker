# Subscription Manager

A clean, responsive web application to track and manage your subscriptions using HTML, CSS, and JavaScript with Google Sheets integration.

## Features

- **Track Subscriptions**: Keep all your subscriptions in one place
- **Monthly Summary**: See your total monthly spending at a glance
- **Days Left Indicator**: Visual indicators for upcoming due dates
- **Search & Filter**: Easily find subscriptions by name or category
- **Google Sheets Integration**: Store your data in Google Sheets
- **Email Reminders**: Get notified when payments are due

## Setup Instructions

### 1. Google Cloud Project Setup

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable the Google Sheets API and Google Apps Script API
4. Create OAuth credentials (Web Application type)
5. Add your domain to the authorized JavaScript origins

### 2. Configure the App

1. Open `scripts.js` and update the following constants:
   ```javascript
   const SHEET_ID = 'YOUR_GOOGLE_SHEET_ID'; // Will be created in the next step
   const API_KEY = 'YOUR_API_KEY'; // From Google Cloud Console
   const CLIENT_ID = 'YOUR_CLIENT_ID.apps.googleusercontent.com'; // From OAuth credentials
   ```

### 3. Create Your Google Sheet

You have two options to create the required Google Sheet:

**Option 1: Automatic Setup**
1. Open the app in your browser
2. Go to "Setup Reminders" page
3. Click the "Create Sheet Automatically" button
4. Sign in with your Google account when prompted
5. The sheet will be created and the ID will be displayed

**Option 2: Manual Setup**
1. Create a new Google Sheet
2. Add the following column headers in row 1:
   - Subscription Name
   - Amount
   - Billing Cycle
   - Next Due Date
   - Category
   - Email
   - Notes

### 4. Set Up Email Reminders

1. Open your Google Sheet
2. Go to Extensions > Apps Script
3. Copy the code from the "Setup Reminders" page
4. Save and authorize the script
5. Set up a trigger to run daily

## How It Works

- All subscription data is stored in your Google Sheet
- The web app reads and writes to the sheet via the Google Sheets API
- The reminder script runs on a schedule to check due dates and send emails
- Monthly totals and days remaining are calculated on the client side

## Development

This is a front-end only application with no backend server required. All data is stored in Google Sheets.

```
ui-prototype/
├── index.html         # Home page with subscription list
├── add.html           # Add/edit subscription form
├── sheets-integration.html # Google Sheets setup guide
├── styles.css         # All styles for the application
├── scripts.js         # Main application logic
└── sheets-setup.js    # Helper for Google Sheet creation
```

## Privacy

- All data is stored in your own Google Sheet
- The app only requests the permissions it needs to function
- No data is sent to any third-party servers

## License

MIT 