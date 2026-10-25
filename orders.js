/* ========================================
   Orders Module — Live New Order
   ======================================== */

const Orders = {
    editingId: null,

    init() {
        this.bindEvents();
        this.render();
    },

    bindEvents() {
        document.getElementById('btnAddOrder')?.addEventListener('click', () => this.openModal());
        document.getElementById('orderForm')?.addEventListener('submit', (e) => this.save(e));
        document.getElementById('btnAddOrderItem')?.addEventListener('click', () => this.addItemRow());
        document.getElementById('orderPaid')?.addEventListener('input', () => this.calcTotals());
        document.getElementById('orderSearch')?.addEventListener('input', () => this.render());
        document.getElementById('orderStatusFilter')?.addEventListener('change', () => this.render());
        document.getElementById('orderDateFrom')?.addEventListener('change', () => this.render());
        document.getElementById('orderDateTo')?.addEventListener('change', () => this.render());
    },

    getAll() {
        return Storage.getArray(Storage.KEYS.ORDERS);
    },

    getById(id) {
        return this.getAll().find(o => o.id === id);
    },

    populateCustomers() {
        const sel = document.getElementById('orderCustomer');
        if (!sel) return;
        const cur = sel.value;
        const customers = Storage.getArray(Storage.KEYS.CUSTOMERS);
        sel.innerHTML = '<option value="">Walk-in / Guest</option>';
        customers.forEach(c => {
            sel.innerHTML += `<option value="${c.id}">${escapeHtml(c.name)}${c.mobile ? ' (' + escapeHtml(c.mobile) + ')' : ''}</option>`;
        });
        if (cur) sel.value = cur;
    },

    openModal(order = null) {
        this.editingId = order ? order.id : null;

        const form = document.getElementById('orderForm');
        if (!form) {
            showToast('Order form not found', 'error');
            return;
        }

        form.reset();
        document.getElementById('orderFormError')?.classList.remove('show');
        this.populateCustomers();

        document.getElementById('orderDate').value = order
            ? (order.date || '').split('T')[0]
            : Storage.getToday();
        document.getElementById('orderStatus').value = order ? (order.status || 'pending') : 'pending';
        document.getElementById('orderPaymentMethod').value = order ? (order.paymentMethod || 'Cash') : 'Cash';
        document.getElementById('orderPaid').value = order ? (order.paidAmount || 0) : 0;
        document.getElementById('orderNote').value = order ? (order.note || '') : '';
        if (order && order.customerId) {
            document.getElementById('orderCustomer').value = order.customerId;
        }

        const list = document.getElementById('orderItemsList');
        list.innerHTML = '';

        const products = (window.Products ? Products.getAll() : Storage.getArray(Storage.KEYS.PRODUCTS))
            .filter(p => p.status !== 'inactive');

        if (products.length === 0) {
            list.innerHTML = `<p style="color:var(--danger);padding:12px">No products found. Add products first from Products menu.</p>`;
        } else if (order && order.items && order.items.length) {
            order.items.forEach(item => this.addItemRow(item));
        } else {
            this.addItemRow();
        }

        this.calcTotals();
        const title = document.getElementById('orderModalTitle');
        if (title) title.textContent = order ? 'Edit Order' : 'New Order';

        document.getElementById('orderModal').classList.add('active');
        setTimeout(() => {
            const first = document.querySelector('#orderItemsList .ord-product');
            if (first) first.focus();
        }, 100);
    },

    productOptions(selectedId) {
        const products = (window.Products ? Products.getAll() : Storage.getArray(Storage.KEYS.PRODUCTS))
            .filter(p => p.status !== 'inactive');
        let opts = '<option value="">Select Product</option>';
        products.forEach(p => {
            const stock = Number(p.currentStock) || 0;
            const sel = selectedId === p.id ? 'selected' : '';
            opts += `<option value="${p.id}" data-price="${p.sellingPrice || 0}" data-purchase="${p.purchasePrice || 0}" data-stock="${stock}" ${sel}>${escapeHtml(p.name)} (Stock: ${stock})</option>`;
        });
        return opts;
    },

    addItemRow(data = null) {
        const list = document.getElementById('orderItemsList');
        if (!list) return;

        const row = document.createElement('div');
        row.className = 'purchase-item-row';
        row.innerHTML = `
            <div class="form-group">
                <label>Product</label>
                <select class="ord-product" required>${this.productOptions(data ? data.productId : null)}</select>
            </div>
            <div class="form-group">
                <label>Qty</label>
                <input type="number" class="ord-qty" min="0.01" step="0.01" value="${data ? data.qty : 1}" required>
            </div>
            <div class="form-group">
                <label>Price</label>
                <input type="number" class="ord-price" min="0" step="0.01" value="${data ? data.price : 0}" required>
            </div>
            <div class="form-group">
                <label>Total</label>
                <input type="number" class="ord-total" readonly value="0">
            </div>
            <button type="button" class="btn-remove-item" title="Remove"><i class="fas fa-times"></i></button>
        `;
        list.appendChild(row);

        const prod = row.querySelector('.ord-product');
        const qty = row.querySelector('.ord-qty');
        const price = row.querySelector('.ord-price');
        const total = row.querySelector('.ord-total');

        if (data && data.productId) {
            prod.value = data.productId;
            if (!price.value || price.value === '0') {
                const o = prod.selectedOptions[0];
                if (o?.dataset.price) price.value = o.dataset.price;
            }
        }

        const recalc = () => {
            const q = parseFloat(qty.value) || 0;
            const p = parseFloat(price.value) || 0;
            total.value = (q * p).toFixed(2);
            this.calcTotals();
        };

        prod.addEventListener('change', () => {
            const o = prod.selectedOptions[0];
            if (o?.dataset.price) price.value = o.dataset.price;
            recalc();
        });
        qty.addEventListener('input', recalc);
        price.addEventListener('input', recalc);
        row.querySelector('.btn-remove-item').addEventListener('click', () => {
            row.remove();
            this.calcTotals();
        });

        // Auto-fill price for new row if product preselected
        if (!data) {
            // leave until user selects
        } else {
            recalc();
        }
        recalc();
    },

    calcTotals() {
        let total = 0;
        document.querySelectorAll('#orderItemsList .ord-total').forEach(el => {
            total += parseFloat(el.value) || 0;
        });
        const totalEl = document.getElementById('orderTotal');
        const paidEl = document.getElementById('orderPaid');
        const dueEl = document.getElementById('orderDue');
        if (totalEl) totalEl.value = total.toFixed(2);
        const paid = parseFloat(paidEl?.value) || 0;
        if (dueEl) dueEl.value = Math.max(0, total - paid).toFixed(2);
    },

    collectItems() {
        const items = [];
        document.querySelectorAll('#orderItemsList .purchase-item-row').forEach(row => {
            const prod = row.querySelector('.ord-product');
            const productId = prod?.value;
            const qty = parseFloat(row.querySelector('.ord-qty')?.value) || 0;
            const price = parseFloat(row.querySelector('.ord-price')?.value) || 0;
            if (!productId || qty <= 0) return;

            const opt = prod.selectedOptions[0];
            const p = window.Products ? Products.getById(productId) : null;
            items.push({
                productId,
                name: p ? p.name : (opt?.textContent?.split(' (Stock')[0] || 'Product'),
                qty,
                price,
                purchasePrice: parseFloat(opt?.dataset.purchase) || (p ? p.purchasePrice : 0) || 0,
                total: qty * price
            });
        });
        return items;
    },

    generateOrderId() {
        const orders = this.getAll();
        const today = Storage.getToday().replace(/-/g, '');
        const n = orders.filter(o => o.orderId && o.orderId.includes(today)).length + 1;
        return `ORD-${today}-${String(n).padStart(3, '0')}`;
    },

    save(e) {
        e.preventDefault();
        const error = document.getElementById('orderFormError');
        const showErr = (msg) => {
            if (error) {
                error.textContent = msg;
                error.classList.add('show');
            }
            showToast(msg, 'error');
        };

        const items = this.collectItems();
        if (items.length === 0) {
            showErr('Add at least one product with quantity');
            return;
        }

        const customerId = document.getElementById('orderCustomer')?.value || '';
        let customerName = 'Walk-in';
        if (customerId) {
            const c = Storage.getArray(Storage.KEYS.CUSTOMERS).find(x => x.id === customerId);
            if (c) customerName = c.name;
        }

        const total = items.reduce((s, i) => s + i.total, 0);
        const paid = parseFloat(document.getElementById('orderPaid')?.value) || 0;
        const due = Math.max(0, total - paid);
        const dateVal = document.getElementById('orderDate')?.value || Storage.getToday();
        const dateISO = dateVal.includes('T') ? dateVal : dateVal + 'T' + new Date().toTimeString().slice(0, 8);
        const status = document.getElementById('orderStatus')?.value || 'pending';
        const paymentMethod = document.getElementById('orderPaymentMethod')?.value || 'Cash';
        const note = document.getElementById('orderNote')?.value.trim() || '';

        let orders = this.getAll();
        const wasDelivered = this.editingId
            ? (this.getById(this.editingId)?.status === 'delivered')
            : false;

        if (this.editingId) {
            const idx = orders.findIndex(o => o.id === this.editingId);
            if (idx === -1) {
                showErr('Order not found');
                return;
            }
            const prev = orders[idx];
            orders[idx] = {
                ...prev,
                customerId: customerId || null,
                customerName,
                date: dateISO,
                items,
                total,
                paidAmount: paid,
                dueAmount: due,
                paymentMethod,
                status,
                note,
                updatedAt: new Date().toISOString()
            };

            if (status === 'delivered' && !wasDelivered) {
                this.onDelivered(orders[idx]);
            }
            Storage.saveData(Storage.KEYS.ORDERS, orders);
            showToast('Order updated ✓', 'success');
        } else {
            const orderId = this.generateOrderId();
            const newOrder = {
                id: Storage.generateId('ord'),
                orderId,
                customerId: customerId || null,
                customerName,
                date: dateISO,
                items,
                total,
                paidAmount: paid,
                dueAmount: due,
                paymentMethod,
                status,
                note,
                createdAt: new Date().toISOString()
            };
            orders.push(newOrder);
            Storage.saveData(Storage.KEYS.ORDERS, orders);

            if (status === 'delivered') {
                this.onDelivered(newOrder);
            }

            // Update customer totals if linked
            if (customerId && due > 0) {
                this.updateCustomerDue(customerId, due, paid, total);
            }

            showToast(`Order ${orderId} created ✓`, 'success');
        }

        document.getElementById('orderModal')?.classList.remove('active');
        this.render();
        this.refreshRelated();
    },

    updateCustomerDue(customerId, dueAdd, paidAdd, totalAdd) {
        let customers = Storage.getArray(Storage.KEYS.CUSTOMERS);
        const idx = customers.findIndex(c => c.id === customerId);
        if (idx === -1) return;
        customers[idx].totalPurchase = (Number(customers[idx].totalPurchase) || 0) + totalAdd;
        customers[idx].paid = (Number(customers[idx].paid) || 0) + paidAdd;
        customers[idx].due = (Number(customers[idx].due) || 0) + dueAdd;
        Storage.saveData(Storage.KEYS.CUSTOMERS, customers);
        if (window.Customers) Customers.render();
    },

    onDelivered(order) {
        // 1) Deduct stock
        this.deductStock(order.items || [], order.orderId);

        // 2) Create sale record so Dashboard / Reports show it
        const sales = Storage.getArray(Storage.KEYS.SALES);
        const already = sales.some(s => s.orderRef === order.orderId);
        if (!already) {
            const invNo = 'INV-' + (order.orderId || '').replace('ORD-', '') || Storage.generateId('inv');
            sales.push({
                id: Storage.generateId('sale'),
                invoiceNo: invNo,
                orderRef: order.orderId,
                customerId: order.customerId || null,
                customerName: order.customerName || 'Walk-in',
                date: order.date || new Date().toISOString(),
                items: (order.items || []).map(i => ({
                    productId: i.productId,
                    name: i.name,
                    qty: i.qty,
                    price: i.price,
                    purchasePrice: i.purchasePrice || 0,
                    total: i.total
                })),
                subtotal: order.total,
                discount: 0,
                grandTotal: order.total,
                paidAmount: order.paidAmount || 0,
                dueAmount: order.dueAmount || 0,
                paymentMethod: order.paymentMethod || 'Cash',
                createdAt: new Date().toISOString()
            });
            Storage.saveData(Storage.KEYS.SALES, sales);
        }
    },

    deductStock(items, ref) {
        let products = window.Products ? Products.getAll() : Storage.getArray(Storage.KEYS.PRODUCTS);
        let movements = Storage.getArray(Storage.KEYS.STOCK_MOVEMENTS);
        const now = new Date().toISOString();

        items.forEach(item => {
            const idx = products.findIndex(p => p.id === item.productId);
            if (idx !== -1) {
                products[idx].currentStock = Math.max(0, (Number(products[idx].currentStock) || 0) - (item.qty || 0));
                products[idx].updatedAt = now;
            }
            movements.push({
                id: Storage.generateId('mov'),
                productId: item.productId,
                productName: item.name,
                type: 'out',
                quantity: item.qty,
                reason: 'Order Delivered',
                reference: ref,
                date: now
            });
        });

        Storage.saveData(Storage.KEYS.PRODUCTS, products);
        Storage.saveData(Storage.KEYS.STOCK_MOVEMENTS, movements);
    },

    updateStatus(id, status) {
        let orders = this.getAll();
        const idx = orders.findIndex(o => o.id === id);
        if (idx === -1) return;

        const was = orders[idx].status;
        orders[idx].status = status;
        orders[idx].updatedAt = new Date().toISOString();

        if (status === 'delivered' && was !== 'delivered') {
            this.onDelivered(orders[idx]);
        }

        Storage.saveData(Storage.KEYS.ORDERS, orders);
        this.render();
        this.refreshRelated();
        showToast('Status → ' + status, 'success');
    },

    confirmDelete(id) {
        const o = this.getById(id);
        if (!o) return;
        document.getElementById('confirmMessage').textContent = `Delete order ${o.orderId}?`;
        Categories.deleteCallback = () => {
            Storage.saveData(Storage.KEYS.ORDERS, this.getAll().filter(x => x.id !== id));
            showToast('Order deleted', 'success');
            this.render();
            this.refreshRelated();
        };
        document.getElementById('confirmModal').classList.add('active');
    },

    refreshRelated() {
        if (window.Dashboard) Dashboard.update();
        if (window.Products) Products.render();
        if (window.Stock) Stock.render();
        if (window.POS) POS.renderProducts();
        if (window.updateNotifications) updateNotifications();
    },

    statusClass(status) {
        const map = {
            pending: 'due',
            confirmed: 'pending',
            processing: 'pending',
            ready: 'active',
            delivered: 'paid',
            cancelled: 'inactive'
        };
        return map[status] || 'pending';
    },

    render() {
        const tbody = document.getElementById('ordersTableBody');
        if (!tbody) return;

        const search = (document.getElementById('orderSearch')?.value || '').toLowerCase();
        const statusF = document.getElementById('orderStatusFilter')?.value || '';
        const from = document.getElementById('orderDateFrom')?.value || '';
        const to = document.getElementById('orderDateTo')?.value || '';

        let orders = this.getAll();

        if (search) {
            orders = orders.filter(o =>
                (o.orderId || '').toLowerCase().includes(search) ||
                (o.customerName || '').toLowerCase().includes(search)
            );
        }
        if (statusF) orders = orders.filter(o => o.status === statusF);
        if (from) orders = orders.filter(o => (o.date || '') >= from);
        if (to) orders = orders.filter(o => (o.date || '').split('T')[0] <= to);

        const all = this.getAll();
        const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
        set('ordStatTotal', all.length);
        set('ordStatPending', all.filter(o => o.status === 'pending').length);
        set('ordStatProcessing', all.filter(o => ['processing', 'confirmed', 'ready'].includes(o.status)).length);
        set('ordStatDelivered', all.filter(o => o.status === 'delivered').length);

        if (!orders.length) {
            tbody.innerHTML = `
                <tr class="empty-row">
                    <td colspan="8" class="empty-state">
                        <i class="fas fa-shopping-bag"></i>
                        <p>No orders yet. Click <strong>New Order</strong> to create one.</p>
                    </td>
                </tr>`;
            return;
        }

        orders.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

        tbody.innerHTML = orders.map(o => {
            const d = o.date
                ? new Date(o.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                : '—';
            const statuses = ['pending', 'confirmed', 'processing', 'ready', 'delivered', 'cancelled'];
            return `<tr>
                <td><strong>${escapeHtml(o.orderId || o.id)}</strong></td>
                <td>${escapeHtml(o.customerName || 'Walk-in')}</td>
                <td>${d}</td>
                <td>${(o.items || []).length}</td>
                <td>${Storage.formatCurrency(o.total)}</td>
                <td>${escapeHtml(o.paymentMethod || '—')}</td>
                <td>
                    <select class="order-status-select status-badge ${this.statusClass(o.status)}"
                        onchange="Orders.updateStatus('${o.id}', this.value)"
                        style="padding:5px 8px;border-radius:8px;border:1px solid var(--border);font-size:0.78rem;background:var(--bg-body);color:var(--text-primary);cursor:pointer">
                        ${statuses.map(s => `<option value="${s}" ${o.status === s ? 'selected' : ''}>${s}</option>`).join('')}
                    </select>
                </td>
                <td>
                    <div class="action-btns">
                        <button class="btn btn-icon edit" title="Edit" onclick="Orders.openModal(Orders.getById('${o.id}'))">
                            <i class="fas fa-pen"></i>
                        </button>
                        <button class="btn btn-icon delete" title="Delete" onclick="Orders.confirmDelete('${o.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>`;
        }).join('');
    }
};

window.Orders = Orders;
