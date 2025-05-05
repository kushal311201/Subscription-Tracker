/**
 * Translations for Subscription Manager
 * Supports multiple languages
 */

// Default language
let currentLanguage = 'en';

// Translations object
const translations = {
  en: {
    appTitle: 'Subscription Manager',
    setupTitle: 'Airtable Setup Required',
    setupDesc: 'Before using this app, you need to set up your Airtable database for storing subscriptions.',
    setupGuide: 'Setup Guide',
    monthlyBurn: 'Monthly Burn Rate',
    pullToRefresh: 'Pull down to refresh',
    addNewSub: 'Add New Subscription',
    subName: 'Subscription Name',
    amount: 'Amount',
    billingCycle: 'Billing Cycle',
    monthly: 'Monthly',
    yearly: 'Yearly',
    quarterly: 'Quarterly',
    weekly: 'Weekly',
    biweekly: 'Bi-weekly',
    nextDueDate: 'Next Due Date',
    category: 'Category',
    streaming: 'Streaming',
    fitness: 'Fitness',
    productivity: 'Productivity',
    music: 'Music',
    cloud: 'Cloud Storage',
    utilities: 'Utilities',
    food: 'Food & Dining',
    housing: 'Housing',
    education: 'Education',
    other: 'Other',
    enableReminder: 'Enable Reminder',
    reminderDays: 'Remind me',
    onDueDate: 'On due date',
    oneDayBefore: '1 day before',
    threeDaysBefore: '3 days before',
    oneWeekBefore: '1 week before',
    twoWeeksBefore: '2 weeks before',
    addSubscription: 'Add Subscription',
    yourSubscriptions: 'Your Subscriptions',
    allCategories: 'All Categories',
    search: 'Search...',
    noSubscriptions: 'No subscriptions added yet. Add your first subscription using the form.',
    adSpace: 'Advertisement Space',
    home: 'Home',
    add: 'Add',
    help: 'Help',
    settings: 'Settings',
    notificationChannels: 'Notification Channels',
    duePayments: 'Due Payments',
    weeklyDigest: 'Weekly Digest',
    priceChanges: 'Price Changes',
    enableNotifications: 'Enable Notifications',
    useBiometrics: 'Use Biometric Authentication',
    darkMode: 'Dark Mode',
    followSystemTheme: 'Follow System Theme',
    currency: 'Currency',
    language: 'Language',
    exportData: 'Export Data',
    importData: 'Import Data',
    resetData: 'Reset Data',
    databaseSetup: 'Database Setup',
    editSubscription: 'Edit Subscription',
    cancel: 'Cancel',
    saveChanges: 'Save Changes',
    daysUntilDue: '{days} days until due',
    dueTomorrow: 'Due tomorrow!',
    dueToday: 'Due today!',
    subAdded: 'Subscription added successfully',
    subUpdated: 'Subscription updated successfully',
    subDeleted: 'Subscription deleted',
    confirmDelete: 'Are you sure you want to delete this subscription?',
    errorLoadingSubs: 'Error loading subscriptions. Please try again.',
    errorSavingSub: 'Error saving subscription. Please try again.',
    errorDeletingSub: 'Error deleting subscription. Please try again.',
    notificationsEnabled: 'Notifications enabled',
    notificationsDisabled: 'Notifications disabled',
    notificationsDenied: 'Notification permission denied',
    offlineMessage: 'You are offline. Changes will be saved locally and synced when you reconnect.',
    backOnline: 'Back online! Syncing your data...',
    syncCompleted: 'Sync completed',
    syncFailed: 'Sync failed',
    biometricSuccess: 'Biometric authentication successful',
    biometricFailed: 'Biometric authentication failed',
    dataExported: 'Data exported successfully',
    dataImported: 'Data imported successfully',
    dataReset: 'All data has been reset',
    confirmReset: 'Are you sure? This will delete all your subscriptions.',
    sharedSuccessfully: 'Shared successfully',
    sharingNotSupported: 'Sharing not supported on this device',
    offlineStorageFailed: 'Failed to initialize offline storage. Some features may not work correctly.'
  },
  
  hi: {
    appTitle: 'सदस्यता प्रबंधक',
    setupTitle: 'Airtable सेटअप आवश्यक है',
    setupDesc: 'इस ऐप का उपयोग करने से पहले, आपको सदस्यताओं को संग्रहीत करने के लिए अपने Airtable डेटाबेस को सेटअप करने की आवश्यकता है।',
    setupGuide: 'सेटअप गाइड',
    monthlyBurn: 'मासिक खर्च दर',
    pullToRefresh: 'रीफ्रेश करने के लिए नीचे खींचें',
    addNewSub: 'नई सदस्यता जोड़ें',
    subName: 'सदस्यता का नाम',
    amount: 'राशि',
    billingCycle: 'बिलिंग चक्र',
    monthly: 'मासिक',
    yearly: 'वार्षिक',
    quarterly: 'त्रैमासिक',
    weekly: 'साप्ताहिक',
    biweekly: 'द्वि-साप्ताहिक',
    nextDueDate: 'अगली देय तिथि',
    category: 'श्रेणी',
    streaming: 'स्ट्रीमिंग',
    fitness: 'फिटनेस',
    productivity: 'उत्पादकता',
    music: 'संगीत',
    cloud: 'क्लाउड स्टोरेज',
    utilities: 'उपयोगिताएँ',
    food: 'खाना और डाइनिंग',
    housing: 'आवास',
    education: 'शिक्षा',
    other: 'अन्य',
    enableReminder: 'रिमाइंडर सक्षम करें',
    reminderDays: 'मुझे याद दिलाएं',
    onDueDate: 'देय तिथि पर',
    oneDayBefore: '1 दिन पहले',
    threeDaysBefore: '3 दिन पहले',
    oneWeekBefore: '1 सप्ताह पहले',
    twoWeeksBefore: '2 सप्ताह पहले',
    addSubscription: 'सदस्यता जोड़ें',
    yourSubscriptions: 'आपकी सदस्यताएँ',
    allCategories: 'सभी श्रेणियाँ',
    search: 'खोजें...',
    noSubscriptions: 'अभी तक कोई सदस्यता नहीं जोड़ी गई है। फॉर्म का उपयोग करके अपनी पहली सदस्यता जोड़ें।',
    adSpace: 'विज्ञापन स्थान',
    home: 'होम',
    add: 'जोड़ें',
    help: 'मदद',
    settings: 'सेटिंग्स',
    notificationChannels: 'सूचना चैनल',
    duePayments: 'देय भुगतान',
    weeklyDigest: 'साप्ताहिक सारांश',
    priceChanges: 'मूल्य परिवर्तन',
    enableNotifications: 'सूचनाएं सक्षम करें',
    useBiometrics: 'बायोमेट्रिक प्रमाणीकरण का उपयोग करें',
    darkMode: 'डार्क मोड',
    followSystemTheme: 'सिस्टम थीम का पालन करें',
    currency: 'मुद्रा',
    language: 'भाषा',
    exportData: 'डेटा निर्यात करें',
    importData: 'डेटा आयात करें',
    resetData: 'डेटा रीसेट करें',
    databaseSetup: 'डेटाबेस सेटअप',
    editSubscription: 'सदस्यता संपादित करें',
    cancel: 'रद्द करें',
    saveChanges: 'परिवर्तन सहेजें',
    daysUntilDue: 'देय होने तक {days} दिन',
    dueTomorrow: 'कल देय है!',
    dueToday: 'आज देय है!',
    subAdded: 'सदस्यता सफलतापूर्वक जोड़ी गई',
    subUpdated: 'सदस्यता सफलतापूर्वक अपडेट की गई',
    subDeleted: 'सदस्यता हटा दी गई',
    confirmDelete: 'क्या आप सुनिश्चित हैं कि आप इस सदस्यता को हटाना चाहते हैं?',
    errorLoadingSubs: 'सदस्यताओं को लोड करने में त्रुटि। कृपया पुनः प्रयास करें।',
    errorSavingSub: 'सदस्यता सहेजने में त्रुटि। कृपया पुनः प्रयास करें।',
    errorDeletingSub: 'सदस्यता हटाने में त्रुटि। कृपया पुनः प्रयास करें।',
    notificationsEnabled: 'सूचनाएँ सक्षम की गईं',
    notificationsDisabled: 'सूचनाएँ अक्षम की गईं',
    notificationsDenied: 'सूचना अनुमति अस्वीकृत',
    offlineMessage: 'आप ऑफ़लाइन हैं। परिवर्तन स्थानीय रूप से सहेजे जाएंगे और आपके फिर से कनेक्ट होने पर सिंक किए जाएंगे।',
    backOnline: 'आप वापस ऑनलाइन हैं! आपका डेटा सिंक हो रहा है...',
    syncCompleted: 'सिंक पूरा हुआ',
    syncFailed: 'सिंक विफल',
    biometricSuccess: 'बायोमेट्रिक प्रमाणीकरण सफल',
    biometricFailed: 'बायोमेट्रिक प्रमाणीकरण विफल',
    dataExported: 'डेटा सफलतापूर्वक निर्यात किया गया',
    dataImported: 'डेटा सफलतापूर्वक आयात किया गया',
    dataReset: 'सभी डेटा रीसेट कर दिया गया है',
    confirmReset: 'क्या आप सुनिश्चित हैं? इससे आपकी सभी सदस्यताएँ हट जाएंगी।',
    sharedSuccessfully: 'सफलतापूर्वक साझा किया गया',
    sharingNotSupported: 'इस डिवाइस पर शेयरिंग समर्थित नहीं है',
    offlineStorageFailed: 'ऑफलाइन स्टोरेज को इनिशियलाइज़ करने में विफल। कुछ सुविधाएँ सही ढंग से काम नहीं कर सकती हैं।'
  },
  
  es: {
    appTitle: 'Gestor de Suscripciones',
    setupTitle: 'Configuración de Airtable Requerida',
    setupDesc: 'Antes de usar esta aplicación, necesitas configurar tu base de datos Airtable para almacenar suscripciones.',
    setupGuide: 'Guía de Configuración',
    monthlyBurn: 'Gasto Mensual',
    pullToRefresh: 'Desliza hacia abajo para actualizar',
    addNewSub: 'Añadir Nueva Suscripción',
    subName: 'Nombre de Suscripción',
    amount: 'Importe',
    billingCycle: 'Ciclo de Facturación',
    monthly: 'Mensual',
    yearly: 'Anual',
    quarterly: 'Trimestral',
    weekly: 'Semanal',
    biweekly: 'Quincenal',
    nextDueDate: 'Próxima Fecha de Pago',
    category: 'Categoría',
    streaming: 'Streaming',
    fitness: 'Fitness',
    productivity: 'Productividad',
    music: 'Música',
    cloud: 'Almacenamiento en la Nube',
    utilities: 'Servicios Públicos',
    food: 'Alimentación y Restaurantes',
    housing: 'Vivienda',
    education: 'Educación',
    other: 'Otros',
    enableReminder: 'Activar Recordatorio',
    reminderDays: 'Recordarme',
    onDueDate: 'En la fecha de vencimiento',
    oneDayBefore: '1 día antes',
    threeDaysBefore: '3 días antes',
    oneWeekBefore: '1 semana antes',
    twoWeeksBefore: '2 semanas antes',
    addSubscription: 'Añadir Suscripción',
    yourSubscriptions: 'Tus Suscripciones',
    allCategories: 'Todas las Categorías',
    search: 'Buscar...',
    noSubscriptions: 'Aún no has añadido suscripciones. Añade tu primera suscripción usando el formulario.',
    adSpace: 'Espacio para Anuncios',
    home: 'Inicio',
    add: 'Añadir',
    help: 'Ayuda',
    settings: 'Ajustes',
    notificationChannels: 'Canales de Notificación',
    duePayments: 'Pagos Pendientes',
    weeklyDigest: 'Resumen Semanal',
    priceChanges: 'Cambios de Precio',
    enableNotifications: 'Activar Notificaciones',
    useBiometrics: 'Usar Autenticación Biométrica',
    darkMode: 'Modo Oscuro',
    followSystemTheme: 'Seguir Tema del Sistema',
    currency: 'Moneda',
    language: 'Idioma',
    exportData: 'Exportar Datos',
    importData: 'Importar Datos',
    resetData: 'Restablecer Datos',
    databaseSetup: 'Configuración de Base de Datos',
    editSubscription: 'Editar Suscripción',
    cancel: 'Cancelar',
    saveChanges: 'Guardar Cambios',
    daysUntilDue: '{days} días hasta el vencimiento',
    dueTomorrow: '¡Vence mañana!',
    dueToday: '¡Vence hoy!',
    subAdded: 'Suscripción añadida con éxito',
    subUpdated: 'Suscripción actualizada con éxito',
    subDeleted: 'Suscripción eliminada',
    confirmDelete: '¿Estás seguro de que quieres eliminar esta suscripción?',
    errorLoadingSubs: 'Error al cargar las suscripciones. Por favor, inténtalo de nuevo.',
    errorSavingSub: 'Error al guardar la suscripción. Por favor, inténtalo de nuevo.',
    errorDeletingSub: 'Error al eliminar la suscripción. Por favor, inténtalo de nuevo.',
    notificationsEnabled: 'Notificaciones habilitadas',
    notificationsDisabled: 'Notificaciones deshabilitadas',
    notificationsDenied: 'Permiso de notificación denegado',
    offlineMessage: 'Estás sin conexión. Los cambios se guardarán localmente y se sincronizarán cuando vuelvas a conectarte.',
    backOnline: '¡Estás de nuevo en línea! Sincronizando tus datos...',
    syncCompleted: 'Sincronización completada',
    syncFailed: 'Sincronización fallida',
    biometricSuccess: 'Autenticación biométrica exitosa',
    biometricFailed: 'Autenticación biométrica fallida',
    dataExported: 'Datos exportados con éxito',
    dataImported: 'Datos importados con éxito',
    dataReset: 'Todos los datos han sido restablecidos',
    confirmReset: '¿Estás seguro? Esto eliminará todas tus suscripciones.',
    sharedSuccessfully: 'Compartido con éxito',
    sharingNotSupported: 'Compartir no es compatible con este dispositivo',
    offlineStorageFailed: 'Error al inicializar el almacenamiento sin conexión. Algunas funciones pueden no funcionar correctamente.'
  }
  // Add more languages as needed
};

