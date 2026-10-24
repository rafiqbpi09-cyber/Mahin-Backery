/* ========================================
   LocalStorage Manager
   সব ডেটা LocalStorage-এ সংরক্ষণ
   ======================================== */

const STORAGE_KEYS = {
    PRODUCTS: 'bms_products',
    CATEGORIES: 'bms_categories',
    CUSTOMERS: 'bms_customers',
    SUPPLIERS: 'bms_suppliers',
    SALES: 'bms_sales',
    PURCHASES: 'bms_purchases',
    EXPENSES: 'bms_expenses',
    ORDERS: 'bms_orders',
    RAW_MATERIALS: 'bms_raw_materials',
    PRODUCTIONS: 'bms_productions',
    STOCK_MOVEMENTS: 'bms_stock_movements',
    SETTINGS: 'bms_settings',
    LANGUAGE: 'bms_language',
    THEME: 'bms_theme'
};

/**
 * Get data from LocalStorage
 */
function getData(key) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    } catch (e) {
        console.error('Error reading from storage:', key, e);
        return null;
    }
}

/**
 * Save data to LocalStorage
 */
function saveData(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
        return true;
    } catch (e) {
        console.error('Error saving to storage:', key, e);
        return false;
    }
}

/**
 * Remove data
 */
function removeData(key) {
    localStorage.removeItem(key);
}

/**
 * Get or initialize array data
 */
function getArray(key) {
    const data = getData(key);
    return Array.isArray(data) ? data : [];
}

/**
 * Generate unique ID
 */
function generateId(prefix = '') {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 6);
    return prefix ? `${prefix}_${timestamp}${random}` : `${timestamp}${random}`;
}

/**
 * Format currency (BDT)
 */
function formatCurrency(amount) {
    const num = Number(amount) || 0;
    return '৳ ' + num.toLocaleString('en-BD', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

/**
 * Format date
 */
function formatDate(dateStr, lang = 'bn') {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    if (isNaN(date)) return '—';

    if (lang === 'bn') {
        return date.toLocaleDateString('bn-BD', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }
    return date.toLocaleDateString('en-GB', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

/**
 * Get today's date string (YYYY-MM-DD)
 */
function getToday() {
    const now = new Date();
    return now.toISOString().split('T')[0];
}

/**
 * Check if date is today
 */
function isToday(dateStr) {
    if (!dateStr) return false;
    return dateStr.startsWith(getToday());
}

/**
 * Initialize default settings
 */
function initSettings() {
    let settings = getData(STORAGE_KEYS.SETTINGS);
    if (!settings) {
        settings = {
            bakeryName: 'My Bakery',
            address: 'Dhaka, Bangladesh',
            phone: '+880 1XXX-XXXXXX',
            email: 'info@mybakery.com',
            currency: 'BDT',
            currencySymbol: '৳',
            invoiceFooter: 'Thank you for your purchase!',
            logo: null
        };
        saveData(STORAGE_KEYS.SETTINGS, settings);
    }
    return settings;
}

/**
 * Initialize default categories
 */
function initCategories() {
    let categories = getArray(STORAGE_KEYS.CATEGORIES);
    if (categories.length === 0) {
        categories = [
            { id: 'cat_bread', name: 'Bread', nameBn: 'রুটি', status: 'active' },
            { id: 'cat_cake', name: 'Cake', nameBn: 'কেক', status: 'active' },
            { id: 'cat_biscuit', name: 'Biscuit', nameBn: 'বিস্কুট', status: 'active' },
            { id: 'cat_bun', name: 'Bun', nameBn: 'বান', status: 'active' },
            { id: 'cat_pastry', name: 'Pastry', nameBn: 'পেস্ট্রি', status: 'active' },
            { id: 'cat_cookies', name: 'Cookies', nameBn: 'কুকিজ', status: 'active' },
            { id: 'cat_donut', name: 'Donut', nameBn: 'ডোনাট', status: 'active' },
            { id: 'cat_pizza', name: 'Pizza', nameBn: 'পিজ্জা', status: 'active' },
            { id: 'cat_snacks', name: 'Snacks', nameBn: 'স্ন্যাকস', status: 'active' },
            { id: 'cat_drinks', name: 'Drinks', nameBn: 'পানীয়', status: 'active' },
            { id: 'cat_other', name: 'Other', nameBn: 'অন্যান্য', status: 'active' }
        ];
        saveData(STORAGE_KEYS.CATEGORIES, categories);
    }
    return categories;
}

/**
 * Initialize storage on first load
 */
function initStorage() {
    initSettings();
    initCategories();

    // Ensure all arrays exist
    const arrayKeys = [
        STORAGE_KEYS.PRODUCTS,
        STORAGE_KEYS.CUSTOMERS,
        STORAGE_KEYS.SUPPLIERS,
        STORAGE_KEYS.SALES,
        STORAGE_KEYS.PURCHASES,
        STORAGE_KEYS.EXPENSES,
        STORAGE_KEYS.ORDERS,
        STORAGE_KEYS.RAW_MATERIALS,
        STORAGE_KEYS.PRODUCTIONS,
        STORAGE_KEYS.STOCK_MOVEMENTS
    ];

    arrayKeys.forEach(key => {
        if (getData(key) === null) {
            saveData(key, []);
        }
    });
}

// Export
window.Storage = {
    KEYS: STORAGE_KEYS,
    getData,
    saveData,
    removeData,
    getArray,
    generateId,
    formatCurrency,
    formatDate,
    getToday,
    isToday,
    initStorage,
    initSettings,
    initCategories
};
