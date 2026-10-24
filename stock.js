/* ========================================
   Stock Module
   ======================================== */

const Stock = {
    init() {
        this.bindEvents();
        this.render();
    },

    bindEvents() {
        document.getElementById('btnStockAdjust')?.addEventListener('click', () => this.openAdjust());
        document.getElementById('stockAdjustForm')?.addEventListener('submit', (e) => this.saveAdjust(e));
        document.getElementById('stockSearch')?.addEventListener('input', () => this.render());
        document.getElementById('stockFilter')?.addEventListener('change', () => this.render());
    },

    stockStatus(p) {
        const stock = Number(p.currentStock) || 0;
        const min = Number(p.minStock) || 0;
        if (stock <= 0) return 'out';
        if (stock <= min) return 'low';
        return 'ok';
    },

    openAdjust() {
        const sel = document.getElementById('adjustProduct');
        const products = Products.getAll();
        sel.innerHTML = '<option value="">Select Product</option>';
        products.forEach(p => {
            sel.innerHTML += `<option value="${p.id}">${escapeHtml(p.name)} (${p.currentStock || 0})</option>`;
        });
        document.getElementById('stockAdjustForm').reset();
        document.getElementById('stockAdjustError').classList.remove('show');
        document.getElementById('stockAdjustModal').classList.add('active');
    },

    saveAdjust(e) {
        e.preventDefault();
        const error = document.getElementById('stockAdjustError');
        const productId = document.getElementById('adjustProduct').value;
        const type = document.getElementById('adjustType').value;
        const qty = parseFloat(document.getElementById('adjustQty').value) || 0;
        const reason = document.getElementById('adjustReason').value.trim() || 'Adjustment';

        if (!productId || qty < 0) {
            error.textContent = 'Select product and enter valid quantity';
            error.classList.add('show');
            return;
        }

        let products = Products.getAll();
        const idx = products.findIndex(p => p.id === productId);
        if (idx === -1) return;

        const oldStock = Number(products[idx].currentStock) || 0;
        let newStock = oldStock;
        let movType = type;
        let movQty = qty;

        if (type === 'in') {
            newStock = oldStock + qty;
        } else if (type === 'out') {
            newStock = Math.max(0, oldStock - qty);
            movQty = Math.min(qty, oldStock);
        } else {
            // set
            newStock = qty;
            movType = qty >= oldStock ? 'in' : 'out';
            movQty = Math.abs(qty - oldStock);
        }

        products[idx].currentStock = newStock;
        products[idx].updatedAt = new Date().toISOString();
        Storage.saveData(Storage.KEYS.PRODUCTS, products);

        if (movQty > 0) {
            let movements = Storage.getArray(Storage.KEYS.STOCK_MOVEMENTS);
            movements.push({
                id: Storage.generateId('mov'),
                productId,
                productName: products[idx].name,
                type: movType,
                quantity: movQty,
                reason,
                reference: 'ADJ',
                date: new Date().toISOString()
            });
            Storage.saveData(Storage.KEYS.STOCK_MOVEMENTS, movements);
        }

        document.getElementById('stockAdjustModal').classList.remove('active');
        showToast('Stock updated', 'success');
        this.render();
        if (window.Products) Products.render();
        if (window.Dashboard) Dashboard.update();
        if (window.POS) POS.renderProducts();
    },

    render() {
        const tbody = document.getElementById('stockTableBody');
        const movBody = document.getElementById('stockMovementBody');
        if (!tbody) return;

        const search = (document.getElementById('stockSearch')?.value || '').toLowerCase();
        const filter = document.getElementById('stockFilter')?.value || '';

        let products = Products.getAll();
        if (search) {
            products = products.filter(p =>
                (p.name || '').toLowerCase().includes(search) ||
                (p.code || '').toLowerCase().includes(search)
            );
        }
        if (filter) {
            products = products.filter(p => this.stockStatus(p) === filter);
        }

        const all = Products.getAll();
        const el = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
        el('stkStatTotal', all.length);
        el('stkStatOk', all.filter(p => this.stockStatus(p) === 'ok').length);
        el('stkStatLow', all.filter(p => this.stockStatus(p) === 'low').length);
        el('stkStatOut', all.filter(p => this.stockStatus(p) === 'out').length);

        const labels = { ok: 'In Stock', low: 'Low', out: 'Out' };
        if (!products.length) {
            tbody.innerHTML = `<tr class="empty-row"><td colspan="5" class="empty-state"><p>No products</p></td></tr>`;
        } else {
            products.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
            tbody.innerHTML = products.map(p => {
                const st = this.stockStatus(p);
                const cat = Categories.getById(p.categoryId);
                return `<tr>
                    <td><strong>${escapeHtml(p.name)}</strong></td>
                    <td>${escapeHtml(cat ? cat.name : p.categoryName || '—')}</td>
                    <td><span class="stock-badge ${st}">${p.currentStock ?? 0}</span></td>
                    <td>${p.minStock ?? 0}</td>
                    <td><span class="stock-badge ${st}">${labels[st]}</span></td>
                </tr>`;
            }).join('');
        }

        // Movements
        if (movBody) {
            let mov = Storage.getArray(Storage.KEYS.STOCK_MOVEMENTS)
                .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
                .slice(0, 50);

            if (!mov.length) {
                movBody.innerHTML = `<tr class="empty-row"><td colspan="5" class="empty-state"><p>No movements yet</p></td></tr>`;
            } else {
                movBody.innerHTML = mov.map(m => {
                    const d = m.date ? new Date(m.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';
                    const typeClass = m.type === 'in' ? 'ok' : 'out';
                    return `<tr>
                        <td>${d}</td>
                        <td>${escapeHtml(m.productName)}</td>
                        <td><span class="stock-badge ${typeClass}">${m.type === 'in' ? 'IN' : 'OUT'}</span></td>
                        <td>${m.quantity}</td>
                        <td>${escapeHtml(m.reason || '—')} ${m.reference ? '(' + escapeHtml(m.reference) + ')' : ''}</td>
                    </tr>`;
                }).join('');
            }
        }
    }
};
window.Stock = Stock;
