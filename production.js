/* ========================================
   Production Module
   ======================================== */

const Production = {
    init() {
        this.bindEvents();
        this.render();
    },

    bindEvents() {
        document.getElementById('btnAddProduction')?.addEventListener('click', () => this.openModal());
        document.getElementById('productionForm')?.addEventListener('submit', (e) => this.save(e));
        document.getElementById('btnAddRawItem')?.addEventListener('click', () => this.addRawRow());
        document.getElementById('productionSearch')?.addEventListener('input', () => this.render());
        document.getElementById('productionDateFrom')?.addEventListener('change', () => this.render());
        document.getElementById('productionDateTo')?.addEventListener('change', () => this.render());
    },

    getAll() { return Storage.getArray(Storage.KEYS.PRODUCTIONS); },

    populateProductSelect() {
        const sel = document.getElementById('prodProduct');
        if (!sel) return;
        sel.innerHTML = '<option value="">Select Product</option>';
        Products.getAll().filter(p => p.status === 'active').forEach(p => {
            sel.innerHTML += `<option value="${p.id}">${escapeHtml(p.name)}</option>`;
        });
    },

    populateRawSelects() {
        // refresh any open rows - mainly for new rows
    },

    rawOptions() {
        let opts = '<option value="">Select Raw Material</option>';
        RawMaterials.getAll().forEach(r => {
            opts += `<option value="${r.id}" data-stock="${r.currentStock || 0}" data-unit="${r.unit || ''}">${escapeHtml(r.name)} (${r.currentStock || 0} ${r.unit || ''})</option>`;
        });
        return opts;
    },

    openModal() {
        document.getElementById('productionForm').reset();
        document.getElementById('productionFormError').classList.remove('show');
        document.getElementById('prodDate').value = Storage.getToday();
        document.getElementById('prodQty').value = 1;
        this.populateProductSelect();
        document.getElementById('prodRawItemsList').innerHTML = '';
        this.addRawRow();
        document.getElementById('productionModal').classList.add('active');
    },

    addRawRow() {
        const list = document.getElementById('prodRawItemsList');
        const row = document.createElement('div');
        row.className = 'purchase-item-row';
        row.style.gridTemplateColumns = '2fr 1fr auto';
        row.innerHTML = `
            <div class="form-group"><label>Raw Material</label><select class="prod-raw" required>${this.rawOptions()}</select></div>
            <div class="form-group"><label>Used Qty</label><input type="number" class="prod-raw-qty" min="0.01" step="0.01" value="1" required></div>
            <button type="button" class="btn-remove-item"><i class="fas fa-times"></i></button>
        `;
        list.appendChild(row);
        row.querySelector('.btn-remove-item').addEventListener('click', () => row.remove());
    },

    collectRawItems() {
        const items = [];
        document.querySelectorAll('#prodRawItemsList .purchase-item-row').forEach(row => {
            const rawId = row.querySelector('.prod-raw').value;
            const qty = parseFloat(row.querySelector('.prod-raw-qty').value) || 0;
            if (!rawId || qty <= 0) return;
            const raw = RawMaterials.getById(rawId);
            items.push({
                rawId,
                name: raw ? raw.name : 'Unknown',
                unit: raw ? raw.unit : '',
                qty
            });
        });
        return items;
    },

    generateRef() {
        const list = this.getAll();
        const today = Storage.getToday().replace(/-/g, '');
        const n = list.filter(p => p.refNo && p.refNo.includes(today)).length + 1;
        return `PRD-${today}-${String(n).padStart(3, '0')}`;
    },

    save(e) {
        e.preventDefault();
        const error = document.getElementById('productionFormError');
        const productId = document.getElementById('prodProduct').value;
        const qty = parseFloat(document.getElementById('prodQty').value) || 0;
        const rawItems = this.collectRawItems();
        const dateVal = document.getElementById('prodDate').value || Storage.getToday();

        if (!productId || qty <= 0) {
            error.textContent = 'Select product and enter quantity';
            error.classList.add('show');
            return;
        }
        if (rawItems.length === 0) {
            error.textContent = 'Add at least one raw material used';
            error.classList.add('show');
            return;
        }

        // Validate raw stock
        for (const item of rawItems) {
            const raw = RawMaterials.getById(item.rawId);
            const stock = raw ? (Number(raw.currentStock) || 0) : 0;
            if (item.qty > stock) {
                error.textContent = `Not enough ${item.name}. Available: ${stock}`;
                error.classList.add('show');
                return;
            }
        }

        const product = Products.getById(productId);
        const now = new Date().toISOString();
        const dateISO = dateVal.includes('T') ? dateVal : dateVal + 'T12:00:00';
        const refNo = this.generateRef();

        // Deduct raw materials
        let raws = RawMaterials.getAll();
        rawItems.forEach(item => {
            const idx = raws.findIndex(r => r.id === item.rawId);
            if (idx !== -1) {
                raws[idx].currentStock = Math.max(0, (Number(raws[idx].currentStock) || 0) - item.qty);
                raws[idx].updatedAt = now;
            }
        });
        Storage.saveData(Storage.KEYS.RAW_MATERIALS, raws);

        // Increase finished product stock
        let products = Products.getAll();
        const pIdx = products.findIndex(p => p.id === productId);
        if (pIdx !== -1) {
            products[pIdx].currentStock = (Number(products[pIdx].currentStock) || 0) + qty;
            products[pIdx].updatedAt = now;
            Storage.saveData(Storage.KEYS.PRODUCTS, products);
        }

        // Stock movements for finished product
        let movements = Storage.getArray(Storage.KEYS.STOCK_MOVEMENTS);
        movements.push({
            id: Storage.generateId('mov'),
            productId,
            productName: product ? product.name : '',
            type: 'in',
            quantity: qty,
            reason: 'Production',
            reference: refNo,
            date: now
        });
        Storage.saveData(Storage.KEYS.STOCK_MOVEMENTS, movements);

        // Save production record
        const productions = this.getAll();
        productions.push({
            id: Storage.generateId('prd'),
            refNo,
            productId,
            productName: product ? product.name : '',
            quantity: qty,
            rawMaterials: rawItems,
            date: dateISO,
            note: document.getElementById('prodNote').value.trim(),
            createdAt: now
        });
        Storage.saveData(Storage.KEYS.PRODUCTIONS, productions);

        document.getElementById('productionModal').classList.remove('active');
        showToast('Production completed! Stock updated.', 'success');
        this.render();
        if (window.RawMaterials) RawMaterials.render();
        if (window.Products) Products.render();
        if (window.Stock) Stock.render();
        if (window.Dashboard) Dashboard.update();
        if (window.POS) POS.renderProducts();
    },

    confirmDelete(id) {
        const prod = this.getAll().find(p => p.id === id);
        if (!prod) return;
        document.getElementById('confirmMessage').textContent =
            `Delete production ${prod.refNo}? This will NOT reverse stock automatically.`;
        Categories.deleteCallback = () => {
            Storage.saveData(Storage.KEYS.PRODUCTIONS, this.getAll().filter(p => p.id !== id));
            showToast('Deleted', 'success');
            this.render();
        };
        document.getElementById('confirmModal').classList.add('active');
    },

    render() {
        const tbody = document.getElementById('productionBody');
        if (!tbody) return;
        const search = (document.getElementById('productionSearch')?.value || '').toLowerCase();
        const from = document.getElementById('productionDateFrom')?.value || '';
        const to = document.getElementById('productionDateTo')?.value || '';

        let list = this.getAll();
        if (search) list = list.filter(p =>
            (p.refNo || '').toLowerCase().includes(search) ||
            (p.productName || '').toLowerCase().includes(search)
        );
        if (from) list = list.filter(p => (p.date || '') >= from);
        if (to) list = list.filter(p => (p.date || '').split('T')[0] <= to);

        const all = this.getAll();
        const today = Storage.getToday();
        const todayQty = all.filter(p => p.date && p.date.startsWith(today))
            .reduce((s, p) => s + (p.quantity || 0), 0);
        const el = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
        el('prodStatCount', all.length);
        el('prodStatToday', todayQty);

        if (!list.length) {
            tbody.innerHTML = `<tr class="empty-row"><td colspan="6" class="empty-state"><i class="fas fa-industry"></i><p>No production yet</p></td></tr>`;
            return;
        }
        list.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
        tbody.innerHTML = list.map(p => {
            const d = p.date ? new Date(p.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
            const raws = (p.rawMaterials || []).map(r => `${r.name}: ${r.qty}${r.unit || ''}`).join(', ');
            return `<tr>
                <td><strong>${escapeHtml(p.refNo)}</strong></td>
                <td>${escapeHtml(p.productName)}</td>
                <td>${d}</td>
                <td><span class="stock-badge ok">${p.quantity}</span></td>
                <td style="max-width:220px;font-size:0.85rem">${escapeHtml(raws) || '—'}</td>
                <td><div class="action-btns">
                    <button class="btn btn-icon delete" onclick="Production.confirmDelete('${p.id}')"><i class="fas fa-trash"></i></button>
                </div></td>
            </tr>`;
        }).join('');
    }
};
window.Production = Production;
