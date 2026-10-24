/* ========================================
   Orders Module
   ======================================== */

const Orders = {
    itemCounter: 0,
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

    getAll() { return Storage.getArray(Storage.KEYS.ORDERS); },
    getById(id) { return this.getAll().find(o => o.id === id); },

    populateCustomers() {
        const sel = document.getElementById('orderCustomer');
        if (!sel) return;
        const cur = sel.value;
        const customers = Storage.getArray(Storage.KEYS.CUSTOMERS);
        sel.innerHTML = '<option value="">Walk-in</option>';
        customers.forEach(c => {
            sel.innerHTML += `<option value="${c.id}">${escapeHtml(c.name)}</option>`;
        });
        if (cur) sel.value = cur;
    },

    openModal(order = null) {
        this.editingId = order ? order.id : null;
        this.itemCounter = 0;
        document.getElementById('orderForm').reset();
        document.getElementById('orderFormError').classList.remove('show');
        this.populateCustomers();
        document.getElementById('orderDate').value = order
            ? (order.date || '').split('T')[0]
            : Storage.getToday();
        document.getElementById('orderStatus').value = order ? order.status : 'pending';
        document.getElementById('orderPaymentMethod').value = order ? (order.paymentMethod || 'Cash') : 'Cash';
        document.getElementById('orderPaid').value = order ? (order.paidAmount || 0) : 0;
        document.getElementById('orderNote').value = order ? (order.note || '') : '';
        if (order && order.customerId) document.getElementById('orderCustomer').value = order.customerId;

        const list = document.getElementById('orderItemsList');
        list.innerHTML = '';
        if (order && order.items && order.items.length) {
            order.items.forEach(item => this.addItemRow(item));
        } else {
            this.addItemRow();
        }
        this.calcTotals();
        document.getElementById('orderModalTitle').textContent = order ? 'Edit Order' : 'New Order';
        document.getElementById('orderModal').classList.add('active');
    },

    addItemRow(data = null) {
        const list = document.getElementById('orderItemsList');
        const products = Products.getAll().filter(p => p.status === 'active');
        let opts = '<option value="">Select Product</option>';
        products.forEach(p => {
            opts += `<option value="${p.id}" data-price="${p.sellingPrice || 0}">${escapeHtml(p.name)}</option>`;
        });
        const row = document.createElement('div');
        row.className = 'purchase-item-row';
        row.innerHTML = `
            <div class="form-group"><label>Product</label><select class="ord-product" required>${opts}</select></div>
            <div class="form-group"><label>Qty</label><input type="number" class="ord-qty" min="0.01" step="0.01" value="${data ? data.qty : 1}" required></div>
            <div class="form-group"><label>Price</label><input type="number" class="ord-price" min="0" step="0.01" value="${data ? data.price : 0}" required></div>
            <div class="form-group"><label>Total</label><input type="number" class="ord-total" readonly value="0"></div>
            <button type="button" class="btn-remove-item"><i class="fas fa-times"></i></button>
        `;
        list.appendChild(row);
        const prod = row.querySelector('.ord-product');
        const qty = row.querySelector('.ord-qty');
        const price = row.querySelector('.ord-price');
        const total = row.querySelector('.ord-total');
        if (data && data.productId) prod.value = data.productId;
        const recalc = () => {
            total.value = ((parseFloat(qty.value) || 0) * (parseFloat(price.value) || 0)).toFixed(2);
            this.calcTotals();
        };
        prod.addEventListener('change', () => {
            const o = prod.selectedOptions[0];
            if (o?.dataset.price) price.value = o.dataset.price;
            recalc();
        });
        qty.addEventListener('input', recalc);
        price.addEventListener('input', recalc);
        row.querySelector('.btn-remove-item').addEventListener('click', () => { row.remove(); this.calcTotals(); });
        recalc();
    },

    calcTotals() {
        let total = 0;
        document.querySelectorAll('#orderItemsList .ord-total').forEach(el => { total += parseFloat(el.value) || 0; });
        document.getElementById('orderTotal').value = total.toFixed(2);
        const paid = parseFloat(document.getElementById('orderPaid').value) || 0;
        document.getElementById('orderDue').value = Math.max(0, total - paid).toFixed(2);
    },

    collectItems() {
        const items = [];
        document.querySelectorAll('#orderItemsList .purchase-item-row').forEach(row => {
            const productId = row.querySelector('.ord-product').value;
            const qty = parseFloat(row.querySelector('.ord-qty').value) || 0;
            const price = parseFloat(row.querySelector('.ord-price').value) || 0;
            if (!productId || qty <= 0) return;
            const p = Products.getById(productId);
            items.push({ productId, name: p ? p.name : 'Unknown', qty, price, total: qty * price });
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
        const items = this.collectItems();
        if (items.length === 0) {
            error.textContent = 'Add at least one product';
            error.classList.add('show');
            return;
        }

        const customerId = document.getElementById('orderCustomer').value;
        let customerName = 'Walk-in';
        if (customerId) {
            const c = Storage.getArray(Storage.KEYS.CUSTOMERS).find(x => x.id === customerId);
            if (c) customerName = c.name;
        }

        const total = items.reduce((s, i) => s + i.total, 0);
        const paid = parseFloat(document.getElementById('orderPaid').value) || 0;
        const due = Math.max(0, total - paid);
        const dateVal = document.getElementById('orderDate').value || Storage.getToday();
        const dateISO = dateVal.includes('T') ? dateVal : dateVal + 'T12:00:00';
        const status = document.getElementById('orderStatus').value;

        let orders = this.getAll();
        const wasDelivered = this.editingId ? (this.getById(this.editingId)?.status === 'delivered') : false;

        const data = {
            customerId: customerId || null,
            customerName,
            date: dateISO,
            items,
            total,
            paidAmount: paid,
            dueAmount: due,
            paymentMethod: document.getElementById('orderPaymentMethod').value,
            status,
            note: document.getElementById('orderNote').value.trim(),
            updatedAt: new Date().toISOString()
        };

        if (this.editingId) {
            const idx = orders.findIndex(o => o.id === this.editingId);
            if (idx !== -1) {
                // If newly delivered, reduce stock
                if (status === 'delivered' && !wasDelivered) {
                    this.deductStock(items, orders[idx].orderId);
                }
                orders[idx] = { ...orders[idx], ...data };
            }
            showToast('Order updated', 'success');
        } else {
            const orderId = this.generateOrderId();
            orders.push({
                id: Storage.generateId('ord'),
                orderId,
                ...data,
                createdAt: new Date().toISOString()
            });
            if (status === 'delivered') this.deductStock(items, orderId);
            showToast('Order created', 'success');
        }

        Storage.saveData(Storage.KEYS.ORDERS, orders);
        document.getElementById('orderModal').classList.remove('active');
        this.render();
        if (window.Dashboard) Dashboard.update();
        if (window.Products) Products.render();
        if (window.Stock) Stock.render();
    },

    deductStock(items, ref) {
        let products = Products.getAll();
        let movements = Storage.getArray(Storage.KEYS.STOCK_MOVEMENTS);
        const now = new Date().toISOString();
        items.forEach(item => {
            const idx = products.findIndex(p => p.id === item.productId);
            if (idx !== -1) {
                products[idx].currentStock = Math.max(0, (Number(products[idx].currentStock) || 0) - item.qty);
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
            this.deductStock(orders[idx].items || [], orders[idx].orderId);
        }
        Storage.saveData(Storage.KEYS.ORDERS, orders);
        this.render();
        if (window.Dashboard) Dashboard.update();
        if (window.Products) Products.render();
        if (window.Stock) Stock.render();
        showToast('Status updated', 'success');
    },

    confirmDelete(id) {
        const o = this.getById(id);
        if (!o) return;
        document.getElementById('confirmMessage').textContent = `Delete order ${o.orderId}?`;
        Categories.deleteCallback = () => {
            Storage.saveData(Storage.KEYS.ORDERS, this.getAll().filter(x => x.id !== id));
            showToast('Order deleted', 'success');
            this.render();
            if (window.Dashboard) Dashboard.update();
        };
        document.getElementById('confirmModal').classList.add('active');
    },

    statusBadge(status) {
        const colors = {
            pending: 'due', confirmed: 'pending', processing: 'pending',
            ready: 'active', delivered: 'paid', cancelled: 'inactive'
        };
        return `<span class="status-badge ${colors[status] || 'pending'}">${status}</span>`;
    },

    render() {
        const tbody = document.getElementById('ordersTableBody');
        if (!tbody) return;
        const search = (document.getElementById('orderSearch')?.value || '').toLowerCase();
        const statusF = document.getElementById('orderStatusFilter')?.value || '';
        const from = document.getElementById('orderDateFrom')?.value || '';
        const to = document.getElementById('orderDateTo')?.value || '';

        let orders = this.getAll();
        if (search) orders = orders.filter(o =>
            (o.orderId || '').toLowerCase().includes(search) ||
            (o.customerName || '').toLowerCase().includes(search)
        );
        if (statusF) orders = orders.filter(o => o.status === statusF);
        if (from) orders = orders.filter(o => (o.date || '') >= from);
        if (to) orders = orders.filter(o => (o.date || '').split('T')[0] <= to);

        const all = this.getAll();
        const el = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
        el('ordStatTotal', all.length);
        el('ordStatPending', all.filter(o => o.status === 'pending').length);
        el('ordStatProcessing', all.filter(o => ['processing', 'confirmed', 'ready'].includes(o.status)).length);
        el('ordStatDelivered', all.filter(o => o.status === 'delivered').length);

        if (!orders.length) {
            tbody.innerHTML = `<tr class="empty-row"><td colspan="8" class="empty-state"><i class="fas fa-shopping-bag"></i><p>No orders yet</p></td></tr>`;
            return;
        }
        orders.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
        tbody.innerHTML = orders.map(o => {
            const d = o.date ? new Date(o.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
            return `<tr>
                <td><strong>${escapeHtml(o.orderId)}</strong></td>
                <td>${escapeHtml(o.customerName)}</td>
                <td>${d}</td>
                <td>${(o.items || []).length}</td>
                <td>${Storage.formatCurrency(o.total)}</td>
                <td>${escapeHtml(o.paymentMethod || '—')}</td>
                <td>
                    <select onchange="Orders.updateStatus('${o.id}', this.value)" style="padding:4px 8px;border-radius:6px;border:1px solid var(--border);font-size:0.8rem;background:var(--bg-body);color:var(--text-primary)">
                        ${['pending','confirmed','processing','ready','delivered','cancelled'].map(s =>
                            `<option value="${s}" ${o.status === s ? 'selected' : ''}>${s}</option>`
                        ).join('')}
                    </select>
                </td>
                <td><div class="action-btns">
                    <button class="btn btn-icon edit" onclick="Orders.openModal(Orders.getById('${o.id}'))"><i class="fas fa-pen"></i></button>
                    <button class="btn btn-icon delete" onclick="Orders.confirmDelete('${o.id}')"><i class="fas fa-trash"></i></button>
                </div></td>
            </tr>`;
        }).join('');
    }
};
window.Orders = Orders;
