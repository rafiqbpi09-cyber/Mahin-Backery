/* ========================================
   Firebase Firestore Sync — multi-device
   ======================================== */

const FirebaseSync = {
    db: null,
    enabled: false,
    syncing: false,
    lastError: null,
    collections: [
        'bms_products',
        'bms_categories',
        'bms_customers',
        'bms_suppliers',
        'bms_sales',
        'bms_purchases',
        'bms_expenses',
        'bms_orders',
        'bms_raw_materials',
        'bms_productions',
        'bms_stock_movements',
        'bms_settings'
    ],

    getConfig() {
        try {
            const raw = localStorage.getItem('bms_firebase_config');
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    },

    saveConfig(config) {
        localStorage.setItem('bms_firebase_config', JSON.stringify(config));
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
            this.setStatus('Firebase: Off', null);
            return false;
        }

        if (typeof firebase === 'undefined') {
            this.enabled = false;
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
            try {
                await this.db.enablePersistence({ synchronizeTabs: true });
            } catch (e) { /* ignore */ }

            this.enabled = true;
            this.setStatus('Firebase: Connected…', true);
            console.log('Firebase connected:', config.projectId);

            // Auto-download from cloud on every load (office PC gets home data)
            if (config.autoPull !== false) {
                await this.pullAll({ silent: true, reload: true });
            } else {
                this.setStatus('Firebase: Connected', true);
            }
            return true;
        } catch (err) {
            console.error('Firebase init error:', err);
            this.enabled = false;
            this.lastError = err.message || String(err);
            this.setStatus('Firebase: Error', false);
            if (typeof showToast === 'function') {
                showToast('Firebase: ' + this.lastError, 'error');
            }
            return false;
        }
    },

    async pushKey(key) {
        if (!this.enabled || !this.db) return false;
        try {
            let raw = localStorage.getItem(key);
            let parsed = null;
            try {
                parsed = raw ? JSON.parse(raw) : null;
            } catch {
                parsed = raw;
            }
            await this.db.collection('bakery_data').doc(key).set({
                data: parsed,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAtMs: Date.now()
            }, { merge: true });
            return true;
        } catch (err) {
            console.error('Firebase push error', key, err);
            this.lastError = err.message || String(err);
            return false;
        }
    },

    async pushAll(opts = {}) {
        if (!this.enabled || !this.db) {
            if (!opts.silent) showToast('Firebase চালু ও Save Config করুন', 'warning');
            return false;
        }
        this.syncing = true;
        this.setStatus('Uploading…', true);
        if (!opts.silent) showToast('ক্লাউডে আপলোড হচ্ছে…', 'success');

        let ok = 0;
        let fail = 0;
        for (const key of this.collections) {
            if (await this.pushKey(key)) ok++;
            else fail++;
        }
        this.syncing = false;

        if (fail > 0) {
            this.setStatus('Upload partial / error', false);
            if (!opts.silent) {
                showToast(
                    'কিছু ডেটা আপলোড হয়নি। Firestore Rules চেক করুন: ' + (this.lastError || ''),
                    'error'
                );
            }
            return false;
        }
        this.setStatus('Uploaded ✓ ' + new Date().toLocaleTimeString(), true);
        if (!opts.silent) showToast(`ক্লাউডে সেভ হয়েছে (${ok}টি)`, 'success');
        return true;
    },

    async pullAll(opts = {}) {
        if (!this.enabled || !this.db) {
            if (!opts.silent) showToast('Firebase কানেক্টেড নয়', 'warning');
            return false;
        }
        this.syncing = true;
        this.setStatus('Downloading…', true);
        if (!opts.silent) showToast('ক্লাউড থেকে ডাউনলোড…', 'success');

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
                this.setStatus('Cloud empty — Upload from home PC', null);
                if (!opts.silent) {
                    showToast('ক্লাউডে এখনো ডেটা নেই। বাসায় Upload to Cloud চাপুন।', 'warning');
                }
                return true;
            }

            this.setStatus('Synced ✓ ' + new Date().toLocaleTimeString(), true);
            if (!opts.silent) showToast(`ডাউনলোড (${count}টি)। রিলোড…`, 'success');

            // Avoid infinite reload loop: only reload once per session pull
            if (opts.reload !== false) {
                const flag = sessionStorage.getItem('bms_pulled');
                if (!flag) {
                    sessionStorage.setItem('bms_pulled', '1');
                    setTimeout(() => location.reload(), 600);
                }
            }
            return true;
        } catch (err) {
            this.syncing = false;
            this.lastError = err.message || String(err);
            console.error(err);
            this.setStatus('Download failed', false);
            if (!opts.silent) {
                showToast('ডাউনলোড ব্যর্থ: ' + this.lastError + ' (Rules / internet?)', 'error');
            }
            return false;
        }
    },

    _timers: {},
    schedulePush(key) {
        if (!this.enabled || this.syncing) return;
        if (!this.collections.includes(key)) return;
        clearTimeout(this._timers[key]);
        this._timers[key] = setTimeout(async () => {
            const ok = await this.pushKey(key);
            if (ok) this.setStatus('Auto-saved cloud ✓', true);
            else this.setStatus('Cloud save failed', false);
        }, 500);
    }
};

window.FirebaseSync = FirebaseSync;
