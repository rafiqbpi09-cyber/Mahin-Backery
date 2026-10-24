/* ========================================
   Customers Module + Ledger
   ======================================== */

const Customers = {
    editingId: null,

    init() {
        this.bindEvents();
        this.render();
    },

    bindEvents() {
        const addBtn = document.getElementById('btnAddCustomer');
        if (addBtn) addBtn.addEventListener('click', () => this.openModal());

        const form = document.getElementById('customerForm');
        if (form) form.addEventListener('submit', (e) => this.save(e));

        const search = document.getElementById('customerSearch');
        if (search) search.addEventListener('input', () => this.render());

        const dueFilter = document.getElementById('customerDueFilter');
        if (dueFilter) dueFilter.addEventListener('change', () => this.render());

        const payForm = document.getElementById('receivePaymentForm');
        if (payForm) payForm.addEventListener('submit', (e) => this.savePayment(e));
    },

    getAll() {
        return Storage.getArray(Storage.KEYS.CUSTOMERS);
    },

    getById(id) {
        return this.getAll().find(c => c.id === id);
    },

    openModal(customer = null) {
        this.editingId = customer ? customer.id : null;
        const title = document.getElementById('customerModalTitle');
        if (title) {
            title.textContent = customer
                ? (window.i18n ? i18n.t('editCustomer') || 'Edit Customer' : 'Edit Customer')
                : (window.i18n ? i18n.t('addCustomer') || 'Add Customer' : 'Add Customer');
        }

        document.getElementById('customerForm').reset();
        document.getElementById('customerFormError').classList.remove('show');
        document.getElementById('customerId').value = customer ? customer.id : '';
        document.getElementById('customerName').value = customer ? customer.name : '';
        document.getElementById('customerMobile').value = customer ? (customer.mobile || '') : '';
        document.getElementById('customerAddress').value = customer ? (customer.address || '') : '';

        document.getElementById('customerModal').classList.add('active');
        document.getElementById('customerName').focus();
    },

    save(e) {
        e.preventDefault();
        const error = document.getElementById('customerFormError');
        const name = document.getElementById('customerName').value.trim();
        const mobile = document.getElementById('customerMobile').value.trim();
        const address = document.getElementById('customerAddress').value.trim();

        if (!name) {
            error.textContent = 'Customer name is required';
            error.classList.add('show');
            return;
        }

        let customers = this.getAll();

        if (this.editingId) {
            const idx = customers.findIndex(c => c.id === this.editingId);
            if (idx !== -1) {
                customers[idx] = {
                    ...customers[idx],
                    name, mobile, address,
                    updatedAt: new Date().toISOString()
                };
            }
            showToast('Customer updated', 'success');
        } else {
            customers.push({
                id: Storage.generateId('cust'),
                name, mobile, address,
                totalPurchase: 0,
                paid: 0,
                due: 0,
                lastPurchaseDate: null,
                payments: [],
                createdAt: new Date().toISOString()
            });
            showToast('Customer added', 'success');
        }

        Storage.saveData(Storage.KEYS.CUSTOMERS, customers);
        document.getElementById('customerModal').classList.remove('active');
        this.render();
        if (window.POS) POS.loadCustomers();
        if (window.Dashboard) Dashboard.update();
    },

    confirmDelete(id) {
        const cust = this.getById(id);
        if (!cust) return;

        const sales = Storage.getArray(Storage.KEYS.SALES);
        const used = sales.filter(s => s.customerId === id).length;

        const msg = document.getElementById('confirmMessage');
        msg.textContent = used > 0
            ? `This customer has ${used} sale(s). Delete anyway?`
            : `Delete customer "${cust.name}"?`;

        Categories.deleteCallback = () => {
            let customers = this.getAll().filter(c => c.id !== id);
            Storage.saveData(Storage.KEYS.CUSTOMERS, customers);
            showToast('Customer deleted', 'success');
            this.render();
            if (window.POS) POS.loadCustomers();
            if (window.Dashboard) Dashboard.update();
        };
        document.getElementById('confirmModal').classList.add('active');
    },

    openLedger(id) {
        const cust = this.getById(id);
        if (!cust) return;

        const sales = Storage.getArray(Storage.KEYS.SALES)
            .filter(s => s.customerId === id)
            .sort((a, b) => new Date(b.date) - new Date(a.date));

        const payments = (cust.payments || []).slice().sort((a, b) => new Date(b.date) - new Date(a.date));

        const title = document.getElementById('customerLedgerTitle');
        if (title) title.textContent = `Ledger — ${cust.name}`;

        let salesRows = sales.length === 0
            ? '<tr><td colspan="5" style="text-align:center;color:var(--text-muted)">No sales</td></tr>'
            : sales.map(s => {
                const d = new Date(s.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                return `<tr>
                    <td>${escapeHtml(s.invoiceNo)}</td>
                    <td>${d}</td>
                    <td>${Storage.formatCurrency(s.grandTotal)}</td>
                    <td>${Storage.formatCurrency(s.paidAmount)}</td>
                    <td class="${s.dueAmount > 0 ? 'text-danger' : ''}">${Storage.formatCurrency(s.dueAmount)}</td>
                </tr>`;
            }).join('');

        let payRows = payments.length === 0
            ? '<tr><td colspan="4" style="text-align:center;color:var(--text-muted)">No payments received</td></tr>'
            : payments.map(p => {
                const d = new Date(p.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                return `<tr>
                    <td>${d}</td>
                    <td>${Storage.formatCurrency(p.amount)}</td>
                    <td>${escapeHtml(p.method || '—')}</td>
                    <td>${escapeHtml(p.note || '—')}</td>
                </tr>`;
            }).join('');

        document.getElementById('customerLedgerContent').innerHTML = `
            <div style="display:flex;gap:20px;flex-wrap:wrap;margin-bottom:20px">
                <div class="mini-stat"><span class="mini-stat-label">Total Purchase</span><span class="mini-stat-value">${Storage.formatCurrency(cust.totalPurchase || 0)}</span></div>
                <div class="mini-stat"><span class="mini-stat-label">Paid</span><span class="mini-stat-value">${Storage.formatCurrency(cust.paid || 0)}</span></div>
                <div class="mini-stat warning"><span class="mini-stat-label">Due</span><span class="mini-stat-value">${Storage.formatCurrency(cust.due || 0)}</span></div>
            </div>
            <h3 style="margin-bottom:10px;font-size:1rem">Sales History</h3>
            <div class="table-responsive" style="margin-bottom:24px">
                <table class="data-table">
                    <thead><tr><th>Invoice</th><th>Date</th><th>Total</th><th>Paid</th><th>Due</th></tr></thead>
                    <tbody>${salesRows}</tbody>
                </table>
            </div>
            <h3 style="margin-bottom:10px;font-size:1rem">Payments Received</h3>
            <div class="table-responsive">
                <table class="data-table">
                    <thead><tr><th>Date</th><th>Amount</th><th>Method</th><th>Note</th></tr></thead>
                    <tbody>${payRows}</tbody>
                </table>
            </div>
        `;

        document.getElementById('customerLedgerModal').classList.add('active');
    },

    openReceivePayment(id) {
        const cust = this.getById(id);
        if (!cust) return;

        document.getElementById('receiveCustomerId').value = id;
        document.getElementById('receiveCustomerInfo').textContent = `${cust.name}${cust.mobile ? ' · ' + cust.mobile : ''}`;
        document.getElementById('receiveCurrentDue').value = Storage.formatCurrency(cust.due || 0);
        document.getElementById('receiveAmount').value = '';
        document.getElementById('receiveAmount').max = cust.due || 999999;
        document.getElementById('receiveNote').value = '';
        document.getElementById('receivePaymentError').classList.remove('show');
        document.getElementById('receivePaymentModal').classList.add('active');
        document.getElementById('receiveAmount').focus();
    },

    savePayment(e) {
        e.preventDefault();
        const error = document.getElementById('receivePaymentError');
        const customerId = document.getElementById('receiveCustomerId').value;
        const amount = parseFloat(document.getElementById('receiveAmount').value) || 0;
        const method = document.getElementById('receivePaymentMethod').value;
        const note = document.getElementById('receiveNote').value.trim();

        const cust = this.getById(customerId);
        if (!cust) return;

        if (amount <= 0) {
            error.textContent = 'Enter a valid amount';
            error.classList.add('show');
            return;
        }
        if (amount > (cust.due || 0) + 0.01) {
            error.textContent = 'Amount cannot exceed due';
            error.classList.add('show');
            return;
        }

        let customers = this.getAll();
        const idx = customers.findIndex(c => c.id === customerId);
        if (idx === -1) return;

        const payAmount = Math.min(amount, customers[idx].due || 0);
        customers[idx].paid = (Number(customers[idx].paid) || 0) + payAmount;
        customers[idx].due = Math.max(0, (Number(customers[idx].due) || 0) - payAmount);

        if (!customers[idx].payments) customers[idx].payments = [];
        customers[idx].payments.push({
            id: Storage.generateId('pay'),
            amount: payAmount,
            method,
            note,
            date: new Date().toISOString()
        });

        // Also reduce due on oldest due sales (simple FIFO)
        let sales = Storage.getArray(Storage.KEYS.SALES);
        let remaining = payAmount;
        sales
            .filter(s => s.customerId === customerId && (s.dueAmount || 0) > 0)
            .sort((a, b) => new Date(a.date) - new Date(b.date))
            .forEach(s => {
                if (remaining <= 0) return;
                const pay = Math.min(remaining, s.dueAmount);
                s.paidAmount = (Number(s.paidAmount) || 0) + pay;
                s.dueAmount = Math.max(0, (Number(s.dueAmount) || 0) - pay);
                s.status = s.dueAmount > 0 ? 'due' : 'paid';
                remaining -= pay;
            });
        Storage.saveData(Storage.KEYS.SALES, sales);
        Storage.saveData(Storage.KEYS.CUSTOMERS, customers);

        document.getElementById('receivePaymentModal').classList.remove('active');
        showToast('Payment received', 'success');
        this.render();
        if (window.Dashboard) Dashboard.update();
    },

    render() {
        const tbody = document.getElementById('customersTableBody');
        if (!tbody) return;

        const search = (document.getElementById('customerSearch')?.value || '').toLowerCase();
        const dueFilter = document.getElementById('customerDueFilter')?.value || '';

        let customers = this.getAll();

        if (search) {
            customers = customers.filter(c =>
                (c.name || '').toLowerCase().includes(search) ||
                (c.mobile || '').includes(search) ||
                (c.address || '').toLowerCase().includes(search)
            );
        }
        if (dueFilter === 'due') {
            customers = customers.filter(c => (c.due || 0) > 0);
        }

        // Stats
        const all = this.getAll();
        const el = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
        el('custStatTotal', all.length);
        el('custStatPurchase', Storage.formatCurrency(all.reduce((s, c) => s + (c.totalPurchase || 0), 0)));
        el('custStatDue', Storage.formatCurrency(all.reduce((s, c) => s + (c.due || 0), 0)));

        if (customers.length === 0) {
            tbody.innerHTML = `
                <tr class="empty-row">
                    <td colspan="8" class="empty-state">
                        <i class="fas fa-users"></i>
                        <p data-i18n="noCustomers">No customers yet</p>
                    </td>
                </tr>
            `;
            return;
        }

        customers.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

        tbody.innerHTML = customers.map(c => {
            const lastDate = c.lastPurchaseDate
                ? new Date(c.lastPurchaseDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                : '—';

            return `
                <tr>
                    <td><strong>${escapeHtml(c.name)}</strong></td>
                    <td>${escapeHtml(c.mobile) || '—'}</td>
                    <td>${escapeHtml(c.address) || '—'}</td>
                    <td>${Storage.formatCurrency(c.totalPurchase || 0)}</td>
                    <td>${Storage.formatCurrency(c.paid || 0)}</td>
                    <td><span class="${(c.due || 0) > 0 ? 'text-danger' : ''}">${Storage.formatCurrency(c.due || 0)}</span></td>
                    <td>${lastDate}</td>
                    <td>
                        <div class="action-btns">
                            <button class="btn btn-icon edit" title="Ledger" onclick="Customers.openLedger('${c.id}')" style="background:var(--success-bg);color:var(--success)">
                                <i class="fas fa-book"></i>
                            </button>
                            ${(c.due || 0) > 0 ? `
                            <button class="btn btn-icon edit" title="Receive Payment" onclick="Customers.openReceivePayment('${c.id}')" style="background:var(--warning-bg);color:#B8860B">
                                <i class="fas fa-hand-holding-usd"></i>
                            </button>` : ''}
                            <button class="btn btn-icon edit" title="Edit" onclick="Customers.openModal(Customers.getById('${c.id}'))">
                                <i class="fas fa-pen"></i>
                            </button>
                            <button class="btn btn-icon delete" title="Delete" onclick="Customers.confirmDelete('${c.id}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }
};

window.Customers = Customers;
