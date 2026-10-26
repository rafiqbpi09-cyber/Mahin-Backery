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

    currentLedgerId: null,

    openLedger(id) {
        const cust = this.getById(id);
        if (!cust) return;
        this.currentLedgerId = id;

        const sales = Storage.getArray(Storage.KEYS.SALES)
            .filter(s => s.customerId === id)
            .sort((a, b) => new Date(b.date) - new Date(a.date));

        const payments = (cust.payments || []).slice().sort((a, b) => new Date(b.date) - new Date(a.date));

        const totalPurchase = Number(cust.totalPurchase) || 0;
        const totalPaid = Number(cust.paid) || 0;
        const due = Number(cust.due) || 0;
        const advance = Number(cust.advance) || 0;
        const settings = Storage.initSettings();

        const title = document.getElementById('customerLedgerTitle');
        if (title) title.textContent = `Customer Summary — ${cust.name}`;

        let salesRows = sales.length === 0
            ? '<tr><td colspan="5" style="text-align:center;color:var(--text-muted)">No sales yet</td></tr>'
            : sales.map(s => {
                const d = new Date(s.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                return `<tr>
                    <td>${escapeHtml(s.invoiceNo)}</td>
                    <td>${d}</td>
                    <td>${Storage.formatCurrency(s.grandTotal)}</td>
                    <td>${Storage.formatCurrency(s.paidAmount)}</td>
                    <td class="${(s.dueAmount || 0) > 0 ? 'text-danger' : ''}">${Storage.formatCurrency(s.dueAmount)}</td>
                </tr>`;
            }).join('');

        let payRows = payments.length === 0
            ? '<tr><td colspan="4" style="text-align:center;color:var(--text-muted)">No extra payments</td></tr>'
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
            <div id="customerSummaryPrintArea">
                <div class="cust-summary-header" style="margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid var(--border-light)">
                    <div style="font-weight:700;font-size:1.15rem">${escapeHtml(settings.bakeryName || 'Mahin Foods Products')}</div>
                    <div style="color:var(--text-muted);font-size:0.85rem">${escapeHtml(settings.address || '')} ${settings.phone ? '· ' + escapeHtml(settings.phone) : ''}</div>
                    <div style="margin-top:8px;font-weight:600">কাস্টমার হিসাব / Customer Statement</div>
                    <div style="font-size:0.85rem;color:var(--text-secondary)">Date: ${new Date().toLocaleDateString('en-GB')}</div>
                </div>

                <div class="cust-info-box" style="background:var(--bg-body);border-radius:12px;padding:14px 16px;margin-bottom:16px;border:1px solid var(--border-light)">
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:0.92rem">
                        <div><strong>Name:</strong> ${escapeHtml(cust.name)}</div>
                        <div><strong>Mobile:</strong> ${escapeHtml(cust.mobile) || '—'}</div>
                        <div style="grid-column:1/-1"><strong>Address:</strong> ${escapeHtml(cust.address) || '—'}</div>
                    </div>
                </div>

                <h3 style="font-size:1rem;margin-bottom:10px">📊 Account Summary / হিসাব সামারি</h3>
                <div class="table-responsive" style="margin-bottom:20px">
                    <table class="data-table cust-summary-table">
                        <tbody>
                            <tr>
                                <td><strong>মোট প্রোডাক্ট / Total Purchase</strong></td>
                                <td style="text-align:right;font-weight:700">${Storage.formatCurrency(totalPurchase)}</td>
                            </tr>
                            <tr>
                                <td><strong>মোট পরিশোধ / Total Paid</strong></td>
                                <td style="text-align:right;font-weight:700">${Storage.formatCurrency(totalPaid)}</td>
                            </tr>
                            <tr style="background:rgba(220,53,69,0.08)">
                                <td><strong>বকেয়া / Due</strong></td>
                                <td style="text-align:right;font-weight:700;color:var(--danger)">${Storage.formatCurrency(due)}</td>
                            </tr>
                            <tr style="background:rgba(42,157,106,0.1)">
                                <td><strong>অগ্রিম / Advance</strong></td>
                                <td style="text-align:right;font-weight:700;color:var(--success)">${Storage.formatCurrency(advance)}</td>
                            </tr>
                            <tr>
                                <td><strong>নেট ব্যালেন্স / Net Balance</strong>
                                    <div style="font-size:0.75rem;color:var(--text-muted);font-weight:400">${due > 0 ? '(কাস্টমারের কাছে পাওনা)' : advance > 0 ? '(কাস্টমারের জমা)' : '(সমন্বিত)'}</div>
                                </td>
                                <td style="text-align:right;font-weight:700;font-size:1.1rem">
                                    ${due > 0 ? Storage.formatCurrency(due) + ' Due' : advance > 0 ? Storage.formatCurrency(advance) + ' Advance' : Storage.formatCurrency(0)}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <h3 style="font-size:1rem;margin-bottom:10px">Sales / বিক্রয় তালিকা (${sales.length})</h3>
                <div class="table-responsive" style="margin-bottom:20px">
                    <table class="data-table">
                        <thead><tr><th>Invoice</th><th>Date</th><th>Total</th><th>Paid</th><th>Due</th></tr></thead>
                        <tbody>${salesRows}</tbody>
                    </table>
                </div>

                <h3 style="font-size:1rem;margin-bottom:10px">Payments / পেমেন্ট (${payments.length})</h3>
                <div class="table-responsive">
                    <table class="data-table">
                        <thead><tr><th>Date</th><th>Amount</th><th>Method</th><th>Note</th></tr></thead>
                        <tbody>${payRows}</tbody>
                    </table>
                </div>
            </div>
        `;

        document.getElementById('customerLedgerModal').classList.add('active');
    },

    getSummaryData(id) {
        const cust = this.getById(id);
        if (!cust) return null;
        const sales = Storage.getArray(Storage.KEYS.SALES).filter(s => s.customerId === id);
        const payments = cust.payments || [];
        return {
            cust,
            sales,
            payments,
            totalPurchase: Number(cust.totalPurchase) || 0,
            totalPaid: Number(cust.paid) || 0,
            due: Number(cust.due) || 0,
            advance: Number(cust.advance) || 0,
            settings: Storage.initSettings()
        };
    },

    printSummary() {
        const id = this.currentLedgerId;
        if (!id) return;
        const area = document.getElementById('customerSummaryPrintArea');
        if (!area) return;
        const w = window.open('', '_blank', 'width=800,height=900');
        w.document.write(`<!DOCTYPE html><html><head><title>Customer Statement</title>
            <style>
                body{font-family:system-ui,sans-serif;padding:24px;color:#222}
                table{width:100%;border-collapse:collapse;margin:12px 0}
                th,td{border:1px solid #ddd;padding:8px 10px;text-align:left;font-size:13px}
                th{background:#f5f0eb}
                h3{margin:18px 0 8px;font-size:15px}
                .text-danger{color:#c0392b}
                @media print{body{padding:0}}
            </style></head><body>${area.innerHTML}
            <script>window.onload=function(){window.print();}</script>
            </body></html>`);
        w.document.close();
    },

    exportPDF() {
        // Browser print → Save as PDF
        this.printSummary();
        showToast('Print dialog → Destination: Save as PDF', 'success');
    },

    exportExcel() {
        const id = this.currentLedgerId;
        const data = this.getSummaryData(id);
        if (!data) return;
        const { cust, sales, payments, totalPurchase, totalPaid, due, advance, settings } = data;

        const lines = [];
        lines.push(['Customer Statement']);
        lines.push([settings.bakeryName || 'Mahin Foods Products']);
        lines.push(['Date', new Date().toLocaleDateString('en-GB')]);
        lines.push([]);
        lines.push(['Customer Name', cust.name]);
        lines.push(['Mobile', cust.mobile || '']);
        lines.push(['Address', cust.address || '']);
        lines.push([]);
        lines.push(['ACCOUNT SUMMARY']);
        lines.push(['Total Purchase', totalPurchase]);
        lines.push(['Total Paid', totalPaid]);
        lines.push(['Due', due]);
        lines.push(['Advance', advance]);
        lines.push(['Net', due > 0 ? due + ' Due' : advance > 0 ? advance + ' Advance' : 0]);
        lines.push([]);
        lines.push(['SALES']);
        lines.push(['Invoice', 'Date', 'Total', 'Paid', 'Due']);
        sales.forEach(s => {
            lines.push([
                s.invoiceNo,
                s.date ? new Date(s.date).toLocaleDateString('en-GB') : '',
                s.grandTotal || 0,
                s.paidAmount || 0,
                s.dueAmount || 0
            ]);
        });
        lines.push([]);
        lines.push(['PAYMENTS']);
        lines.push(['Date', 'Amount', 'Method', 'Note']);
        payments.forEach(p => {
            lines.push([
                p.date ? new Date(p.date).toLocaleDateString('en-GB') : '',
                p.amount || 0,
                p.method || '',
                p.note || ''
            ]);
        });

        // CSV (Excel opens fine)
        const csv = lines.map(row =>
            row.map(cell => {
                const s = String(cell ?? '');
                if (s.includes(',') || s.includes('"') || s.includes('\n')) {
                    return '"' + s.replace(/"/g, '""') + '"';
                }
                return s;
            }).join(',')
        ).join('\n');

        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Customer_${(cust.name || 'statement').replace(/\s+/g, '_')}_${Storage.getToday()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('Excel/CSV downloaded', 'success');
    },

    openReceivePayment(id) {
        const cust = this.getById(id);
        if (!cust) return;

        document.getElementById('receiveCustomerId').value = id;
        document.getElementById('receiveCustomerInfo').textContent = `${cust.name}${cust.mobile ? ' · ' + cust.mobile : ''} | Advance: ${Storage.formatCurrency(cust.advance || 0)}`;
        document.getElementById('receiveCurrentDue').value = Storage.formatCurrency(cust.due || 0);
        document.getElementById('receiveAmount').value = '';
        document.getElementById('receiveAmount').removeAttribute('max');
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

        let customers = this.getAll();
        const idx = customers.findIndex(c => c.id === customerId);
        if (idx === -1) return;

        let due = Number(customers[idx].due) || 0;
        let advance = Number(customers[idx].advance) || 0;
        const toDue = Math.min(amount, due);
        due -= toDue;
        advance += (amount - toDue);
        customers[idx].paid = (Number(customers[idx].paid) || 0) + amount;
        customers[idx].due = Math.max(0, due);
        customers[idx].advance = Math.max(0, advance);

        if (!customers[idx].payments) customers[idx].payments = [];
        customers[idx].payments.push({
            id: Storage.generateId('pay'),
            amount: amount,
            method,
            note,
            date: new Date().toISOString()
        });

        // Also reduce due on oldest due sales (simple FIFO)
        let sales = Storage.getArray(Storage.KEYS.SALES);
        let remaining = Math.min(amount, toDue);
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
        el('custStatAdvance', Storage.formatCurrency((this.getAll?this.getAll():[]).reduce((s,c)=>s+(Number(c.advance)||0),0)));
        el('custStatDue', Storage.formatCurrency(all.reduce((s, c) => s + (c.due || 0), 0)));

        if (customers.length === 0) {
            tbody.innerHTML = `
                <tr class="empty-row">
                    <td colspan="9" class="empty-state">
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
                    <td><span style="color:${(c.advance || 0) > 0 ? 'var(--success)' : 'inherit'}">${Storage.formatCurrency(c.advance || 0)}</span></td>
                    <td>${lastDate}</td>
                    <td>
                        <div class="action-btns">
                            <button class="btn btn-icon edit" title="Ledger" onclick="Customers.openLedger('${c.id}')" style="background:var(--success-bg);color:var(--success)">
                                <i class="fas fa-book"></i>
                            </button>
                            <button class="btn btn-icon edit" title="Receive Payment / Advance" onclick="Customers.openReceivePayment('${c.id}')" style="background:var(--warning-bg);color:#B8860B">
                                <i class="fas fa-hand-holding-usd"></i>
                            </button>
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
