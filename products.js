/* ========================================
   Products Module
   ======================================== */

const Products = {
    editingId: null,
    imageData: null,
    activeTab: 'all', // 'all' | 'factory'

    init() {
        this.bindEvents();
        this.seedFactoryProducts();
        this.populateCategoryDropdowns();
        this.render();
    },

    bindEvents() {
        const addBtn = document.getElementById('btnAddProduct');
        if (addBtn) addBtn.addEventListener('click', () => this.openModal());

        const form = document.getElementById('productForm');
        if (form) form.addEventListener('submit', (e) => this.save(e));

        const search = document.getElementById('productSearch');
        if (search) search.addEventListener('input', () => this.render());

        const catFilter = document.getElementById('productCategoryFilter');
        if (catFilter) catFilter.addEventListener('change', () => this.render());

        const stockFilter = document.getElementById('productStockFilter');
        if (stockFilter) stockFilter.addEventListener('change', () => this.render());

        document.querySelectorAll('#productTabs .product-tab').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('#productTabs .product-tab').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.activeTab = btn.dataset.tab || 'all';
                this.render();
            });
        });

        // Image preview
        const imgInput = document.getElementById('productImage');
        if (imgInput) {
            imgInput.addEventListener('change', (e) => this.handleImage(e));
        }

        // Image preview click
        const preview = document.getElementById('productImagePreview');
        if (preview) {
            preview.addEventListener('click', () => imgInput?.click());
        }
    },

    getAll() {
        return Storage.getArray(Storage.KEYS.PRODUCTS);
    },

    getById(id) {
        return this.getAll().find(p => p.id === id);
    },

    populateCategoryDropdowns() {
        const categories = Categories.getAll().filter(c => c.status === 'active');
        const lang = window.i18n ? i18n.getCurrentLang() : 'en';

        const selects = [
            document.getElementById('productCategory'),
            document.getElementById('productCategoryFilter')
        ];

        selects.forEach((select, idx) => {
            if (!select) return;
            const currentVal = select.value;
            const isFilter = idx === 1;

            select.innerHTML = isFilter
                ? `<option value="">${window.i18n ? i18n.t('allCategories') || 'All Categories' : 'All Categories'}</option>`
                : `<option value="">Select Category</option>`;

            categories.forEach(c => {
                const name = lang === 'bn' && c.nameBn ? c.nameBn : c.name;
                select.innerHTML += `<option value="${c.id}">${escapeHtml(name)}</option>`;
            });

            if (currentVal) select.value = currentVal;
        });
    },

    openModal(product = null) {
        this.editingId = product ? product.id : null;
        this.imageData = product ? (product.image || null) : null;

        const title = document.getElementById('productModalTitle');
        if (title) {
            title.textContent = product
                ? (window.i18n ? i18n.t('editProduct') || 'Edit Product' : 'Edit Product')
                : (window.i18n ? i18n.t('addProduct') || 'Add Product' : 'Add Product');
        }

        document.getElementById('productForm').reset();
        document.getElementById('productFormError').classList.remove('show');
        this.populateCategoryDropdowns();

        document.getElementById('productId').value = product ? product.id : '';
        document.getElementById('productName').value = product ? product.name : '';
        document.getElementById('productCode').value = product ? (product.code || '') : '';
        document.getElementById('productCategory').value = product ? (product.categoryId || '') : '';
        document.getElementById('productUnit').value = product ? (product.unit || 'pcs') : 'pcs';
        document.getElementById('productPurchasePrice').value = product ? product.purchasePrice : '';
        document.getElementById('productSellingPrice').value = product ? product.sellingPrice : '';
        document.getElementById('productCurrentStock').value = product ? (product.currentStock ?? 0) : 0;
        document.getElementById('productMinStock').value = product ? (product.minStock ?? 5) : 5;
        document.getElementById('productExpiry').value = product ? (product.expiryDate || '') : '';
        document.getElementById('productStatus').value = product ? (product.status || 'active') : 'active';

        // Image preview
        const preview = document.getElementById('productImagePreview');
        if (this.imageData) {
            preview.innerHTML = `<img src="${this.imageData}" alt="Product">`;
            preview.classList.add('has-image');
        } else {
            preview.innerHTML = `<i class="fas fa-image"></i><span data-i18n="clickToUpload">Click to upload</span>`;
            preview.classList.remove('has-image');
        }

        document.getElementById('productModal').classList.add('active');
        document.getElementById('productName').focus();
    },

    handleImage(e) {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 500 * 1024) {
            showToast('Image should be less than 500KB', 'warning');
            e.target.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = (ev) => {
            this.imageData = ev.target.result;
            const preview = document.getElementById('productImagePreview');
            preview.innerHTML = `<img src="${this.imageData}" alt="Product">`;
            preview.classList.add('has-image');
        };
        reader.readAsDataURL(file);
    },

    save(e) {
        e.preventDefault();
        const error = document.getElementById('productFormError');

        const name = document.getElementById('productName').value.trim();
        const code = document.getElementById('productCode').value.trim();
        const categoryId = document.getElementById('productCategory').value;
        const unit = document.getElementById('productUnit').value;
        const purchasePrice = parseFloat(document.getElementById('productPurchasePrice').value) || 0;
        const sellingPrice = parseFloat(document.getElementById('productSellingPrice').value) || 0;
        const currentStock = parseFloat(document.getElementById('productCurrentStock').value) || 0;
        const minStock = parseFloat(document.getElementById('productMinStock').value) || 0;
        const expiryDate = document.getElementById('productExpiry').value;
        const status = document.getElementById('productStatus').value;

        if (!name) {
            error.textContent = 'Product name is required';
            error.classList.add('show');
            return;
        }
        if (!categoryId) {
            error.textContent = 'Please select a category';
            error.classList.add('show');
            return;
        }
        if (sellingPrice < 0 || purchasePrice < 0) {
            error.textContent = 'Prices cannot be negative';
            error.classList.add('show');
            return;
        }

        let products = this.getAll();

        // Duplicate code check
        if (code) {
            const dup = products.find(p => p.code && p.code.toLowerCase() === code.toLowerCase() && p.id !== this.editingId);
            if (dup) {
                error.textContent = 'Product code already exists';
                error.classList.add('show');
                return;
            }
        }

        const cat = Categories.getById(categoryId);
        const productData = {
            name,
            code,
            categoryId,
            categoryName: cat ? cat.name : '',
            unit,
            purchasePrice,
            sellingPrice,
            currentStock,
            minStock,
            expiryDate: expiryDate || null,
            status,
            image: this.imageData,
            updatedAt: new Date().toISOString()
        };

        // New products from factory tab (or always join factory catalog for this bakery)
        if (this.editingId) {
            const idx = products.findIndex(p => p.id === this.editingId);
            if (idx !== -1) {
                products[idx] = { ...products[idx], ...productData };
            }
            showToast('Product updated successfully', 'success');
        } else {
            products.push({
                id: Storage.generateId('prod'),
                ...productData,
                isFactory: true,
                source: 'factory',
                createdAt: new Date().toISOString()
            });
            showToast('Product added successfully', 'success');
        }

        Storage.saveData(Storage.KEYS.PRODUCTS, products);
        document.getElementById('productModal').classList.remove('active');
        this.render();

        // Update dashboard if visible
        if (window.Dashboard) Dashboard.update();
    },

    confirmDelete(id) {
        const product = this.getById(id);
        if (!product) return;

        const msg = document.getElementById('confirmMessage');
        msg.textContent = `Delete product "${product.name}"? This cannot be undone.`;

        Categories.deleteCallback = () => {
            let products = this.getAll().filter(p => p.id !== id);
            Storage.saveData(Storage.KEYS.PRODUCTS, products);
            showToast('Product deleted', 'success');
            this.render();
            if (window.Dashboard) Dashboard.update();
            if (window.Categories) Categories.render();
        };

        document.getElementById('confirmModal').classList.add('active');
    },

    getStockStatus(product) {
        const stock = Number(product.currentStock) || 0;
        const min = Number(product.minStock) || 0;
        if (stock <= 0) return 'out';
        if (stock <= min) return 'low';
        return 'ok';
    },

    isExpiringSoon(product, days = 7) {
        if (!product.expiryDate) return false;
        const exp = new Date(product.expiryDate);
        const now = new Date();
        const diff = (exp - now) / (1000 * 60 * 60 * 24);
        return diff >= 0 && diff <= days;
    },

    isExpired(product) {
        if (!product.expiryDate) return false;
        return new Date(product.expiryDate) < new Date();
    },

    render() {
        const tbody = document.getElementById('productsTableBody');
        if (!tbody) return;

        const search = (document.getElementById('productSearch')?.value || '').toLowerCase();
        const catFilter = document.getElementById('productCategoryFilter')?.value || '';
        const stockFilter = document.getElementById('productStockFilter')?.value || '';

        let products = this.getAll();

        // Filters
        if (search) {
            products = products.filter(p =>
                (p.name || '').toLowerCase().includes(search) ||
                (p.code || '').toLowerCase().includes(search) ||
                (p.categoryName || '').toLowerCase().includes(search)
            );
        }
        if (catFilter) {
            products = products.filter(p => p.categoryId === catFilter);
        }
        if (stockFilter === 'low') {
            products = products.filter(p => this.getStockStatus(p) === 'low');
        } else if (stockFilter === 'out') {
            products = products.filter(p => this.getStockStatus(p) === 'out');
        } else if (stockFilter === 'expiry') {
            products = products.filter(p => this.isExpiringSoon(p) || this.isExpired(p));
        }

        // Factory products tab
        if (this.activeTab === 'factory') {
            products = products.filter(p => p.source === 'factory' || p.isFactory === true);
        }

        // Mini stats (from all products, not filtered)
        this.updateMiniStats();

        if (products.length === 0) {
            tbody.innerHTML = `
                <tr class="empty-row">
                    <td colspan="9" class="empty-state">
                        <i class="fas fa-box-open"></i>
                        <p data-i18n="noProducts">No products found</p>
                    </td>
                </tr>
            `;
            return;
        }

        // Sort by name
        products.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

        tbody.innerHTML = products.map(p => {
            const stockStatus = this.getStockStatus(p);
            const stockLabels = { ok: 'In Stock', low: 'Low', out: 'Out' };
            const cat = Categories.getById(p.categoryId);
            const lang = window.i18n ? i18n.getCurrentLang() : 'en';
            const catName = cat
                ? (lang === 'bn' && cat.nameBn ? cat.nameBn : cat.name)
                : (p.categoryName || '—');

            let thumb = `<div class="product-thumb"><i class="fas fa-cookie-bite"></i></div>`;
            if (p.image) {
                thumb = `<div class="product-thumb"><img src="${p.image}" alt=""></div>`;
            }

            const expiryWarn = this.isExpired(p)
                ? '<br><small style="color:var(--danger)">Expired</small>'
                : (this.isExpiringSoon(p) ? '<br><small style="color:#C9A227">Expiring soon</small>' : '');

            return `
                <tr>
                    <td>${thumb}</td>
                    <td>
                        <div class="product-info-cell">
                            <strong>${escapeHtml(p.name)}</strong>
                            ${p.unit ? `<small>${p.unit}</small>` : ''}
                            ${expiryWarn}
                        </div>
                    </td>
                    <td>${escapeHtml(p.code) || '—'}</td>
                    <td>${escapeHtml(catName)}</td>
                    <td>${Storage.formatCurrency(p.purchasePrice)}</td>
                    <td>${Storage.formatCurrency(p.sellingPrice)}</td>
                    <td>
                        <span class="stock-badge ${stockStatus}">
                            ${p.currentStock ?? 0} ${stockLabels[stockStatus] ? '· ' + stockLabels[stockStatus] : ''}
                        </span>
                    </td>
                    <td>
                        <span class="status-badge ${p.status === 'active' ? 'active' : 'inactive'}">
                            ${p.status || 'active'}
                        </span>
                    </td>
                    <td>
                        <div class="action-btns">
                            <button class="btn btn-icon edit" title="Edit" onclick="Products.openModal(Products.getById('${p.id}'))">
                                <i class="fas fa-pen"></i>
                            </button>
                            <button class="btn btn-icon delete" title="Delete" onclick="Products.confirmDelete('${p.id}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    },

    updateMiniStats() {
        const products = this.getAll();
        const total = products.length;
        const low = products.filter(p => this.getStockStatus(p) === 'low').length;
        const out = products.filter(p => this.getStockStatus(p) === 'out').length;
        const expiry = products.filter(p => this.isExpiringSoon(p) || this.isExpired(p)).length;

        const el = (id, val) => {
            const e = document.getElementById(id);
            if (e) e.textContent = val;
        };
        el('prodStatTotal', total);
        el('prodStatLow', low);
        el('prodStatOut', out);
        el('prodStatExpiry', expiry);
    },

    seedFactoryProducts() {
        const catalog = [
            { name: 'ছোট মধু বন', category: 'Bun', unit: 'pcs' },
            { name: 'হাফ পাউন্ড', category: 'Bread', unit: 'pcs' },
            { name: 'ফুল পাউন্ড', category: 'Bread', unit: 'pcs' },
            { name: 'বড় রুটি', category: 'Bread', unit: 'pcs' },
            { name: 'নান রুটি', category: 'Bread', unit: 'pcs' },
            { name: 'বাটার বন', category: 'Bun', unit: 'pcs' },
            { name: 'লতা রুটি', category: 'Bread', unit: 'pcs' },
            { name: 'চায়না বন', category: 'Bun', unit: 'pcs' },
            { name: 'মেঘরাজ বন', category: 'Bun', unit: 'pcs' },
            { name: 'বড় মধু বন', category: 'Bun', unit: 'pcs' },
            { name: 'টপ কেক', category: 'Cake', unit: 'pcs' },
            { name: 'নোনতা কেক', category: 'Cake', unit: 'pcs' },
            { name: 'রিং কেক', category: 'Cake', unit: 'pcs' },
            { name: 'কোনা কেক', category: 'Cake', unit: 'pcs' },
            { name: '১ পাউন্ড কেক', category: 'Cake', unit: 'pcs' },
            { name: 'মিল্ক কোয়াটার', category: 'Cake', unit: 'pcs' },
            { name: 'পাঁচ পাউন্ড কেক', category: 'Cake', unit: 'pcs' },
            { name: 'পাম কেক', category: 'Cake', unit: 'pcs' },
            { name: 'রিম বক্স', category: 'Cake', unit: 'box' },
            { name: 'বক্স কেক', category: 'Cake', unit: 'box' },
            { name: 'বিস্কুট (৩০)', category: 'Biscuit', unit: 'pack' },
            { name: 'বিস্কুট (৪০)', category: 'Biscuit', unit: 'pack' },
            { name: 'বিস্কুট (৪৫)', category: 'Biscuit', unit: 'pack' },
            { name: 'বিস্কুট (৫০)', category: 'Biscuit', unit: 'pack' },
            { name: 'বিস্কুট (১০০)', category: 'Biscuit', unit: 'pack' },
            { name: 'পার্ল টোস্ট', category: 'Toast', unit: 'pcs' },
            { name: 'স্পেশাল টোস্ট ৪০০গ্রাম', category: 'Toast', unit: 'pcs' },
            { name: 'পিংগার টোস্ট', category: 'Toast', unit: 'pcs' },
            { name: 'বাটার টোস্ট', category: 'Toast', unit: 'pcs' },
            { name: 'চিকুন টোস্ট', category: 'Toast', unit: 'pcs' },
            { name: 'লাঠি টোস্ট', category: 'Toast', unit: 'pcs' },
            { name: 'LOCAL BISCUIT', category: 'Biscuit', unit: 'pack' },
            { name: '১ নং জেলিস', category: 'Snacks', unit: 'pcs' },
            { name: '২ নং জেলিস', category: 'Snacks', unit: 'pcs' },
            { name: 'পেটিস', category: 'Snacks', unit: 'pcs' },
            { name: 'মিস্টি', category: 'Snacks', unit: 'pcs' },
            { name: 'ফুট/চানাচুর (৮০)', category: 'Snacks', unit: 'pack' },
            { name: 'চায়না টোস্ট (১০০)', category: 'Toast', unit: 'pack' },
            { name: 'চায়না টোস্ট (৫০)', category: 'Toast', unit: 'pack' },
            { name: 'LOCAL TOAST', category: 'Toast', unit: 'pcs' }
        ];

        let categories = Categories.getAll();
        const needed = ['Bread', 'Bun', 'Cake', 'Biscuit', 'Toast', 'Snacks'];
        let catChanged = false;
        needed.forEach(name => {
            if (!categories.find(c => c.name === name)) {
                categories.push({
                    id: Storage.generateId('cat'),
                    name,
                    status: 'active',
                    createdAt: new Date().toISOString()
                });
                catChanged = true;
            }
        });
        if (catChanged) Storage.saveData(Storage.KEYS.CATEGORIES, categories);

        const catMap = {};
        Categories.getAll().forEach(c => { catMap[c.name] = c.id; });

        let products = this.getAll();
        const existingNames = new Set(products.map(p => (p.name || '').trim().toLowerCase()));
        let added = 0;
        const now = new Date().toISOString();

        catalog.forEach((item, i) => {
            const key = item.name.trim().toLowerCase();
            if (existingNames.has(key)) {
                const idx = products.findIndex(p => (p.name || '').trim().toLowerCase() === key);
                if (idx !== -1) {
                    products[idx].isFactory = true;
                    products[idx].source = 'factory';
                }
                return;
            }
            products.push({
                id: Storage.generateId('prd'),
                name: item.name,
                code: 'FAC-' + String(i + 1).padStart(3, '0'),
                categoryId: catMap[item.category] || null,
                categoryName: item.category,
                unit: item.unit || 'pcs',
                purchasePrice: 0,
                sellingPrice: 0,
                currentStock: 0,
                minStock: 10,
                expiryDate: null,
                image: null,
                status: 'active',
                isFactory: true,
                source: 'factory',
                createdAt: now
            });
            existingNames.add(key);
            added++;
        });

        Storage.saveData(Storage.KEYS.PRODUCTS, products);
        if (added > 0) console.log('Factory catalog seeded:', added);
    }

};

window.Products = Products;
