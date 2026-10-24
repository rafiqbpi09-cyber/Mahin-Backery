/* ========================================
   Bakery Management System - Main App
   ======================================== */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize storage
    Storage.initStorage();

    // Initialize language
    const savedLang = localStorage.getItem('bms_language') || 'bn';
    i18n.setLanguage(savedLang);

    // Initialize theme
    const savedTheme = localStorage.getItem('bms_theme') || 'light';
    setTheme(savedTheme);

    // Setup UI
    setupSidebar();
    setupHeader();
    setupNavigation();
    setupLanguageToggle();
    setupThemeToggle();
    updateCurrentDate();

    // Load Dashboard
    Dashboard.update();
    Dashboard.setupChartFilters();

    // Init Products & Categories modules
    if (window.Categories) Categories.init();
    if (window.Products) Products.init();
    if (window.POS) POS.init();
    if (window.Suppliers) Suppliers.init();
    if (window.Purchases) Purchases.init();
    if (window.Customers) Customers.init();
    if (window.Expenses) Expenses.init();

    // Update date every minute
    setInterval(updateCurrentDate, 60000);
});

/**
 * Sidebar toggle (mobile)
 */
function setupSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const menuToggle = document.getElementById('menuToggle');
    const sidebarClose = document.getElementById('sidebarClose');

    function openSidebar() {
        sidebar.classList.add('open');
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeSidebar() {
        sidebar.classList.remove('open');
        overlay.classList.remove('active');
        document.body.style.overflow = '';
    }

    if (menuToggle) {
        menuToggle.addEventListener('click', openSidebar);
    }

    if (sidebarClose) {
        sidebarClose.addEventListener('click', closeSidebar);
    }

    if (overlay) {
        overlay.addEventListener('click', closeSidebar);
    }

    // Close on nav click (mobile)
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                closeSidebar();
            }
        });
    });
}

/**
 * Header related
 */
function setupHeader() {
    // Global search (placeholder for now)
    const searchInput = document.getElementById('globalSearch');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            // Will be implemented with modules
            console.log('Search:', this.value);
        });
    }
}

/**
 * Navigation between pages
 */
function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const pages = document.querySelectorAll('.page');
    const pageTitle = document.getElementById('pageTitle');
    const pageSubtitle = document.getElementById('pageSubtitle');

    const pageTitles = {
        dashboard: { title: 'dashboard', subtitle: 'dashboardSubtitle' },
        pos: { title: 'pos', subtitle: null },
        orders: { title: 'orders', subtitle: null },
        products: { title: 'products', subtitle: null },
        categories: { title: 'categories', subtitle: null },
        purchases: { title: 'purchases', subtitle: null },
        customers: { title: 'customers', subtitle: null },
        suppliers: { title: 'suppliers', subtitle: null },
        production: { title: 'production', subtitle: null },
        'raw-materials': { title: 'rawMaterials', subtitle: null },
        stock: { title: 'stock', subtitle: null },
        expenses: { title: 'expenses', subtitle: null },
        reports: { title: 'reports', subtitle: null },
        settings: { title: 'settings', subtitle: null }
    };

    function navigateTo(pageId) {
        // Update nav active
        navItems.forEach(item => {
            item.classList.toggle('active', item.dataset.page === pageId);
        });

        // Show page
        pages.forEach(page => {
            page.classList.toggle('active', page.id === `page-${pageId}`);
        });

        // Update title
        const info = pageTitles[pageId] || { title: pageId };
        if (pageTitle) {
            pageTitle.setAttribute('data-i18n', info.title);
            pageTitle.textContent = i18n.t(info.title);
        }
        if (pageSubtitle) {
            if (info.subtitle) {
                pageSubtitle.style.display = '';
                pageSubtitle.setAttribute('data-i18n', info.subtitle);
                pageSubtitle.textContent = i18n.t(info.subtitle);
            } else {
                pageSubtitle.style.display = 'none';
            }
        }

        // Refresh modules when navigating
        if (pageId === 'dashboard') {
            Dashboard.update();
        } else if (pageId === 'pos') {
            if (window.POS) POS.refresh();
        } else if (pageId === 'expenses') {
            if (window.Expenses) Expenses.render();
        } else if (pageId === 'customers') {
            if (window.Customers) Customers.render();
        } else if (pageId === 'suppliers') {
            if (window.Suppliers) Suppliers.render();
        } else if (pageId === 'purchases') {
            if (window.Purchases) Purchases.render();
        } else if (pageId === 'products') {
            if (window.Products) {
                Products.populateCategoryDropdowns();
                Products.render();
            }
        } else if (pageId === 'categories') {
            if (window.Categories) Categories.render();
        }
    }

    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const pageId = this.dataset.page;
            if (pageId) {
                navigateTo(pageId);
            }
        });
    });

    // View All links
    document.querySelectorAll('.view-all[data-page]').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            navigateTo(this.dataset.page);
        });
    });
}

/**
 * Language toggle
 */
function setupLanguageToggle() {
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const lang = this.dataset.lang;
            i18n.setLanguage(lang);
            updateCurrentDate();
            // Re-render lists that show category names
            if (window.Products) {
                Products.populateCategoryDropdowns();
                Products.render();
            }
            if (window.Categories) Categories.render();
        });
    });
}

/**
 * Theme toggle
 */
function setupThemeToggle() {
    const btn = document.getElementById('themeToggle');
    if (!btn) return;

    btn.addEventListener('click', function() {
        const current = document.documentElement.getAttribute('data-theme') || 'light';
        const next = current === 'dark' ? 'light' : 'dark';
        setTheme(next);
    });
}

function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('bms_theme', theme);

    const icon = document.querySelector('#themeToggle i');
    if (icon) {
        icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }

    // Re-render chart with new colors if on dashboard
    if (window.Dashboard && document.getElementById('page-dashboard')?.classList.contains('active')) {
        const sales = Storage.getArray(Storage.KEYS.SALES);
        const activeFilter = document.querySelector('.chart-filter.active');
        const period = activeFilter ? activeFilter.dataset.period : 'week';
        Dashboard.update(); // will re-render chart
    }
}

/**
 * Update current date in header
 */
function updateCurrentDate() {
    const el = document.getElementById('currentDate');
    if (!el) return;

    const now = new Date();
    const lang = i18n.getCurrentLang();

    if (lang === 'bn') {
        el.textContent = now.toLocaleDateString('bn-BD', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    } else {
        el.textContent = now.toLocaleDateString('en-GB', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    }
}

// Expose navigate for other modules
window.App = {
    navigateTo: function(pageId) {
        const item = document.querySelector(`.nav-item[data-page="${pageId}"]`);
        if (item) item.click();
    }
};
