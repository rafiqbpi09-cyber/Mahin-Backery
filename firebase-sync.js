/* ========================================
   Firebase Firestore Sync Layer
   Enable from Settings with your project config.
   ======================================== */

const FirebaseSync = {
    app: null,
    db: null,
    enabled: false,
    syncing: false,
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

    isConfigured() {
        const c = this.getConfig();
        return !!(c && c.apiKey && c.projectId && c.enabled);
    },

    async init() {
        const config = this.getConfig();
        if (!config || !config.enabled || !config.apiKey || !config.projectId) {
            this.enabled = false;
            return false;
        }

        if (typeof firebase === 'undefined') {
            console.warn('Firebase SDK not loaded');
            this.enabled = false;
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
            // Optional: offline persistence
            try {
                await this.db.enablePersistence({ synchronizeTabs: true });
            } catch (e) {
                // multiple tabs or unsupported
            }
            this.enabled = true;
            console.log('Firebase connected:', config.projectId);
            return true;
        } catch (err) {
            console.error('Firebase init error:', err);
            this.enabled = false;
            showToast('Firebase connection failed: ' + (err.message || err), 'error');
            return false;
        }
    },

    /** Push one local key to Firestore */
    async pushKey(key) {
        if (!this.enabled || !this.db) return false;
        try {
            const data = localStorage.getItem(key);
            const parsed = data ? JSON.parse(data) : null;
            await this.db.collection('bakery_data').doc(key).set({
                data: parsed,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            return true;
        } catch (err) {
            console.error('Firebase push error', key, err);
            return false;
        }
    },

    /** Push all bakery data to cloud */
    async pushAll() {
        if (!this.enabled) {
            showToast('Enable & save Firebase config first', 'warning');
            return false;
        }
        this.syncing = true;
        showToast('Uploading to Firebase...', 'success');
        let ok = 0;
        for (const key of this.collections) {
            if (await this.pushKey(key)) ok++;
        }
        // also language/theme optional
        this.syncing = false;
        showToast(`Uploaded ${ok} collections to cloud`, 'success');
        return true;
    },

    /** Pull all from cloud into LocalStorage */
    async pullAll() {
        if (!this.enabled || !this.db) {
            showToast('Firebase not connected', 'warning');
            return false;
        }
        this.syncing = true;
        showToast('Downloading from Firebase...', 'success');
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
            showToast(`Downloaded ${count} collections. Reloading...`, 'success');
            setTimeout(() => location.reload(), 1000);
            return true;
        } catch (err) {
            this.syncing = false;
            console.error(err);
            showToast('Download failed: ' + (err.message || err), 'error');
            return false;
        }
    },

    /** Auto-push after local save (debounced per key) */
    _timers: {},
    schedulePush(key) {
        if (!this.enabled || this.syncing) return;
        if (!this.collections.includes(key) && key !== 'bms_settings') return;
        clearTimeout(this._timers[key]);
        this._timers[key] = setTimeout(() => this.pushKey(key), 800);
    }
};

window.FirebaseSync = FirebaseSync;
