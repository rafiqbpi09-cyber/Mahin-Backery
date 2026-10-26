/* ========================================
   Firebase = Primary database
   LocalStorage = offline cache only
   ======================================== */

const FirebaseSync = {
    db: null,
    enabled: false,
    syncing: false,
    ready: false,
    lastError: null,
    collections: [
        'bms_products', 'bms_categories', 'bms_customers', 'bms_suppliers',
        'bms_sales', 'bms_purchases', 'bms_expenses', 'bms_orders',
        'bms_raw_materials', 'bms_productions', 'bms_stock_movements', 'bms_settings'
    ],

    getConfig() {
        // 1) User saved in Settings (this device)
        try {
            const raw = localStorage.getItem('bms_firebase_config');
            if (raw) {
                const c = JSON.parse(raw);
                if (c && c.apiKey && c.projectId) return c;
            }
        } catch (e) {}

        // 2) Shared config from firebase-config.js (all devices / mobile)
        const g = window.FIREBASE_CONFIG;
        if (g && g.apiKey && g.projectId) {
            return {
                enabled: g.enabled !== false,
                autoPull: g.autoPull !== false,
                apiKey: g.apiKey,
                authDomain: g.authDomain || '',
                projectId: g.projectId,
                storageBucket: g.storageBucket || '',
                messagingSenderId: g.messagingSenderId || '',
                appId: g.appId || ''
            };
        }
        return null;
    },

    saveConfig(config) {
        localStorage.setItem('bms_firebase_config', JSON.stringify(config));
    },

    isConfigured() {
        const c = this.getConfig();
        return !!(c && c.apiKey && c.projectId && c.enabled);
    },

    setStatus(text, ok) {
        const el = document.getElementById('firebaseStatus');
        if (el) {
            el.textContent = text;
            el.style.color = ok === true ? 'var(--success)' : ok === false ? 'var(--danger)' : 'var(--text-muted)';
        }
        const badge = document.getElementById('syncStatusBadge');
        if (badge) {
            badge.textContent = text;
            badge.style.display = 'inline-flex';
            badge.className = 'sync-status-badge ' + (ok === true ? 'ok' : ok === false ? 'err' : '');
        }
    },

    async init() {
        const config = this.getConfig();
        if (!config || !config.enabled || !config.apiKey || !config.projectId) {
            this.enabled = false;
            this.ready = true;
            this.setStatus('Cloud Off', null);
            return false;
        }

        if (typeof firebase === 'undefined') {
            this.enabled = false;
            this.ready = true;
            this.setStatus('Firebase SDK missing', false);
            return false;
        }

        try {
            if (!firebase.apps.length) {
                firebase.initializeApp({
                    apiKey: config.apiKey,
                    authDomain: config.authDomain || `${config.projectId}.firebaseapp.com`,
                    projectId: config.projectId,
                    storageBucket: config.storageBucket || `${config.projectId}.appspot.com`,
                    messagingSenderId: config.messagingSenderId || '',
                    appId: config.appId || ''
                });
            }
            this.db = firebase.firestore();
            // Persistence: skip deprecated enablePersistence / multi-tab API

            this.enabled = true;
            this.setStatus('Cloud loading…', true);

            // Always load from cloud first (source of truth)
            await this.pullAll({ silent: true, reload: false });

            this.ready = true;
            this.setStatus('Cloud ✓ Online', true);
            return true;
        } catch (err) {
            console.error(err);
            this.enabled = false;
            this.ready = true;
            this.lastError = err.message || String(err);
            this.setStatus('Cloud error', false);
            return false;
        }
    },

    async pushKey(key) {
        if (!this.enabled || !this.db) return false;
        try {
            const raw = localStorage.getItem(key);
            let parsed = null;
            try { parsed = raw ? JSON.parse(raw) : null; } catch { parsed = raw; }
            await this.db.collection('bakery_data').doc(key).set({
                data: parsed,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAtMs: Date.now()
            }, { merge: true });
            return true;
        } catch (err) {
            console.error('push', key, err);
            this.lastError = err.message || String(err);
            this.setStatus('Save failed', false);
            return false;
        }
    },

    async pushAll(opts = {}) {
        if (!this.enabled || !this.db) {
            if (!opts.silent) showToast('Firebase Enable + Save Config করুন', 'warning');
            return false;
        }
        this.syncing = true;
        this.setStatus('Uploading…', true);
        let ok = 0, fail = 0;
        for (const key of this.collections) {
            if (await this.pushKey(key)) ok++; else fail++;
        }
        this.syncing = false;
        if (fail) {
            this.setStatus('Upload error', false);
            if (!opts.silent) showToast('Upload ব্যর্থ: ' + (this.lastError || 'Rules?'), 'error');
            return false;
        }
        this.setStatus('Cloud ✓ Saved', true);
        if (!opts.silent) showToast('সব ডেটা Firebase-এ সেভ', 'success');
        return true;
    },

    async pullAll(opts = {}) {
        if (!this.enabled || !this.db) {
            if (!opts.silent) showToast('Firebase কানেক্ট নেই', 'warning');
            return false;
        }
        this.syncing = true;
        try {
            const snap = await this.db.collection('bakery_data').get();
            let count = 0;
            snap.forEach(doc => {
                const body = doc.data();
                if (body && body.data !== undefined) {
                    localStorage.setItem(doc.id, JSON.stringify(body.data));
                    count++;
                }
            });
            this.syncing = false;
            if (count === 0) {
                this.setStatus('Cloud empty', null);
                if (!opts.silent) showToast('ক্লাউড খালি — একবার Upload করুন', 'warning');
            } else {
                this.setStatus('Cloud ✓ ' + count + ' sets', true);
                if (!opts.silent) showToast('Firebase থেকে লোড (' + count + ')', 'success');
            }
            if (opts.reload) {
                const flag = sessionStorage.getItem('bms_cloud_loaded');
                if (!flag) {
                    sessionStorage.setItem('bms_cloud_loaded', '1');
                    setTimeout(() => location.reload(), 400);
                }
            }
            return true;
        } catch (err) {
            this.syncing = false;
            this.lastError = err.message || String(err);
            this.setStatus('Download fail', false);
            if (!opts.silent) showToast('ডাউনলোড ব্যর্থ: ' + this.lastError, 'error');
            return false;
        }
    },

    _timers: {},
    schedulePush(key) {
        if (!this.collections.includes(key)) return;
        clearTimeout(this._timers[key]);
        this._timers[key] = setTimeout(() => this.pushKey(key), 300);
    }
};

window.FirebaseSync = FirebaseSync;
