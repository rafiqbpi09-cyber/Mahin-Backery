/* ========================================
   Stock Module — Live Adjust
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

        // Live: show current stock when product changes
        document.getElementById('adjustProduct')?.addEventListener('change', () => this.onProductChange());
        document.getElementById('adjustType')?.addEventListener('change', () => this.updatePreview());
        document.getElementById('adjustQty')?.addEventListener('input', () => this.updatePreview());
    },

    getProducts() {
        if (window.Products && typeof Products.getAll === 'function') {
            return Products.getAll();
        }
        return Storage.getArray(Storage.KEYS.PRODUCTS);
    },

    stockStatus(p) {
        const stock = Number(p.currentStock) || 0;
        const min = Number(p.minStock) || 0;
        if (stock <= 0) return 'out';
        if (stock <= min) return 'low';
        return 'ok';
    },

    openAdjust(preselectId = null) {
        const sel = document.getElementById('adjustProduct');
        const form = document.getElementById('stockAdjustForm');
        const modal = document.getElementById('stockAdjustModal');
        const error = document.getElementById('stockAdjustError');

        if (!sel || !form || !modal) {
            showToast('Stock adjust form not found', 'error');
            return;
        }

        const products = this.getProducts();
        sel.innerHTML = '<option value="">Select Product</option>';

        if (products.length === 0) {
            sel.innerHTML = '<option value="">No products — add from Products menu</option>';
        } else {
            products
                .slice()
                .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
                .forEach(p => {
                    const stock = Number(p.currentStock) || 0;
                    const mark = this.stockStatus(p) === 'low' ? ' ⚠' : (this.stockStatus(p) === 'out' ? ' ✕' : '');
                    sel.innerHTML += `<option value="${p.id}" data-stock="${stock}">${escapeHtml(p.name)} — ${stock}${mark}</option>`;
                });
        }

        form.reset();
        if (error) {
            error.textContent = '';
            error.classList.remove('show');
        }

        // Ensure preview element
        let preview = document.getElementById('adjustPreview');
        if (!preview) {
            const qtyGroup = document.getElementById('adjustQty')?.closest('.form-group');
            if (qtyGroup && qtyGroup.parentNode) {
                preview = document.createElement('p');
                preview.id = 'adjustPreview';
                preview.style.cssText = 'font-size:0.9rem;color:var(--text-secondary);margin-top:4px;';
                qtyGroup.parentNode.insertBefore(preview, qtyGroup.nextSibling);
            }
        }
        if (preview) preview.textContent = '';

        if (preselectId) sel.value = preselectId;
        document.getElementById('adjustType').value = 'in';
        document.getElementById('adjustQty').value = '';
        document.getElementById('adjustReason').value = '';

        modal.classList.add('active');
        setTimeout(() => sel.focus(), 80);
        this.onProductChange();
    },

    onProductChange() {
        const sel = document.getElementById('adjustProduct');
        const opt = sel?.selectedOptions[0];
        const stock = opt ? (opt.dataset.stock || '0') : '—';
        let info = document.getElementById('adjustCurrentStockInfo');
        if (!info && sel) {
            info = document.createElement('p');
            info.id = 'adjustCurrentStockInfo';
            info.style.cssText = 'font-size:0.85rem;color:var(--text-muted);margin-top:6px;';
            sel.parentNode.appendChild(info);
        }
        if (info) {
            info.textContent = sel?.value ? `Current stock: ${stock}` : '';
        }
        this.updatePreview();
    },

    updatePreview() {
        const preview = document.getElementById('adjustPreview');
        if (!preview) return;

        const sel = document.getElementById('adjustProduct');
        const type = document.getElementById('adjustType')?.value || 'in';
        const qty = parseFloat(document.getElementById('adjustQty')?.value) || 0;
        const opt = sel?.selectedOptions[0];
        if (!sel?.value || !opt) {
            preview.textContent = '';
            return;
        }

        const oldStock = parseFloat(opt.dataset.stock) || 0;
        let newStock = oldStock;
        if (type === 'in') newStock = oldStock + qty;
        else if (type === 'out') newStock = Math.max(0, oldStock - qty);
        else newStock = qty; // set

        preview.innerHTML = `Preview: <strong>${oldStock}</strong> → <strong style="color:var(--primary-dark)">${newStock}</strong>`;
    },

    saveAdjust(e) {
        e.preventDefault();
        const error = document.getElementById('stockAdjustError');
        const showErr = (msg) => {
            if (error) {
                error.textContent = msg;
                error.classList.add('show');
            }
            showToast(msg, 'error');
        };

        const productId = document.getElementById('adjustProduct')?.value;
        const type = document.getElementById('adjustType')?.value || 'in';
        const qty = parseFloat(document.getElementById('adjustQty')?.value);
        const reason = (document.getElementById('adjustReason')?.value || '').trim() || 'Manual adjustment';

        if (!productId) {
            showErr('Select a product');
            return;
        }
        if (isNaN(qty) || qty < 0) {
            showErr('Enter a valid quantity (0 or more)');
            return;
        }
        if (type !== 'set' && qty === 0) {
            showErr('Quantity must be greater than 0');
            return;
        }

        let products = this.getProducts();
        const idx = products.findIndex(p => p.id === productId);
        if (idx === -1) {
            showErr('Product not found');
            return;
        }

        const oldStock = Number(products[idx].currentStock) || 0;
        let newStock = oldStock;
        let movType = type;
        let movQty = qty;

        if (type === 'in') {
            newStock = oldStock + qty;
            movType = 'in';
            movQty = qty;
        } else if (type === 'out') {
            if (qty > oldStock) {
                showErr(`Only ${oldStock} in stock. Cannot remove ${qty}.`);
                return;
            }
            newStock = oldStock - qty;
            movType = 'out';
            movQty = qty;
        } else {
            // set exact
            newStock = qty;
            movType = qty >= oldStock ? 'in' : 'out';
            movQty = Math.abs(qty - oldStock);
        }

        products[idx].currentStock = newStock;
        products[idx].updatedAt = new Date().toISOString();
        Storage.saveData(Storage.KEYS.PRODUCTS, products);

        if (movQty > 0) {
            let movements = Storage.getArray(Storage.KEYS.STOCK_MOVEMENTS);
            movements.unshift({
                id: Storage.generateId('mov'),
                productId,
                productName: products[idx].name,
                type: movType,
                quantity: movQty,
                reason,
                reference: 'ADJ',
                before: oldStock,
                after: newStock,
                date: new Date().toISOString()
            });
            // keep last 500
            if (movements.length > 500) movements = movements.slice(0, 500);
            Storage.saveData(Storage.KEYS.STOCK_MOVEMENTS, movements);
        }

        document.getElementById('stockAdjustModal')?.classList.remove('active');
        showToast(`${products[idx].name}: ${oldStock} → ${newStock}`, 'success');

        this.render();
        if (window.Products) Products.render();
        if (window.Dashboard) Dashboard.update();
        if (window.POS) POS.renderProducts();
        if (window.updateNotifications) updateNotifications();
    },

    /** Quick adjust from stock table row */
    quickAdjust(productId) {
        this.openAdjust(productId);
    },

    render() {
        const tbody = document.getElementById('stockTableBody');
        const movBody = document.getElementById('stockMovementBody');
        if (!tbody) return;

        const search = (document.getElementById('stockSearch')?.value || '').toLowerCase();
        const filter = document.getElementById('stockFilter')?.value || '';

        let products = this.getProducts();
        if (search) {
            products = products.filter(p =>
                (p.name || '').toLowerCase().includes(search) ||
                (p.code || '').toLowerCase().includes(search)
            );
        }
        if (filter) {
            products = products.filter(p => this.stockStatus(p) === filter);
        }

        const all = this.getProducts();
        const el = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
        el('stkStatTotal', all.length);
        el('stkStatOk', all.filter(p => this.stockStatus(p) === 'ok').length);
        el('stkStatLow', all.filter(p => this.stockStatus(p) === 'low').length);
        el('stkStatOut', all.filter(p => this.stockStatus(p) === 'out').length);

        const labels = { ok: 'In Stock', low: 'Low', out: 'Out' };

        if (!products.length) {
            tbody.innerHTML = `<tr class="empty-row"><td colspan="6" class="empty-state"><i class="fas fa-boxes"></i><p>No products found</p></td></tr>`;
        } else {
            products.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
            tbody.innerHTML = products.map(p => {
                const st = this.stockStatus(p);
                let catName = p.categoryName || '—';
                if (window.Categories && p.categoryId) {
                    const c = Categories.getById(p.categoryId);
                    if (c) catName = c.name;
                }
                return `<tr>
                    <td><strong>${escapeHtml(p.name)}</strong>${p.code ? '<br><small style="color:var(--text-muted)">' + escapeHtml(p.code) + '</small>' : ''}</td>
                    <td>${escapeHtml(catName)}</td>
                    <td><span class="stock-badge ${st}">${p.currentStock ?? 0}</span></td>
                    <td>${p.minStock ?? 0}</td>
                    <td><span class="stock-badge ${st}">${labels[st]}</span></td>
                    <td>
                        <button class="btn btn-icon edit" title="Adjust" onclick="Stock.quickAdjust('${p.id}')">
                            <i class="fas fa-sliders-h"></i>
                        </button>
                    </td>
                </tr>`;
            }).join('');
        }

        // Movements
        if (movBody) {
            let mov = Storage.getArray(Storage.KEYS.STOCK_MOVEMENTS)
                .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
                .slice(0, 80);

            if (!mov.length) {
                movBody.innerHTML = `<tr class="empty-row"><td colspan="5" class="empty-state"><p>No movements yet. Adjust stock to see history.</p></td></tr>`;
            } else {
                movBody.innerHTML = mov.map(m => {
                    const d = m.date
                        ? new Date(m.date).toLocaleString('en-GB', {
                            day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                        })
                        : '—';
                    const typeClass = m.type === 'in' ? 'ok' : 'out';
                    const change = m.before !== undefined
                        ? `${m.before}→${m.after}`
                        : m.quantity;
                    return `<tr>
                        <td>${d}</td>
                        <td>${escapeHtml(m.productName)}</td>
                        <td><span class="stock-badge ${typeClass}">${(m.type || '').toUpperCase()}</span></td>
                        <td>${change}</td>
                        <td>${escapeHtml(m.reason || '—')}${m.reference ? ' <small>(' + escapeHtml(m.reference) + ')</small>' : ''}</td>
                    </tr>`;
                }).join('');
            }
        }
    }
};

window.Stock = Stock;
