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

## Getting Started

### Prerequisites

- Airtable account (free plan works fine)
- Web browser (Chrome, Firefox, Safari, Edge)

### Setup

1. **Create an Airtable Base**:
   - Sign up for Airtable at [airtable.com](https://airtable.com)
   - Create a new base called "Subscription Manager"
   - Create a table named "Subscriptions" with the following fields:
     - `name` (Single line text)
     - `amount` (Number)
     - `billingCycle` (Single select: monthly, yearly, quarterly)
     - `dueDate` (Date)
     - `category` (Single select: streaming, fitness, productivity, music, cloud, other)

2. **Get Your API Key and Base ID**:
   - Go to [airtable.com/account](https://airtable.com/account)
   - Under API section, generate an API key if you don't have one
   - Go to [airtable.com/api](https://airtable.com/api), select your base to find your Base ID

3. **Configure the App**:
   - Open the `js/app.js` file 
   - Replace `YOUR_API_KEY` with your actual Airtable API key
   - Replace `YOUR_BASE_ID` with your Airtable Base ID

4. **Start Using the App**:
   - Open `index.html` in your web browser
   - Start adding your subscriptions!

## Setting Up Email Reminders (Optional)

You can set up automated email reminders for upcoming renewals using Zapier:

1. **Create a Zapier Account**: Sign up at [zapier.com](https://zapier.com)

2. **Create a New Zap**:
   - Trigger: Choose "Airtable" → "Find Record"
   - Action: Choose "Gmail" → "Send Email"

3. **Configure the Trigger**:
   - Connect your Airtable account
   - Select your Subscription Manager base and Subscriptions table
   - Set up a filter where:
     - Formula: `DATETIME_DIFF(TODAY(), {dueDate}, 'days') <= 3`

4. **Configure the Action**:
   - Connect your Gmail account
   - Set up email template with subscription details
   - Example subject: "Reminder: {{name}} subscription renews in {{days_left}} days"

5. **Test and Enable the Zap**

## Deploying the App (For Free)

You can deploy this app for free using Netlify or GitHub Pages:

### Deploy with Netlify:

1. Create a GitHub repository and push your code
2. Sign up at [netlify.com](https://netlify.com)
3. Click "New site from Git" and select your repository
4. Configure build settings (not required for this project)
5. Deploy!

### Convert to PWA (Progressive Web App)

To make the app installable on mobile devices:

1. Create a `manifest.json` file in the root directory
2. Add service worker support 
3. Deploy again

## Customization

- **Change Colors**: Edit the CSS variables in `css/style.css`
- **Add Categories**: Edit the category options in `index.html` and `js/app.js`
- **Change Currency**: Replace ₹ with your preferred currency symbol in the code

## License

This project is open source and available under the MIT License.

## Acknowledgments

- [Airtable](https://airtable.com) for the backend database
- [Chart.js](https://www.chartjs.org) for the pie chart
- [Font Awesome](https://fontawesome.com) for the icons 