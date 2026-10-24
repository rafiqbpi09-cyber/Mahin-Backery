/* ========================================
   Dashboard Module
   ======================================== */

let salesChart = null;

/**
 * Update all dashboard stats
 */
function updateDashboard() {
    const sales = Storage.getArray(Storage.KEYS.SALES);
    const purchases = Storage.getArray(Storage.KEYS.PURCHASES);
    const expenses = Storage.getArray(Storage.KEYS.EXPENSES);
    const products = Storage.getArray(Storage.KEYS.PRODUCTS);
    const customers = Storage.getArray(Storage.KEYS.CUSTOMERS);
    const suppliers = Storage.getArray(Storage.KEYS.SUPPLIERS);
    const orders = Storage.getArray(Storage.KEYS.ORDERS);
    const today = Storage.getToday();

    // Today's Sales
    const todaySalesList = sales.filter(s => s.date && s.date.startsWith(today));
    const todaySalesTotal = todaySalesList.reduce((sum, s) => sum + (Number(s.grandTotal) || 0), 0);
    document.getElementById('todaySales').textContent = Storage.formatCurrency(todaySalesTotal);

    // Today's Purchase
    const todayPurchaseList = purchases.filter(p => p.date && p.date.startsWith(today));
    const todayPurchaseTotal = todayPurchaseList.reduce((sum, p) => sum + (Number(p.totalAmount) || 0), 0);
    document.getElementById('todayPurchase').textContent = Storage.formatCurrency(todayPurchaseTotal);

    // Today's Expense
    const todayExpenseList = expenses.filter(e => e.date && e.date.startsWith(today));
    const todayExpenseTotal = todayExpenseList.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    document.getElementById('todayExpense').textContent = Storage.formatCurrency(todayExpenseTotal);

    // Today's Profit = Sales - COGS - Expenses
    let todayCOGS = 0;
    todaySalesList.forEach(s => {
        (s.items || []).forEach(item => {
            todayCOGS += (Number(item.purchasePrice) || 0) * (Number(item.qty) || 0);
        });
    });
    const todayProfit = todaySalesTotal - todayCOGS - todayExpenseTotal;
    document.getElementById('todayProfit').textContent = Storage.formatCurrency(todayProfit);
    const profitEl = document.getElementById('todayProfit');
    if (profitEl) {
        profitEl.style.color = todayProfit >= 0 ? '' : 'var(--danger)';
    }

    // Products
    document.getElementById('totalProducts').textContent = products.length;

    // Low Stock
    const lowStock = products.filter(p => {
        const stock = Number(p.currentStock) || 0;
        const min = Number(p.minStock) || 0;
        return stock <= min && stock >= 0;
    });
    document.getElementById('lowStockProducts').textContent = lowStock.length;

    // Customers & Suppliers
    document.getElementById('totalCustomers').textContent = customers.length;
    document.getElementById('totalSuppliers').textContent = suppliers.length;

    // Orders
    const todayOrdersList = orders.filter(o => o.date && o.date.startsWith(today));
    document.getElementById('todayOrders').textContent = todayOrdersList.length;

    const pendingOrders = orders.filter(o => o.status === 'pending' || o.status === 'Pending');
    document.getElementById('pendingOrders').textContent = pendingOrders.length;

    // Payment Summary (from all sales or today's)
    const allPaid = sales.reduce((sum, s) => sum + (Number(s.paidAmount) || 0), 0);
    const allDue = sales.reduce((sum, s) => sum + (Number(s.dueAmount) || 0), 0);
    document.getElementById('paidAmount').textContent = Storage.formatCurrency(allPaid);
    document.getElementById('dueAmount').textContent = Storage.formatCurrency(allDue);

    const totalPayment = allPaid + allDue;
    const paidPercent = totalPayment > 0 ? Math.round((allPaid / totalPayment) * 100) : 0;
    document.getElementById('paymentProgress').style.width = paidPercent + '%';
    document.getElementById('paymentProgressText').textContent = paidPercent + '% Paid';

    // Recent Sales
    renderRecentSales(sales);

    // Low Stock List
    renderLowStockList(lowStock);

    // Chart
    renderSalesChart(sales, 'week');
    if (window.updateNotifications) updateNotifications();
}

/**
 * Render recent sales table
 */
