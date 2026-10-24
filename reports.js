/* ========================================
   Reports Module
   ======================================== */

const Reports = {
    init() {
        this.bindEvents();
        // Default dates: first day of month to today
        const today = Storage.getToday();
        const first = today.slice(0, 8) + '01';
        const from = document.getElementById('reportDateFrom');
        const to = document.getElementById('reportDateTo');
        if (from && !from.value) from.value = first;
        if (to && !to.value) to.value = today;
    },

    bindEvents() {
        document.getElementById('btnGenerateReport')?.addEventListener('click', () => this.generate());
        document.getElementById('btnPrintReport')?.addEventListener('click', () => {
            const content = document.getElementById('reportContent');
            if (!content) return;
            const w = window.open('', '_blank');
            w.document.write(`<html><head><title>Report</title>
                <style>body{font-family:sans-serif;padding:20px}table{width:100%;border-collapse:collapse}
                th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f5f5f5}
                h2{margin-bottom:8px}.meta{color:#666;margin-bottom:16px}</style>
                </head><body>${content.innerHTML}</body></html>`);
            w.document.close();
            w.print();
        });
    },

    inRange(dateStr, from, to) {
        if (!dateStr) return false;
        const d = dateStr.split('T')[0];
        if (from && d < from) return false;
        if (to && d > to) return false;
        return true;
    },

    generate() {
        const type = document.getElementById('reportType')?.value || 'sales';
        const from = document.getElementById('reportDateFrom')?.value || '';
        const to = document.getElementById('reportDateTo')?.value || '';
        const content = document.getElementById('reportContent');
        const title = document.getElementById('reportTitle');
        if (!content) return;

        const titles = {
            sales: 'Sales Report',
            purchase: 'Purchase Report',
            expense: 'Expense Report',
            profit: 'Profit & Loss Report',
            stock: 'Stock Report',
            'customer-due': 'Customer Due Report',
            'supplier-due': 'Supplier Due Report',
            'product-sales': 'Product Sales Report'
        };
        if (title) title.textContent = titles[type] || 'Report';

        const rangeLabel = `${from || '…'} → ${to || '…'}`;
        let html = `<div class="meta" style="color:var(--text-muted);margin-bottom:16px">Period: ${rangeLabel}</div>`;

        if (type === 'sales') {
            const sales = Storage.getArray(Storage.KEYS.SALES).filter(s => this.inRange(s.date, from, to));
            const total = sales.reduce((a, s) => a + (s.grandTotal || 0), 0);
            const paid = sales.reduce((a, s) => a + (s.paidAmount || 0), 0);
            const due = sales.reduce((a, s) => a + (s.dueAmount || 0), 0);
            html += this.summaryCards([
                ['Invoices', sales.length],
                ['Total Sales', Storage.formatCurrency(total)],
                ['Paid', Storage.formatCurrency(paid)],
                ['Due', Storage.formatCurrency(due)]
            ]);
            html += this.table(
                ['Invoice', 'Date', 'Customer', 'Total', 'Paid', 'Due', 'Method'],
                sales.sort((a, b) => new Date(b.date) - new Date(a.date)).map(s => [
                    s.invoiceNo,
                    this.fmtDate(s.date),
                    s.customerName || 'Walk-in',
                    Storage.formatCurrency(s.grandTotal),
                    Storage.formatCurrency(s.paidAmount),
                    Storage.formatCurrency(s.dueAmount),
                    s.paymentMethod || '—'
                ])
            );
        } else if (type === 'purchase') {
            const list = Storage.getArray(Storage.KEYS.PURCHASES).filter(p => this.inRange(p.date, from, to));
            const total = list.reduce((a, p) => a + (p.totalAmount || 0), 0);
            html += this.summaryCards([
                ['Purchases', list.length],
                ['Total', Storage.formatCurrency(total)],
                ['Paid', Storage.formatCurrency(list.reduce((a, p) => a + (p.paidAmount || 0), 0))],
                ['Due', Storage.formatCurrency(list.reduce((a, p) => a + (p.dueAmount || 0), 0))]
            ]);
            html += this.table(
                ['Ref', 'Date', 'Supplier', 'Items', 'Total', 'Paid', 'Due'],
                list.sort((a, b) => new Date(b.date) - new Date(a.date)).map(p => [
                    p.refNo, this.fmtDate(p.date), p.supplierName || '—',
                    (p.items || []).length,
                    Storage.formatCurrency(p.totalAmount),
                    Storage.formatCurrency(p.paidAmount),
                    Storage.formatCurrency(p.dueAmount)
                ])
            );
        } else if (type === 'expense') {
            const list = Storage.getArray(Storage.KEYS.EXPENSES).filter(e => this.inRange(e.date, from, to));
            const total = list.reduce((a, e) => a + (e.amount || 0), 0);
            // by category
            const byCat = {};
            list.forEach(e => { byCat[e.category] = (byCat[e.category] || 0) + (e.amount || 0); });
            html += this.summaryCards([['Entries', list.length], ['Total Expense', Storage.formatCurrency(total)]]);
            html += '<h4 style="margin:16px 0 8px">By Category</h4>';
            html += this.table(['Category', 'Amount'], Object.entries(byCat).map(([k, v]) => [k, Storage.formatCurrency(v)]));
            html += '<h4 style="margin:16px 0 8px">Details</h4>';
            html += this.table(
                ['Date', 'Category', 'Description', 'Amount', 'Payment'],
                list.sort((a, b) => new Date(b.date) - new Date(a.date)).map(e => [
                    this.fmtDate(e.date), e.category, e.description || '—',
                    Storage.formatCurrency(e.amount), e.paymentMethod || '—'
                ])
            );
        } else if (type === 'profit') {
            const sales = Storage.getArray(Storage.KEYS.SALES).filter(s => this.inRange(s.date, from, to));
            const purchases = Storage.getArray(Storage.KEYS.PURCHASES).filter(p => this.inRange(p.date, from, to));
            const expenses = Storage.getArray(Storage.KEYS.EXPENSES).filter(e => this.inRange(e.date, from, to));
            const salesTotal = sales.reduce((a, s) => a + (s.grandTotal || 0), 0);
            // COGS approx from sale items purchasePrice
            let cogs = 0;
            sales.forEach(s => (s.items || []).forEach(i => { cogs += (i.purchasePrice || 0) * (i.qty || 0); }));
            const purchaseTotal = purchases.reduce((a, p) => a + (p.totalAmount || 0), 0);
            const expenseTotal = expenses.reduce((a, e) => a + (e.amount || 0), 0);
            const grossProfit = salesTotal - cogs;
            const netProfit = grossProfit - expenseTotal;
            html += this.summaryCards([
                ['Sales', Storage.formatCurrency(salesTotal)],
                ['COGS (approx)', Storage.formatCurrency(cogs)],
                ['Gross Profit', Storage.formatCurrency(grossProfit)],
                ['Expenses', Storage.formatCurrency(expenseTotal)],
                ['Net Profit', Storage.formatCurrency(netProfit)],
                ['Purchases (period)', Storage.formatCurrency(purchaseTotal)]
            ]);
            html += `<p style="margin-top:12px;color:var(--text-muted);font-size:0.85rem">COGS is calculated from product purchase price at time of sale items.</p>`;
        } else if (type === 'stock') {
            const products = Products.getAll();
            html += this.summaryCards([
                ['Products', products.length],
                ['Low Stock', products.filter(p => Stock.stockStatus(p) === 'low').length],
                ['Out of Stock', products.filter(p => Stock.stockStatus(p) === 'out').length]
            ]);
            html += this.table(
                ['Product', 'Category', 'Stock', 'Min', 'Purchase', 'Selling', 'Value'],
                products.map(p => {
                    const cat = Categories.getById(p.categoryId);
                    const val = (Number(p.currentStock) || 0) * (Number(p.purchasePrice) || 0);
                    return [
                        p.name, cat ? cat.name : (p.categoryName || '—'),
                        p.currentStock ?? 0, p.minStock ?? 0,
                        Storage.formatCurrency(p.purchasePrice),
                        Storage.formatCurrency(p.sellingPrice),
                        Storage.formatCurrency(val)
                    ];
                })
            );
        } else if (type === 'customer-due') {
            const customers = Storage.getArray(Storage.KEYS.CUSTOMERS).filter(c => (c.due || 0) > 0);
            const totalDue = customers.reduce((a, c) => a + (c.due || 0), 0);
            html += this.summaryCards([['Customers with Due', customers.length], ['Total Due', Storage.formatCurrency(totalDue)]]);
            html += this.table(
                ['Name', 'Mobile', 'Total Purchase', 'Paid', 'Due'],
                customers.sort((a, b) => (b.due || 0) - (a.due || 0)).map(c => [
                    c.name, c.mobile || '—',
                    Storage.formatCurrency(c.totalPurchase),
                    Storage.formatCurrency(c.paid),
                    Storage.formatCurrency(c.due)
                ])
            );
        } else if (type === 'supplier-due') {
            const suppliers = Storage.getArray(Storage.KEYS.SUPPLIERS).filter(s => (s.due || 0) > 0);
            const totalDue = suppliers.reduce((a, s) => a + (s.due || 0), 0);
            html += this.summaryCards([['Suppliers with Due', suppliers.length], ['Total Due', Storage.formatCurrency(totalDue)]]);
            html += this.table(
                ['Name', 'Mobile', 'Total Purchase', 'Paid', 'Due'],
                suppliers.sort((a, b) => (b.due || 0) - (a.due || 0)).map(s => [
                    s.name, s.mobile || '—',
                    Storage.formatCurrency(s.totalPurchase),
                    Storage.formatCurrency(s.paid),
                    Storage.formatCurrency(s.due)
                ])
            );
        } else if (type === 'product-sales') {
            const sales = Storage.getArray(Storage.KEYS.SALES).filter(s => this.inRange(s.date, from, to));
            const map = {};
            sales.forEach(s => (s.items || []).forEach(i => {
                if (!map[i.productId]) map[i.productId] = { name: i.name, qty: 0, amount: 0 };
                map[i.productId].qty += i.qty || 0;
                map[i.productId].amount += i.total || (i.price * i.qty) || 0;
            }));
            const rows = Object.values(map).sort((a, b) => b.amount - a.amount);
            html += this.summaryCards([['Products Sold', rows.length], ['Total Qty', rows.reduce((a, r) => a + r.qty, 0)]]);
            html += this.table(
                ['Product', 'Qty Sold', 'Amount'],
                rows.map(r => [r.name, r.qty, Storage.formatCurrency(r.amount)])
            );
        }

        content.innerHTML = html;
    },

    summaryCards(items) {
        return `<div class="mini-stats" style="margin-bottom:20px">${items.map(([label, val]) =>
            `<div class="mini-stat"><span class="mini-stat-label">${label}</span><span class="mini-stat-value">${val}</span></div>`
        ).join('')}</div>`;
    },

    table(headers, rows) {
        if (!rows.length) return '<p style="color:var(--text-muted)">No data for this period</p>';
        return `<div class="table-responsive"><table class="data-table">
            <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
            <tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody>
        </table></div>`;
    },

    fmtDate(d) {
        if (!d) return '—';
        return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    }
};
window.Reports = Reports;
