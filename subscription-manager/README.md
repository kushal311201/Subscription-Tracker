# Subscription Manager

A simple web app to help you track and manage your recurring subscriptions. This app allows you to:

- Add, edit, and delete subscription details
- View all your subscriptions in one place
- Filter subscriptions by category or search by name
- See how many days are left until renewal
- Calculate your monthly spending on subscriptions
- Visualize your subscription costs by category

## Features

- **Add Subscription**: Enter subscription name, amount, billing cycle, due date, and category
- **View Subscriptions**: Card-based layout showing all your subscriptions
- **Monthly Burn Rate**: See total monthly spending at a glance
- **Visual Breakdown**: Pie chart showing spending by category
- **Days Left Counter**: Shows how many days until renewal (with warning when close to renewal)
- **Filter & Search**: Easily find subscriptions by category or name
- **Responsive Design**: Works on desktop and mobile devices
- **Offline Support**: Works without internet connection
- **Coffee Shop Theme**: Beautiful coffee-inspired design

## Getting Started

### Prerequisites

- Web browser (Chrome, Firefox, Safari, Edge)
- No account creation required

### Setup

1. **Open the App**:
   - Simply open `index.html` in your web browser
   - Or visit the deployed version online

2. **Start Using the App**:
   - Add your first subscription using the form
   - Your data is stored locally in your browser's IndexedDB storage
   - No data is sent to any external servers

3. **Install as PWA** (optional):
   - On Chrome/Edge: Look for the install icon in the address bar
   - On Safari iOS: Tap Share > Add to Home Screen
   - This allows the app to work offline and provides a more app-like experience

## Data Storage

This app uses IndexedDB, a powerful browser storage technology, to:

- Store all your subscription data locally on your device
- Provide complete privacy - your data never leaves your device
- Allow the app to work even when offline
- Persist data between browser sessions

If IndexedDB is not available, the app falls back to localStorage for basic functionality.

## Data Management

### Exporting Your Data

1. Open the Settings panel
2. Click "Export Data"
3. Save the JSON file to your device

### Importing Data

1. Open the Settings panel
2. Click "Import Data"
3. Select a previously exported JSON file
4. Confirm the import

### Resetting Data

1. Open the Settings panel
2. Click "Reset Data"
3. Confirm the reset

## Deploying the App (For Free)

You can deploy this app for free using Netlify or GitHub Pages:

### Deploy with Netlify:

1. Create a GitHub repository and push your code
2. Sign up at [netlify.com](https://netlify.com)
3. Click "New site from Git" and select your repository
4. Configure build settings (not required for this project)
5. Deploy!

### Convert to PWA (Progressive Web App)

The app is already configured as a PWA with:
- A manifest.json file
- Service worker for offline functionality
- Installable on mobile and desktop devices

## Customization

- **Change Colors**: Edit the CSS variables in `css/theme-enhancements.css`
- **Add Categories**: Edit the category options in `index.html` and `js/app.js`
- **Change Currency**: Change the currency setting in the app settings

## License

This project is open source and available under the MIT License.

## Acknowledgments

- [Chart.js](https://www.chartjs.org) for the pie chart
- [Font Awesome](https://fontawesome.com) for the icons
- [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) for local storage 