// Currency symbols for different currencies
const currencySymbols = {
  INR: '₹',
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  CAD: '$',
  AUD: '$',
  CNY: '¥',
  SGD: '$',
  RUB: '₽'
};

// Format functions for different languages
const formatters = {
  // Formats days until due based on language
  daysUntilDue: (days, lang) => {
    const text = translations[lang].daysUntilDue;
    return text.replace('{days}', days);
  }
};

/**
 * Initialize translations
 * Sets up initial language based on browser or saved preference
 */
function initTranslations() {
  // Check if user has a saved language preference
  const savedLang = localStorage.getItem('language');
  
  if (savedLang && translations[savedLang]) {
    currentLanguage = savedLang;
  } else {
    // Try to detect browser language
    const browserLang = navigator.language.split('-')[0];
    if (translations[browserLang]) {
      currentLanguage = browserLang;
    }
  }
  
  // Set the language dropdown to match
  const langSelector = document.getElementById('language');
  if (langSelector) {
    langSelector.value = currentLanguage;
    
    // Add event listener to language selector
    langSelector.addEventListener('change', () => {
      setLanguage(langSelector.value);
    });
  }
  
  // Apply translations
  applyTranslations();
}

/**
 * Set the current language and apply translations
 * @param {string} lang - Language code
 */
