/* ========================================
   Suppliers Module + Ledger + Pay
   ======================================== */

const Suppliers = {
    editingId: null,

    init() {
        this.bindEvents();
        this.render();
    },

    bindEvents() {
        const addBtn = document.getElementById('btnAddSupplier');
        if (addBtn) addBtn.addEventListener('click', () => this.openModal());

        const form = document.getElementById('supplierForm');
        if (form) form.addEventListener('submit', (e) => this.save(e));

        const search = document.getElementById('supplierSearch');
        if (search) search.addEventListener('input', () => this.render());

        const payForm = document.getElementById('supplierPaymentForm');
        if (payForm) payForm.addEventListener('submit', (e) => this.savePayment(e));
    },

    getAll() {
        return Storage.getArray(Storage.KEYS.SUPPLIERS);
    },

    getById(id) {
        return this.getAll().find(s => s.id === id);
    },

    openModal(supplier = null) {
        this.editingId = supplier ? supplier.id : null;
        const title = document.getElementById('supplierModalTitle');
        if (title) {
            title.textContent = supplier
                ? (window.i18n ? i18n.t('editSupplier') || 'Edit Supplier' : 'Edit Supplier')
                : (window.i18n ? i18n.t('addSupplier') || 'Add Supplier' : 'Add Supplier');
        }

        document.getElementById('supplierForm').reset();
        document.getElementById('supplierFormError').classList.remove('show');
        document.getElementById('supplierId').value = supplier ? supplier.id : '';
        document.getElementById('supplierName').value = supplier ? supplier.name : '';
        document.getElementById('supplierMobile').value = supplier ? (supplier.mobile || '') : '';
        document.getElementById('supplierAddress').value = supplier ? (supplier.address || '') : '';

        document.getElementById('supplierModal').classList.add('active');
        document.getElementById('supplierName').focus();
    },

    save(e) {
        e.preventDefault();
        const error = document.getElementById('supplierFormError');
        const name = document.getElementById('supplierName').value.trim();
        const mobile = document.getElementById('supplierMobile').value.trim();
        const address = document.getElementById('supplierAddress').value.trim();

        if (!name) {
            error.textContent = 'Supplier name is required';
            error.classList.add('show');
            return;
        }

        let suppliers = this.getAll();

        if (this.editingId) {
            const idx = suppliers.findIndex(s => s.id === this.editingId);
            if (idx !== -1) {
                suppliers[idx] = {
                    ...suppliers[idx],
                    name, mobile, address,
                    updatedAt: new Date().toISOString()
                };
            }
            showToast('Supplier updated', 'success');
        } else {
            suppliers.push({
                id: Storage.generateId('sup'),
                name, mobile, address,
                totalPurchase: 0,
                paid: 0,
                due: 0,
                payments: [],
                createdAt: new Date().toISOString()
            });
            showToast('Supplier added', 'success');
        }

        Storage.saveData(Storage.KEYS.SUPPLIERS, suppliers);
        document.getElementById('supplierModal').classList.remove('active');
        this.render();
        if (window.Purchases) Purchases.populateSuppliers();
        if (window.Dashboard) Dashboard.update();
    },

    confirmDelete(id) {
        const sup = this.getById(id);
        if (!sup) return;

        const purchases = Storage.getArray(Storage.KEYS.PURCHASES);
        const used = purchases.filter(p => p.supplierId === id).length;

        const msg = document.getElementById('confirmMessage');
        msg.textContent = used > 0
            ? `This supplier has ${used} purchase(s). Delete anyway?`
            : `Delete supplier "${sup.name}"?`;

        Categories.deleteCallback = () => {
            let suppliers = this.getAll().filter(s => s.id !== id);
            Storage.saveData(Storage.KEYS.SUPPLIERS, suppliers);
            showToast('Supplier deleted', 'success');
            this.render();
            if (window.Purchases) Purchases.populateSuppliers();
            if (window.Dashboard) Dashboard.update();
        };
        document.getElementById('confirmModal').classList.add('active');
    },

    openLedger(id) {
        const sup = this.getById(id);
        if (!sup) return;

        const purchases = Storage.getArray(Storage.KEYS.PURCHASES)
            .filter(p => p.supplierId === id)
            .sort((a, b) => new Date(b.date) - new Date(a.date));

        const payments = (sup.payments || []).slice().sort((a, b) => new Date(b.date) - new Date(a.date));

        const title = document.getElementById('supplierLedgerTitle');
        if (title) title.textContent = `Ledger — ${sup.name}`;

        let purchaseRows = purchases.length === 0
            ? '<tr><td colspan="5" style="text-align:center;color:var(--text-muted)">No purchases</td></tr>'
            : purchases.map(p => {
                const d = new Date(p.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                return `<tr>
                    <td>${escapeHtml(p.refNo)}</td>
                    <td>${d}</td>
                    <td>${Storage.formatCurrency(p.totalAmount)}</td>
                    <td>${Storage.formatCurrency(p.paidAmount)}</td>
                    <td class="${(p.dueAmount || 0) > 0 ? 'text-danger' : ''}">${Storage.formatCurrency(p.dueAmount)}</td>
                </tr>`;
            }).join('');

        let payRows = payments.length === 0
            ? '<tr><td colspan="4" style="text-align:center;color:var(--text-muted)">No payments made</td></tr>'
            : payments.map(p => {
                const d = new Date(p.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                return `<tr>
                    <td>${d}</td>
                    <td>${Storage.formatCurrency(p.amount)}</td>
                    <td>${escapeHtml(p.method || '—')}</td>
                    <td>${escapeHtml(p.note || '—')}</td>
                </tr>`;
            }).join('');

        document.getElementById('supplierLedgerContent').innerHTML = `
            <div style="display:flex;gap:20px;flex-wrap:wrap;margin-bottom:20px">
                <div class="mini-stat"><span class="mini-stat-label">Total Purchase</span><span class="mini-stat-value">${Storage.formatCurrency(sup.totalPurchase || 0)}</span></div>
                <div class="mini-stat"><span class="mini-stat-label">Paid</span><span class="mini-stat-value">${Storage.formatCurrency(sup.paid || 0)}</span></div>
                <div class="mini-stat warning"><span class="mini-stat-label">Due</span><span class="mini-stat-value">${Storage.formatCurrency(sup.due || 0)}</span></div>
            </div>
            <h3 style="margin-bottom:10px;font-size:1rem">Purchase History</h3>
            <div class="table-responsive" style="margin-bottom:24px">
                <table class="data-table">
                    <thead><tr><th>Ref</th><th>Date</th><th>Total</th><th>Paid</th><th>Due</th></tr></thead>
                    <tbody>${purchaseRows}</tbody>
                </table>
            </div>
            <h3 style="margin-bottom:10px;font-size:1rem">Payments Made</h3>
            <div class="table-responsive">
                <table class="data-table">
                    <thead><tr><th>Date</th><th>Amount</th><th>Method</th><th>Note</th></tr></thead>
                    <tbody>${payRows}</tbody>
                </table>
            </div>
        `;

        document.getElementById('supplierLedgerModal').classList.add('active');
    },

    openPay(id) {
        const sup = this.getById(id);
        if (!sup) return;

        document.getElementById('paySupplierId').value = id;
        document.getElementById('paySupplierInfo').textContent = `${sup.name}${sup.mobile ? ' · ' + sup.mobile : ''}`;
        document.getElementById('paySupplierCurrentDue').value = Storage.formatCurrency(sup.due || 0);
        document.getElementById('paySupplierAmount').value = '';
        document.getElementById('paySupplierNote').value = '';
        document.getElementById('supplierPaymentError').classList.remove('show');
        document.getElementById('supplierPaymentModal').classList.add('active');
        document.getElementById('paySupplierAmount').focus();
    },

    savePayment(e) {
        e.preventDefault();
        const error = document.getElementById('supplierPaymentError');
        const supplierId = document.getElementById('paySupplierId').value;
        const amount = parseFloat(document.getElementById('paySupplierAmount').value) || 0;
        const method = document.getElementById('paySupplierMethod').value;
        const note = document.getElementById('paySupplierNote').value.trim();

        const sup = this.getById(supplierId);
        if (!sup) return;

        if (amount <= 0) {
            error.textContent = 'Enter a valid amount';
            error.classList.add('show');
            return;
        }
        if (amount > (sup.due || 0) + 0.01) {
            error.textContent = 'Amount cannot exceed due';
            error.classList.add('show');
            return;
        }

        let suppliers = this.getAll();
        const idx = suppliers.findIndex(s => s.id === supplierId);
        if (idx === -1) return;

        const payAmount = Math.min(amount, suppliers[idx].due || 0);
        suppliers[idx].paid = (Number(suppliers[idx].paid) || 0) + payAmount;
        suppliers[idx].due = Math.max(0, (Number(suppliers[idx].due) || 0) - payAmount);

        if (!suppliers[idx].payments) suppliers[idx].payments = [];
        suppliers[idx].payments.push({
            id: Storage.generateId('spay'),
            amount: payAmount,
            method,
            note,
            date: new Date().toISOString()
        });

        // FIFO on purchase dues
        let purchases = Storage.getArray(Storage.KEYS.PURCHASES);
        let remaining = payAmount;
        purchases
            .filter(p => p.supplierId === supplierId && (p.dueAmount || 0) > 0)
            .sort((a, b) => new Date(a.date) - new Date(b.date))
            .forEach(p => {
                if (remaining <= 0) return;
                const pay = Math.min(remaining, p.dueAmount);
                p.paidAmount = (Number(p.paidAmount) || 0) + pay;
                p.dueAmount = Math.max(0, (Number(p.dueAmount) || 0) - pay);
                remaining -= pay;
            });
        Storage.saveData(Storage.KEYS.PURCHASES, purchases);
        Storage.saveData(Storage.KEYS.SUPPLIERS, suppliers);

        document.getElementById('supplierPaymentModal').classList.remove('active');
        showToast('Payment recorded', 'success');
        this.render();
        if (window.Purchases) Purchases.render();
        if (window.Dashboard) Dashboard.update();
    },

    render() {
        const tbody = document.getElementById('suppliersTableBody');
        if (!tbody) return;

        const search = (document.getElementById('supplierSearch')?.value || '').toLowerCase();
        let suppliers = this.getAll();

        if (search) {
            suppliers = suppliers.filter(s =>
                (s.name || '').toLowerCase().includes(search) ||
                (s.mobile || '').includes(search) ||
                (s.address || '').toLowerCase().includes(search)
            );
        }

        if (suppliers.length === 0) {
            tbody.innerHTML = `
                <tr class="empty-row">
                    <td colspan="7" class="empty-state">
                        <i class="fas fa-handshake"></i>
                        <p data-i18n="noSuppliers">No suppliers yet</p>
                    </td>
                </tr>
            `;
            return;
        }

        suppliers.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

        tbody.innerHTML = suppliers.map(s => `
            <tr>
                <td><strong>${escapeHtml(s.name)}</strong></td>
                <td>${escapeHtml(s.mobile) || '—'}</td>
                <td>${escapeHtml(s.address) || '—'}</td>
                <td>${Storage.formatCurrency(s.totalPurchase || 0)}</td>
                <td>${Storage.formatCurrency(s.paid || 0)}</td>
                <td><span class="${(s.due || 0) > 0 ? 'text-danger' : ''}">${Storage.formatCurrency(s.due || 0)}</span></td>
                <td>
                    <div class="action-btns">
                        <button class="btn btn-icon edit" title="Ledger" onclick="Suppliers.openLedger('${s.id}')" style="background:var(--success-bg);color:var(--success)">
                            <i class="fas fa-book"></i>
                        </button>
                        ${(s.due || 0) > 0 ? `
                        <button class="btn btn-icon edit" title="Pay" onclick="Suppliers.openPay('${s.id}')" style="background:var(--warning-bg);color:#B8860B">
                            <i class="fas fa-hand-holding-usd"></i>
                        </button>` : ''}
                        <button class="btn btn-icon edit" title="Edit" onclick="Suppliers.openModal(Suppliers.getById('${s.id}'))">
                            <i class="fas fa-pen"></i>
                        </button>
                        <button class="btn btn-icon delete" title="Delete" onclick="Suppliers.confirmDelete('${s.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }
};

window.Suppliers = Suppliers;
