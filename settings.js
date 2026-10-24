/* ========================================
   Settings Module
   ======================================== */

const Settings = {
    logoData: null,

    init() {
        this.bindEvents();
        this.load();
    },

    bindEvents() {
        const form = document.getElementById('settingsForm');
        if (form) form.addEventListener('submit', (e) => this.save(e));

        const logoInput = document.getElementById('setLogo');
        if (logoInput) {
            logoInput.addEventListener('change', (e) => this.handleLogo(e));
        }

        document.getElementById('setLangBn')?.addEventListener('click', () => {
            i18n.setLanguage('bn');
            this.syncLangButtons();
            updateCurrentDate();
        });
        document.getElementById('setLangEn')?.addEventListener('click', () => {
            i18n.setLanguage('en');
            this.syncLangButtons();
            updateCurrentDate();
        });

        document.getElementById('setThemeLight')?.addEventListener('click', () => setTheme('light'));
        document.getElementById('setThemeDark')?.addEventListener('click', () => setTheme('dark'));

        document.getElementById('btnExportData')?.addEventListener('click', () => this.exportData());
        document.getElementById('btnImportData')?.addEventListener('click', () => {
            document.getElementById('importFileInput')?.click();
        });
        document.getElementById('importFileInput')?.addEventListener('change', (e) => this.importData(e));
        document.getElementById('btnClearData')?.addEventListener('click', () => this.clearAllData());
    },

    load() {
        const s = Storage.initSettings();
        this.logoData = s.logo || null;

        const set = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.value = val || '';
        };
        set('setBakeryName', s.bakeryName);
        set('setPhone', s.phone);
        set('setAddress', s.address);
        set('setEmail', s.email);
        set('setCurrency', s.currency || 'BDT');
        set('setInvoiceFooter', s.invoiceFooter);

        const preview = document.getElementById('setLogoPreview');
        if (preview) {
            if (this.logoData) {
                preview.innerHTML = `<img src="${this.logoData}" alt="Logo">`;
                preview.classList.add('has-image');
            } else {
                preview.innerHTML = `<i class="fas fa-store"></i><span data-i18n="clickToUpload">Click to upload logo</span>`;
                preview.classList.remove('has-image');
            }
        }

        this.syncLangButtons();
        this.updateSidebarLogo(s);
    },

    syncLangButtons() {
        const lang = i18n.getCurrentLang();
        document.getElementById('setLangBn')?.classList.toggle('active', lang === 'bn');
        document.getElementById('setLangEn')?.classList.toggle('active', lang === 'en');
    },

    handleLogo(e) {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 300 * 1024) {
            showToast('Logo should be under 300KB', 'warning');
            e.target.value = '';
            return;
        }
        const reader = new FileReader();
        reader.onload = (ev) => {
            this.logoData = ev.target.result;
            const preview = document.getElementById('setLogoPreview');
            preview.innerHTML = `<img src="${this.logoData}" alt="Logo">`;
            preview.classList.add('has-image');
        };
        reader.readAsDataURL(file);
    },

    save(e) {
        e.preventDefault();
        const settings = {
            bakeryName: document.getElementById('setBakeryName').value.trim() || 'Mahin Foods Products',
            phone: document.getElementById('setPhone').value.trim(),
            address: document.getElementById('setAddress').value.trim(),
            email: document.getElementById('setEmail').value.trim(),
            currency: document.getElementById('setCurrency').value || 'BDT',
            currencySymbol: document.getElementById('setCurrency').value === 'USD' ? '$'
                : document.getElementById('setCurrency').value === 'INR' ? '₹' : '৳',
            invoiceFooter: document.getElementById('setInvoiceFooter').value.trim() || 'Thank you for your purchase!',
            logo: this.logoData
        };

        Storage.saveData(Storage.KEYS.SETTINGS, settings);
        this.updateSidebarLogo(settings);
        if (window.applyBranding) applyBranding();
        showToast('Settings saved', 'success');
    },

    updateSidebarLogo(s) {
        const logoText = document.querySelector('.logo-text');
        if (logoText && s.bakeryName) {
            // keep short for sidebar
            const name = s.bakeryName.length > 14 ? s.bakeryName.slice(0, 12) + '…' : s.bakeryName;
            logoText.textContent = name;
        }
    },

    exportData() {
        const data = {};
        Object.values(Storage.KEYS).forEach(key => {
            const val = Storage.getData(key);
            if (val !== null) data[key] = val;
        });
        data._exportedAt = new Date().toISOString();
        data._app = 'Bakery Management System';

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `bakery-backup-${Storage.getToday()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('Data exported', 'success');
    },

    importData(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const data = JSON.parse(ev.target.result);
                if (!data || typeof data !== 'object') throw new Error('Invalid file');

                let count = 0;
                Object.values(Storage.KEYS).forEach(key => {
                    if (data[key] !== undefined) {
                        Storage.saveData(key, data[key]);
                        count++;
                    }
                });

                showToast(`Imported ${count} data sets. Reloading...`, 'success');
                setTimeout(() => location.reload(), 1000);
            } catch (err) {
                showToast('Invalid backup file', 'error');
            }
            e.target.value = '';
        };
        reader.readAsText(file);
    },

    clearAllData() {
        document.getElementById('confirmMessage').textContent =
            'Delete ALL data (products, sales, customers…)? This cannot be undone!';

        Categories.deleteCallback = () => {
            Object.values(Storage.KEYS).forEach(key => {
                if (key !== Storage.KEYS.LANGUAGE && key !== Storage.KEYS.THEME) {
                    localStorage.removeItem(key);
                }
            });
            Storage.initStorage();
            showToast('All data cleared. Reloading...', 'success');
            setTimeout(() => location.reload(), 800);
        };
        document.getElementById('confirmModal').classList.add('active');
    }
};

window.Settings = Settings;