function setLanguage(lang) {
  if (translations[lang]) {
    currentLanguage = lang;
    localStorage.setItem('language', lang);
    applyTranslations();
  }
}

/**
 * Apply translations to all elements with data-i18n attribute
 */
function applyTranslations() {
  const elements = document.querySelectorAll('[data-i18n]');
  const currentTranslations = translations[currentLanguage];
  
  elements.forEach(element => {
    const key = element.getAttribute('data-i18n');
    if (currentTranslations[key]) {
      element.textContent = currentTranslations[key];
    }
  });
  
  // Handle placeholders
  const inputElements = document.querySelectorAll('[data-i18n-placeholder]');
  inputElements.forEach(element => {
    const key = element.getAttribute('data-i18n-placeholder');
    if (currentTranslations[key]) {
      element.setAttribute('placeholder', currentTranslations[key]);
    }
  });
}

/**
 * Get translation for a specific key
 * @param {string} key - Translation key
 * @param {object} params - Optional parameters for string replacement
 * @returns {string} Translated text
 */
function t(key, params = {}) {
  const translation = translations[currentLanguage]?.[key] || translations.en[key] || key;
  
  // Replace parameters in string if any
  if (Object.keys(params).length) {
    return Object.keys(params).reduce((str, param) => {
      return str.replace(`{${param}}`, params[param]);
    }, translation);
  }
  
  return translation;
}

/**
 * Get currency symbol for the current currency
 * @returns {string} Currency symbol
 */
function getCurrencySymbol() {
  const currency = localStorage.getItem('currency') || 'INR';
  return currencySymbols[currency] || '₹';
}

/**
 * Format a number for currency display
 * @param {number} amount - The amount to format
 * @returns {string} Formatted amount
 */
function formatCurrency(amount) {
  const currency = localStorage.getItem('currency') || 'INR';
  
  try {
    return new Intl.NumberFormat(currentLanguage, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  } catch (error) {
    // Fallback formatting
    return `${getCurrencySymbol()}${parseFloat(amount).toFixed(2)}`;
  }
}

// Export the functions for use in other modules
window.i18n = {
  init: initTranslations,
  setLanguage,
  t,
  getCurrencySymbol,
  formatCurrency
}; 