/* ========================================
   Purchases Module
   ======================================== */

const Purchases = {
    itemCounter: 0,

    init() {
        this.bindEvents();
        this.render();
    },

    bindEvents() {
        const addBtn = document.getElementById('btnAddPurchase');
        if (addBtn) addBtn.addEventListener('click', () => this.openModal());

        const form = document.getElementById('purchaseForm');
        if (form) form.addEventListener('submit', (e) => this.save(e));

        const addItemBtn = document.getElementById('btnAddPurchaseItem');
        if (addItemBtn) addItemBtn.addEventListener('click', () => this.addItemRow());

        const paidInput = document.getElementById('purchasePaid');
        if (paidInput) paidInput.addEventListener('input', () => this.calcTotals());

        const search = document.getElementById('purchaseSearch');
        if (search) search.addEventListener('input', () => this.render());

        const dateFrom = document.getElementById('purchaseDateFrom');
        const dateTo = document.getElementById('purchaseDateTo');
        if (dateFrom) dateFrom.addEventListener('change', () => this.render());
        if (dateTo) dateTo.addEventListener('change', () => this.render());
    },

    getAll() {
        return Storage.getArray(Storage.KEYS.PURCHASES);
    },

    getById(id) {
        return this.getAll().find(p => p.id === id);
    },

    populateSuppliers() {
        const select = document.getElementById('purchaseSupplier');
        if (!select) return;
        const current = select.value;
        const suppliers = Suppliers.getAll();
        select.innerHTML = '<option value="">Select Supplier</option>';
        suppliers.forEach(s => {
            select.innerHTML += `<option value="${s.id}">${escapeHtml(s.name)}</option>`;
        });
        if (current) select.value = current;
    },

    openModal() {
        this.itemCounter = 0;
        document.getElementById('purchaseForm').reset();
        document.getElementById('purchaseFormError').classList.remove('show');
        document.getElementById('purchaseId').value = '';
        document.getElementById('purchaseDate').value = Storage.getToday();
        document.getElementById('purchaseTotal').value = 0;
        document.getElementById('purchasePaid').value = 0;
        document.getElementById('purchaseDue').value = 0;

        this.populateSuppliers();
        document.getElementById('purchaseItemsList').innerHTML = '';
        this.addItemRow();

        document.getElementById('purchaseModal').classList.add('active');
    },

    addItemRow(data = null) {
        const list = document.getElementById('purchaseItemsList');
        if (!list) return;

        const idx = this.itemCounter++;
        const products = Products.getAll().filter(p => p.status === 'active');

        let productOptions = '<option value="">Select Product</option>';
        products.forEach(p => {
            productOptions += `<option value="${p.id}" data-price="${p.purchasePrice || 0}">${escapeHtml(p.name)}</option>`;
        });

        const row = document.createElement('div');
        row.className = 'purchase-item-row';
        row.dataset.idx = idx;
        row.innerHTML = `
            <div class="form-group">
                <label>Product</label>
                <select class="pur-product" required>
                    ${productOptions}
                </select>
            </div>
            <div class="form-group">
                <label>Qty</label>
                <input type="number" class="pur-qty" min="0.01" step="0.01" value="${data ? data.qty : 1}" required>
            </div>
            <div class="form-group">
                <label>Price</label>
                <input type="number" class="pur-price" min="0" step="0.01" value="${data ? data.price : 0}" required>
            </div>
            <div class="form-group">
                <label>Total</label>
                <input type="number" class="pur-total" readonly value="0">
            </div>
            <button type="button" class="btn-remove-item" title="Remove">
                <i class="fas fa-times"></i>
            </button>
        `;

        list.appendChild(row);

        const productSelect = row.querySelector('.pur-product');
        const qtyInput = row.querySelector('.pur-qty');
        const priceInput = row.querySelector('.pur-price');
        const totalInput = row.querySelector('.pur-total');
        const removeBtn = row.querySelector('.btn-remove-item');

        if (data && data.productId) {
            productSelect.value = data.productId;
        }

        const recalc = () => {
            const qty = parseFloat(qtyInput.value) || 0;
            const price = parseFloat(priceInput.value) || 0;
            totalInput.value = (qty * price).toFixed(2);
            this.calcTotals();
        };

        productSelect.addEventListener('change', () => {
            const opt = productSelect.selectedOptions[0];
            if (opt && opt.dataset.price) {
                priceInput.value = opt.dataset.price;
            }
            recalc();
        });

        qtyInput.addEventListener('input', recalc);
        priceInput.addEventListener('input', recalc);
        removeBtn.addEventListener('click', () => {
            row.remove();
            this.calcTotals();
        });

        recalc();
    },

    calcTotals() {
        let total = 0;
        document.querySelectorAll('#purchaseItemsList .pur-total').forEach(el => {
            total += parseFloat(el.value) || 0;
        });
        document.getElementById('purchaseTotal').value = total.toFixed(2);

        let paid = parseFloat(document.getElementById('purchasePaid').value) || 0;
        if (paid < 0) paid = 0;
        const due = Math.max(0, total - paid);
        document.getElementById('purchaseDue').value = due.toFixed(2);
    },

    collectItems() {
        const items = [];
        document.querySelectorAll('#purchaseItemsList .purchase-item-row').forEach(row => {
            const productId = row.querySelector('.pur-product').value;
            const qty = parseFloat(row.querySelector('.pur-qty').value) || 0;
            const price = parseFloat(row.querySelector('.pur-price').value) || 0;
            if (!productId || qty <= 0) return;

            const product = Products.getById(productId);
            items.push({
                productId,
                name: product ? product.name : 'Unknown',
                qty,
                price,
                total: qty * price
            });
        });
        return items;
    },

    generateRefNo() {
        const purchases = this.getAll();
        const today = Storage.getToday().replace(/-/g, '');
        const count = purchases.filter(p => p.refNo && p.refNo.includes(today)).length + 1;
        return `PUR-${today}-${String(count).padStart(3, '0')}`;
    },

    save(e) {
        e.preventDefault();
        const error = document.getElementById('purchaseFormError');

        const supplierId = document.getElementById('purchaseSupplier').value;
        const date = document.getElementById('purchaseDate').value || Storage.getToday();
        const paid = parseFloat(document.getElementById('purchasePaid').value) || 0;
        const paymentMethod = document.getElementById('purchasePaymentMethod').value;
        const note = document.getElementById('purchaseNote').value.trim();
        const items = this.collectItems();

        if (!supplierId) {
            error.textContent = 'Please select a supplier';
            error.classList.add('show');
            return;
        }
        if (items.length === 0) {
            error.textContent = 'Add at least one product';
            error.classList.add('show');
            return;
        }

        const totalAmount = items.reduce((s, i) => s + i.total, 0);
        const dueAmount = Math.max(0, totalAmount - paid);
        const supplier = Suppliers.getById(supplierId);
        const now = new Date().toISOString();
        const dateISO = date.includes('T') ? date : date + 'T' + new Date().toTimeString().split(' ')[0];

        const purchase = {
            id: Storage.generateId('pur'),
            refNo: this.generateRefNo(),
            supplierId,
            supplierName: supplier ? supplier.name : '',
            date: dateISO,
            items,
            totalAmount,
            paidAmount: paid,
            dueAmount,
            paymentMethod,
            note,
            createdAt: now
        };

        // Save purchase
        const purchases = this.getAll();
        purchases.push(purchase);
        Storage.saveData(Storage.KEYS.PURCHASES, purchases);

        // Increase product stock
        let products = Products.getAll();
        items.forEach(item => {
            const idx = products.findIndex(p => p.id === item.productId);
            if (idx !== -1) {
                products[idx].currentStock = (Number(products[idx].currentStock) || 0) + item.qty;
                // Optionally update purchase price to latest
                products[idx].purchasePrice = item.price;
                products[idx].updatedAt = now;
            }
        });
        Storage.saveData(Storage.KEYS.PRODUCTS, products);

        // Stock movements
        let movements = Storage.getArray(Storage.KEYS.STOCK_MOVEMENTS);
        items.forEach(item => {
            movements.push({
                id: Storage.generateId('mov'),
                productId: item.productId,
                productName: item.name,
                type: 'in',
                quantity: item.qty,
                reason: 'Purchase',
                reference: purchase.refNo,
                date: now
            });
        });
        Storage.saveData(Storage.KEYS.STOCK_MOVEMENTS, movements);

        // Update supplier totals
        let suppliers = Suppliers.getAll();
        const sIdx = suppliers.findIndex(s => s.id === supplierId);
        if (sIdx !== -1) {
            suppliers[sIdx].totalPurchase = (Number(suppliers[sIdx].totalPurchase) || 0) + totalAmount;
            suppliers[sIdx].paid = (Number(suppliers[sIdx].paid) || 0) + paid;
            suppliers[sIdx].due = (Number(suppliers[sIdx].due) || 0) + dueAmount;
            Storage.saveData(Storage.KEYS.SUPPLIERS, suppliers);
        }

        document.getElementById('purchaseModal').classList.remove('active');
        showToast('Purchase saved. Stock updated!', 'success');

        this.render();
        if (window.Products) Products.render();
        if (window.Suppliers) Suppliers.render();
        if (window.Dashboard) Dashboard.update();
        if (window.POS) POS.renderProducts();
    },

    confirmDelete(id) {
        const purchase = this.getById(id);
        if (!purchase) return;

        const msg = document.getElementById('confirmMessage');
        msg.textContent = `Delete purchase ${purchase.refNo}? Stock will be reversed.`;

        Categories.deleteCallback = () => {
            // Reverse stock
            let products = Products.getAll();
            (purchase.items || []).forEach(item => {
                const idx = products.findIndex(p => p.id === item.productId);
                if (idx !== -1) {
                    products[idx].currentStock = Math.max(0, (Number(products[idx].currentStock) || 0) - item.qty);
                }
            });
            Storage.saveData(Storage.KEYS.PRODUCTS, products);

            // Reverse supplier
            if (purchase.supplierId) {
                let suppliers = Suppliers.getAll();
                const sIdx = suppliers.findIndex(s => s.id === purchase.supplierId);
                if (sIdx !== -1) {
                    suppliers[sIdx].totalPurchase = Math.max(0, (Number(suppliers[sIdx].totalPurchase) || 0) - (purchase.totalAmount || 0));
                    suppliers[sIdx].paid = Math.max(0, (Number(suppliers[sIdx].paid) || 0) - (purchase.paidAmount || 0));
                    suppliers[sIdx].due = Math.max(0, (Number(suppliers[sIdx].due) || 0) - (purchase.dueAmount || 0));
                    Storage.saveData(Storage.KEYS.SUPPLIERS, suppliers);
                }
            }

            // Stock movement
            let movements = Storage.getArray(Storage.KEYS.STOCK_MOVEMENTS);
            (purchase.items || []).forEach(item => {
                movements.push({
                    id: Storage.generateId('mov'),
                    productId: item.productId,
                    productName: item.name,
                    type: 'out',
                    quantity: item.qty,
                    reason: 'Purchase Deleted',
                    reference: purchase.refNo,
                    date: new Date().toISOString()
                });
            });
            Storage.saveData(Storage.KEYS.STOCK_MOVEMENTS, movements);

            let purchases = this.getAll().filter(p => p.id !== id);
            Storage.saveData(Storage.KEYS.PURCHASES, purchases);

            showToast('Purchase deleted & stock reversed', 'success');
            this.render();
            if (window.Products) Products.render();
            if (window.Suppliers) Suppliers.render();
            if (window.Dashboard) Dashboard.update();
            if (window.POS) POS.renderProducts();
        };

        document.getElementById('confirmModal').classList.add('active');
    },

    view(id) {
        const purchase = this.getById(id);
        if (!purchase) return;

        const content = document.getElementById('purchaseViewContent');
        const dateStr = purchase.date
            ? new Date(purchase.date).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
            : '—';

        content.innerHTML = `
            <div class="invoice-paper">
                <div class="invoice-meta">
                    <div>
                        <div><strong>Ref:</strong> ${escapeHtml(purchase.refNo)}</div>
                        <div><strong>Date:</strong> ${dateStr}</div>
                    </div>
                    <div style="text-align:right">
                        <div><strong>Supplier:</strong> ${escapeHtml(purchase.supplierName)}</div>
                        <div><strong>Payment:</strong> ${escapeHtml(purchase.paymentMethod || '—')}</div>
                    </div>
                </div>
                <table class="invoice-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Product</th>
                            <th class="text-right">Qty</th>
                            <th class="text-right">Price</th>
                            <th class="text-right">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${(purchase.items || []).map((item, i) => `
                            <tr>
                                <td>${i + 1}</td>
                                <td>${escapeHtml(item.name)}</td>
                                <td class="text-right">${item.qty}</td>
                                <td class="text-right">${Storage.formatCurrency(item.price)}</td>
                                <td class="text-right">${Storage.formatCurrency(item.total)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                <div class="invoice-totals">
                    <div class="row grand"><span>Total</span><span>${Storage.formatCurrency(purchase.totalAmount)}</span></div>
                    <div class="row"><span>Paid</span><span>${Storage.formatCurrency(purchase.paidAmount)}</span></div>
                    <div class="row"><span>Due</span><span>${Storage.formatCurrency(purchase.dueAmount)}</span></div>
                </div>
                ${purchase.note ? `<p style="margin-top:12px;color:#666"><strong>Note:</strong> ${escapeHtml(purchase.note)}</p>` : ''}
            </div>
        `;
        document.getElementById('purchaseViewModal').classList.add('active');
    },

    render() {
        const tbody = document.getElementById('purchasesTableBody');
        if (!tbody) return;

        const search = (document.getElementById('purchaseSearch')?.value || '').toLowerCase();
        const dateFrom = document.getElementById('purchaseDateFrom')?.value || '';
        const dateTo = document.getElementById('purchaseDateTo')?.value || '';

        let purchases = this.getAll();

        if (search) {
            purchases = purchases.filter(p =>
                (p.refNo || '').toLowerCase().includes(search) ||
                (p.supplierName || '').toLowerCase().includes(search)
            );
        }
        if (dateFrom) {
            purchases = purchases.filter(p => (p.date || '') >= dateFrom);
        }
        if (dateTo) {
            purchases = purchases.filter(p => (p.date || '').split('T')[0] <= dateTo);
        }

        // Mini stats
        const all = this.getAll();
        const el = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
        el('purStatTotal', all.length);
        el('purStatAmount', Storage.formatCurrency(all.reduce((s, p) => s + (p.totalAmount || 0), 0)));
        el('purStatDue', Storage.formatCurrency(all.reduce((s, p) => s + (p.dueAmount || 0), 0)));

        if (purchases.length === 0) {
            tbody.innerHTML = `
                <tr class="empty-row">
                    <td colspan="8" class="empty-state">
                        <i class="fas fa-truck-loading"></i>
                        <p data-i18n="noPurchases">No purchases yet</p>
                    </td>
                </tr>
            `;
            return;
        }

        purchases.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

        tbody.innerHTML = purchases.map(p => {
            const dateStr = p.date
                ? new Date(p.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                : '—';
            const itemCount = (p.items || []).length;

            return `
                <tr>
                    <td><strong>${escapeHtml(p.refNo)}</strong></td>
                    <td>${escapeHtml(p.supplierName) || '—'}</td>
                    <td>${dateStr}</td>
                    <td>${itemCount} item(s)</td>
                    <td>${Storage.formatCurrency(p.totalAmount)}</td>
                    <td>${Storage.formatCurrency(p.paidAmount)}</td>
                    <td><span class="${(p.dueAmount || 0) > 0 ? 'text-danger' : ''}">${Storage.formatCurrency(p.dueAmount)}</span></td>
                    <td>
                        <div class="action-btns">
                            <button class="btn btn-icon edit" title="View" onclick="Purchases.view('${p.id}')">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn btn-icon delete" title="Delete" onclick="Purchases.confirmDelete('${p.id}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }
};

window.Purchases = Purchases;