function renderRecentSales(sales) {
    const tbody = document.getElementById('recentSalesBody');
    if (!tbody) return;

    const recent = [...sales]
        .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
        .slice(0, 5);

    if (recent.length === 0) {
        tbody.innerHTML = `
            <tr class="empty-row">
                <td colspan="5" class="empty-state">
                    <i class="fas fa-receipt"></i>
                    <p data-i18n="noRecentSales">${window.i18n ? i18n.t('noRecentSales') : 'No recent sales yet'}</p>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = recent.map(sale => {
        const statusClass = (sale.dueAmount > 0) ? 'due' : 'paid';
        const statusText = (sale.dueAmount > 0) ? 'Due' : 'Paid';
        const time = sale.date ? new Date(sale.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';

        return `
            <tr>
                <td><strong>${sale.invoiceNo || sale.id || '—'}</strong></td>
                <td>${sale.customerName || 'Walk-in'}</td>
                <td>${Storage.formatCurrency(sale.grandTotal)}</td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td>${time}</td>
            </tr>
        `;
    }).join('');
}

/**
 * Render low stock alert list
 */
function renderLowStockList(lowStock) {
    const list = document.getElementById('lowStockList');
    if (!list) return;

    if (lowStock.length === 0) {
        list.innerHTML = `
            <li class="empty-state">
                <i class="fas fa-check-circle"></i>
                <p data-i18n="allStockOk">${window.i18n ? i18n.t('allStockOk') : 'All products have sufficient stock'}</p>
            </li>
        `;
        return;
    }

    list.innerHTML = lowStock.slice(0, 6).map(p => `
        <li class="alert-item">
            <div class="product-name">${p.name || 'Unknown'}</div>
            <span class="stock-count">${p.currentStock || 0} left</span>
        </li>
    `).join('');
}

/**
 * Render sales chart
 */
function renderSalesChart(sales, period = 'week') {
    const canvas = document.getElementById('salesChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    // Destroy previous chart
    if (salesChart) {
        salesChart.destroy();
    }

    let labels = [];
    let data = [];

    if (period === 'week') {
        // Last 7 days
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            labels.push(d.toLocaleDateString('en-US', { weekday: 'short' }));

            const dayTotal = sales
                .filter(s => s.date && s.date.startsWith(dateStr))
                .reduce((sum, s) => sum + (Number(s.grandTotal) || 0), 0);
            data.push(dayTotal);
        }
    } else {
        // Last 30 days grouped by week or last 12 months - simple: last 30 days as 6 groups
        for (let i = 5; i >= 0; i--) {
            const end = new Date();
            end.setDate(end.getDate() - (i * 5));
            const start = new Date(end);
            start.setDate(start.getDate() - 4);

            const startStr = start.toISOString().split('T')[0];
            const endStr = end.toISOString().split('T')[0];

            labels.push(start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));

            const rangeTotal = sales
                .filter(s => {
                    if (!s.date) return false;
                    const d = s.date.split('T')[0];
                    return d >= startStr && d <= endStr;
                })
                .reduce((sum, s) => sum + (Number(s.grandTotal) || 0), 0);
            data.push(rangeTotal);
        }
    }

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';
    const textColor = isDark ? '#C4B5A5' : '#6B5B4F';

    salesChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Sales',
                data: data,
                borderColor: '#D4A373',
                backgroundColor: 'rgba(212, 163, 115, 0.12)',
                borderWidth: 2.5,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#D4A373',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: isDark ? '#2C1810' : '#fff',
                    titleColor: isDark ? '#F8F5F0' : '#2C1810',
                    bodyColor: isDark ? '#C4B5A5' : '#6B5B4F',
                    borderColor: isDark ? '#3D2A1F' : '#E8DFD3',
                    borderWidth: 1,
                    padding: 12,
                    callbacks: {
                        label: function(ctx) {
                            return '৳ ' + ctx.parsed.y.toLocaleString();
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: textColor, font: { size: 11 } }
                },
                y: {
                    beginAtZero: true,
                    grid: { color: gridColor },
                    ticks: {
                        color: textColor,
                        font: { size: 11 },
                        callback: function(value) {
                            if (value >= 1000) return '৳' + (value / 1000) + 'k';
                            return '৳' + value;
                        }
                    }
                }
            }
        }
    });
}

/**
 * Setup chart filter buttons
 */
function setupChartFilters() {
    document.querySelectorAll('.chart-filter').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.chart-filter').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            const period = this.dataset.period;
            const sales = Storage.getArray(Storage.KEYS.SALES);
            renderSalesChart(sales, period);
        });
    });
}

// Export
window.Dashboard = {
    update: updateDashboard,
    setupChartFilters
};
