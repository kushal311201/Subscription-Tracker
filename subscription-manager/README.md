# Subscription Tracker

A performance-optimized web application for tracking and managing subscriptions with advanced budgeting features.

## Features

- **Subscription Management:** Track all your subscriptions in one place
- **Budget Planning:** Set monthly and yearly budgets and see spending trends
- **Analytics Dashboard:** Visualize spending by category and time period
- **Mobile Optimized:** Fully responsive design for all device sizes
- **Offline Support:** Works even when you're not connected to the internet
- **PWA Support:** Install as a standalone app on mobile and desktop
- **Dark Mode:** Support for system and manual dark mode preferences

## Performance Optimizations

The application is highly optimized for performance:

### Network Optimizations
- Advanced caching strategies in the service worker
- Resource prioritization for critical assets
- Deferred loading of non-critical resources
- Optimized font loading with fallbacks

### JavaScript Performance
- DOM element caching to reduce expensive queries
- Task scheduling with priority queues
- Efficient state management to reduce UI updates
- Debounced and throttled event handlers
- Batch processing for large operations

### UI/UX Optimizations
- Fast initial paint with critical CSS inlining
- Smooth animations using hardware acceleration
- Touch-optimized for mobile devices
- Enhanced offline experience

## Getting Started

1. Clone this repository
2. Open `index.html` in your browser, or serve with a local server
3. For the best experience, use a modern browser like Chrome, Edge, or Safari

## Development

The app is built with vanilla JavaScript and doesn't require any build process. However, to enable all features:

1. Serve the app over HTTPS for service worker and other secure API support
2. For local development, use tools like `http-server` with the `-S` flag for SSL

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Chrome for Android (latest)
- Safari for iOS (latest)

## Performance Metrics

- First Contentful Paint: < 1s
- Time to Interactive: < 2s
- Lighthouse Performance Score: 95+

## License

MIT 