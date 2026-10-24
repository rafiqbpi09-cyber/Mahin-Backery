/* ========================================
   Internationalization (i18n)
   বাংলা ও English Support
   ======================================== */

const translations = {
    bn: {
        // App
        appName: 'বেকারি এমএস',
        admin: 'অ্যাডমিন',
        bakeryOwner: 'বেকারি মালিক',

        // Navigation
        dashboard: 'ড্যাশবোর্ড',
        pos: 'পস / বিক্রয়',
        orders: 'অর্ডার',
        products: 'পণ্য',
        categories: 'ক্যাটাগরি',
        purchases: 'ক্রয়',
        customers: 'গ্রাহক',
        suppliers: 'সরবরাহকারী',
        production: 'প্রোডাকশন',
        rawMaterials: 'কাঁচামাল',
        stock: 'স্টক',
        expenses: 'খরচ',
        reports: 'রিপোর্ট',
        settings: 'সেটিংস',

        // Dashboard
        dashboardSubtitle: 'স্বাগতম! আজকের অবস্থা দেখুন।',
        todaysSales: 'আজকের বিক্রয়',
        todaysPurchase: 'আজকের ক্রয়',
        todaysExpense: 'আজকের খরচ',
        todaysProfit: 'আজকের লাভ',
        totalProducts: 'মোট পণ্য',
        lowStockProducts: 'কম স্টক',
        totalCustomers: 'গ্রাহক',
        totalSuppliers: 'সরবরাহকারী',
        todaysOrders: 'আজকের অর্ডার',
        pendingOrders: 'পেন্ডিং অর্ডার',
        salesOverview: 'বিক্রয় ওভারভিউ',
        week: 'সপ্তাহ',
        month: 'মাস',
        paymentSummary: 'পেমেন্ট সারাংশ',
        paidAmount: 'পরিশোধিত',
        dueAmount: 'বাকি',
        recentSales: 'সাম্প্রতিক বিক্রয়',
        viewAll: 'সব দেখুন',
        lowStockAlert: 'কম স্টক সতর্কতা',
        noRecentSales: 'এখনো কোনো বিক্রয় নেই',
        allStockOk: 'সব পণ্যে পর্যাপ্ত স্টক আছে',
        invoice: 'ইনভয়েস',
        customer: 'গ্রাহক',
        amount: 'পরিমাণ',
        status: 'স্ট্যাটাস',
        time: 'সময়',
        searchPlaceholder: 'খুঁজুন...',

        // Coming soon
        comingSoon: 'পরবর্তী ধাপে আসছে...',
        posComing: 'পস মডিউল',
        ordersComing: 'অর্ডার মডিউল',
        productsComing: 'পণ্য মডিউল',
        categoriesComing: 'ক্যাটাগরি মডিউল',
        purchasesComing: 'ক্রয় মডিউল',
        customersComing: 'গ্রাহক মডিউল',
        suppliersComing: 'সরবরাহকারী মডিউল',
        productionComing: 'প্রোডাকশন মডিউল',
        rawMaterialsComing: 'কাঁচামাল মডিউল',
        stockComing: 'স্টক মডিউল',
        expensesComing: 'খরচ মডিউল',
        reportsComing: 'রিপোর্ট মডিউল',
        settingsComing: 'সেটিংস মডিউল',
        // Products & Categories
        addProduct: 'পণ্য যোগ করুন',
        editProduct: 'পণ্য সম্পাদনা',
        saveProduct: 'পণ্য সেভ করুন',
        productName: 'পণ্যের নাম',
        productCode: 'পণ্য কোড',
        category: 'ক্যাটাগরি',
        unit: 'একক',
        purchasePrice: 'ক্রয় মূল্য',
        sellingPrice: 'বিক্রয় মূল্য',
        currentStock: 'বর্তমান স্টক',
        minStock: 'সর্বনিম্ন স্টক',
        expiryDate: 'মেয়াদ শেষ',
        productImage: 'পণ্যের ছবি',
        clickToUpload: 'আপলোড করতে ক্লিক করুন',
        active: 'সক্রিয়',
        inactive: 'নিষ্ক্রিয়',
        cancel: 'বাতিল',
        delete: 'মুছুন',
        confirmDelete: 'মুছে ফেলার নিশ্চিতকরণ',
        deleteConfirmMsg: 'আপনি কি নিশ্চিত যে এটি মুছে ফেলতে চান? এই কাজটি পূর্বাবস্থায় ফেরানো যাবে না।',
        searchProducts: 'পণ্য খুঁজুন...',
        allCategories: 'সব ক্যাটাগরি',
        allStock: 'সব স্টক',
        lowStockOnly: 'কম স্টক',
        outOfStock: 'স্টক শেষ',
        expiringSoon: 'মেয়াদ শেষ হচ্ছে',
        noProducts: 'এখনো কোনো পণ্য নেই। প্রথম পণ্য যোগ করুন!',
        image: 'ছবি',
        code: 'কোড',
        stock: 'স্টক',
        actions: 'অ্যাকশন',
        addCategory: 'ক্যাটাগরি যোগ করুন',
        editCategory: 'ক্যাটাগরি সম্পাদনা',
        saveCategory: 'ক্যাটাগরি সেভ করুন',
        categoryNameEn: 'নাম (English)',
        categoryNameBn: 'নাম (বাংলা)',
        searchCategories: 'ক্যাটাগরি খুঁজুন...',
        noCategories: 'কোনো ক্যাটাগরি পাওয়া যায়নি',
        nameRequired: 'নাম আবশ্যক',
        // POS
        cart: 'কার্ট',
        cartEmpty: 'কার্ট খালি। পণ্য যোগ করুন।',
        subtotal: 'সাবটোটাল',
        discount: 'ডিসকাউন্ট',
        grandTotal: 'মোট',
        paymentMethod: 'পেমেন্ট পদ্ধতি',
        completeSale: 'বিক্রয় সম্পন্ন',
        print: 'প্রিন্ট',
        done: 'শেষ',
        // Suppliers & Purchases
        addSupplier: 'সরবরাহকারী যোগ করুন',
        editSupplier: 'সরবরাহকারী সম্পাদনা',
        saveSupplier: 'সেভ করুন',
        supplierName: 'সরবরাহকারীর নাম',
        mobile: 'মোবাইল',
        address: 'ঠিকানা',
        totalPurchase: 'মোট ক্রয়',
        paid: 'পরিশোধিত',
        due: 'বাকি',
        searchSuppliers: 'সরবরাহকারী খুঁজুন...',
        noSuppliers: 'এখনো কোনো সরবরাহকারী নেই',
        addPurchase: 'নতুন ক্রয়',
        savePurchase: 'ক্রয় সেভ করুন',
        purchaseDate: 'ক্রয়ের তারিখ',
        totalAmount: 'মোট টাকা',
        note: 'নোট',
        searchPurchases: 'ক্রয় খুঁজুন...',
        noPurchases: 'এখনো কোনো ক্রয় নেই',
        totalPurchases: 'মোট ক্রয়',
        purchaseAmount: 'পরিমাণ',
        purchaseDetails: 'ক্রয়ের বিবরণ',
        supplier: 'সরবরাহকারী',
        date: 'তারিখ',
        items: 'আইটেম',
        total: 'মোট',
        // Customers
        addCustomer: 'গ্রাহক যোগ করুন',
        editCustomer: 'গ্রাহক সম্পাদনা',
        saveCustomer: 'সেভ করুন',
        customerName: 'গ্রাহকের নাম',
        searchCustomers: 'গ্রাহক খুঁজুন...',
        noCustomers: 'এখনো কোনো গ্রাহক নেই',
        allCustomers: 'সব গ্রাহক',
        withDue: 'বাকি আছে',
        lastPurchase: 'শেষ ক্রয়',
        customerLedger: 'গ্রাহক লেজার',
        receivePayment: 'পেমেন্ট গ্রহণ',
        // Expenses
        addExpense: 'খরচ যোগ করুন',
        editExpense: 'খরচ সম্পাদনা',
        saveExpense: 'খরচ সেভ করুন',
        expenseCategory: 'খরচের ধরন',
        description: 'বিবরণ',
        searchExpenses: 'খরচ খুঁজুন...',
        noExpenses: 'এখনো কোনো খরচ নেই',
        totalExpenses: 'মোট এন্ট্রি',
        totalExpenseAmount: 'মোট খরচ',





    },

    en: {
        // App
        appName: 'Bakery MS',
        admin: 'Admin',
        bakeryOwner: 'Bakery Owner',

        // Navigation
        dashboard: 'Dashboard',
        pos: 'POS / Sales',
        orders: 'Orders',
        products: 'Products',
        categories: 'Categories',
        purchases: 'Purchases',
        customers: 'Customers',
        suppliers: 'Suppliers',
        production: 'Production',
        rawMaterials: 'Raw Materials',
        stock: 'Stock',
        expenses: 'Expenses',
        reports: 'Reports',
        settings: 'Settings',

        // Dashboard
        dashboardSubtitle: "Welcome back! Here's what's happening today.",
        todaysSales: "Today's Sales",
        todaysPurchase: "Today's Purchase",
        todaysExpense: "Today's Expense",
        todaysProfit: "Today's Profit",
        totalProducts: 'Total Products',
        lowStockProducts: 'Low Stock',
        totalCustomers: 'Customers',
        totalSuppliers: 'Suppliers',
        todaysOrders: "Today's Orders",
        pendingOrders: 'Pending Orders',
        salesOverview: 'Sales Overview',
        week: 'Week',
        month: 'Month',
        paymentSummary: 'Payment Summary',
        paidAmount: 'Paid Amount',
        dueAmount: 'Due Amount',
        recentSales: 'Recent Sales',
        viewAll: 'View All',
        lowStockAlert: 'Low Stock Alert',
        noRecentSales: 'No recent sales yet',
        allStockOk: 'All products have sufficient stock',
        invoice: 'Invoice',
        customer: 'Customer',
        amount: 'Amount',
        status: 'Status',
        time: 'Time',
        searchPlaceholder: 'Search...',

        // Coming soon
        comingSoon: 'Coming in next step...',
        posComing: 'POS Module',
        ordersComing: 'Orders Module',
        productsComing: 'Products Module',
        categoriesComing: 'Categories Module',
        purchasesComing: 'Purchases Module',
        customersComing: 'Customers Module',
        suppliersComing: 'Suppliers Module',
        productionComing: 'Production Module',
        rawMaterialsComing: 'Raw Materials Module',
        stockComing: 'Stock Module',
        expensesComing: 'Expenses Module',
        reportsComing: 'Reports Module',
        settingsComing: 'Settings Module',
        // Products & Categories
        addProduct: 'Add Product',
        editProduct: 'Edit Product',
        saveProduct: 'Save Product',
        productName: 'Product Name',
        productCode: 'Product Code',
        category: 'Category',
        unit: 'Unit',
        purchasePrice: 'Purchase Price',
        sellingPrice: 'Selling Price',
        currentStock: 'Current Stock',
        minStock: 'Minimum Stock',
        expiryDate: 'Expiry Date',
        productImage: 'Product Image',
        clickToUpload: 'Click to upload',
        active: 'Active',
        inactive: 'Inactive',
        cancel: 'Cancel',
        delete: 'Delete',
        confirmDelete: 'Confirm Delete',
        deleteConfirmMsg: 'Are you sure you want to delete this item? This action cannot be undone.',
        searchProducts: 'Search products...',
        allCategories: 'All Categories',
        allStock: 'All Stock',
        lowStockOnly: 'Low Stock',
        outOfStock: 'Out of Stock',
        expiringSoon: 'Expiring Soon',
        noProducts: 'No products yet. Add your first product!',
        image: 'Image',
        code: 'Code',
        stock: 'Stock',
        actions: 'Actions',
        addCategory: 'Add Category',
        editCategory: 'Edit Category',
        saveCategory: 'Save Category',
        categoryNameEn: 'Name (English)',
        categoryNameBn: 'Name (বাংলা)',
        searchCategories: 'Search categories...',
        noCategories: 'No categories found',
        nameRequired: 'Name is required',
        // POS
        cart: 'Cart',
        cartEmpty: 'Cart is empty. Add products.',
        subtotal: 'Subtotal',
        discount: 'Discount',
        grandTotal: 'Grand Total',
        paymentMethod: 'Payment Method',
        completeSale: 'Complete Sale',
        print: 'Print',
        done: 'Done',
        // Suppliers & Purchases
        addSupplier: 'Add Supplier',
        editSupplier: 'Edit Supplier',
        saveSupplier: 'Save Supplier',
        supplierName: 'Supplier Name',
        mobile: 'Mobile',
        address: 'Address',
        totalPurchase: 'Total Purchase',
        paid: 'Paid',
        due: 'Due',
        searchSuppliers: 'Search suppliers...',
        noSuppliers: 'No suppliers yet',
        addPurchase: 'New Purchase',
        savePurchase: 'Save Purchase',
        purchaseDate: 'Purchase Date',
        totalAmount: 'Total Amount',
        note: 'Note',
        searchPurchases: 'Search purchases...',
        noPurchases: 'No purchases yet',
        totalPurchases: 'Total',
        purchaseAmount: 'Amount',
        purchaseDetails: 'Purchase Details',
        supplier: 'Supplier',
        date: 'Date',
        items: 'Items',
        total: 'Total',
        // Customers
        addCustomer: 'Add Customer',
        editCustomer: 'Edit Customer',
        saveCustomer: 'Save Customer',
        customerName: 'Customer Name',
        searchCustomers: 'Search customers...',
        noCustomers: 'No customers yet',
        allCustomers: 'All Customers',
        withDue: 'With Due',
        lastPurchase: 'Last Purchase',
        customerLedger: 'Customer Ledger',
        receivePayment: 'Receive Payment',
        // Expenses
        addExpense: 'Add Expense',
        editExpense: 'Edit Expense',
        saveExpense: 'Save Expense',
        expenseCategory: 'Category',
        description: 'Description',
        searchExpenses: 'Search expenses...',
        noExpenses: 'No expenses yet',
        totalExpenses: 'Total Entries',
        totalExpenseAmount: 'Total Amount',





    }
};

// Current language
let currentLang = localStorage.getItem('bms_language') || 'bn';

/**
 * Get translation by key
 */
function t(key) {
    return translations[currentLang][key] || translations['en'][key] || key;
}

/**
 * Apply translations to all elements with data-i18n
 */
function applyTranslations() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[currentLang][key]) {
            el.textContent = translations[currentLang][key];
        }
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (translations[currentLang][key]) {
            el.placeholder = translations[currentLang][key];
        }
    });

    // Update body class for font
    document.body.classList.toggle('lang-bn', currentLang === 'bn');
    document.documentElement.lang = currentLang;
}

/**
 * Switch language
 */
function setLanguage(lang) {
    if (!translations[lang]) return;
    currentLang = lang;
    localStorage.setItem('bms_language', lang);
    applyTranslations();

    // Update lang buttons
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.lang === lang);
    });
}

// Export for other modules
window.i18n = { t, applyTranslations, setLanguage, getCurrentLang: () => currentLang };
