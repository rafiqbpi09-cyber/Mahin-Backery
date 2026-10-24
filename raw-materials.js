/* ========================================
   Raw Materials Module
   ======================================== */

const RawMaterials = {
    editingId: null,

    init() {
        this.bindEvents();
        this.seedDefaults();
        this.render();
    },

    seedDefaults() {
        let items = Storage.getArray(Storage.KEYS.RAW_MATERIALS);
        if (items.length > 0) return;
        const defaults = [
            { name: 'Flour', unit: 'kg', minStock: 10 },
            { name: 'Sugar', unit: 'kg', minStock: 5 },
            { name: 'Oil', unit: 'ltr', minStock: 2 },
            { name: 'Butter', unit: 'kg', minStock: 2 },
            { name: 'Milk', unit: 'ltr', minStock: 5 },
            { name: 'Egg', unit: 'pcs', minStock: 30 },
            { name: 'Chocolate', unit: 'kg', minStock: 1 },
            { name: 'Cream', unit: 'ltr', minStock: 2 },
            { name: 'Yeast', unit: 'g', minStock: 100 }
        ];
        items = defaults.map(d => ({
            id: Storage.generateId('raw'),
            name: d.name,
            unit: d.unit,
            currentStock: 0,
            minStock: d.minStock,
            purchasePrice: 0,
            supplierId: null,
            supplierName: '',
            expiryDate: null,
            createdAt: new Date().toISOString()
        }));
        Storage.saveData(Storage.KEYS.RAW_MATERIALS, items);
    },

    bindEvents() {
        document.getElementById('btnAddRaw')?.addEventListener('click', () => this.openModal());
        document.getElementById('rawForm')?.addEventListener('submit', (e) => this.save(e));
        document.getElementById('rawSearch')?.addEventListener('input', () => this.render());
        document.getElementById('rawStockFilter')?.addEventListener('change', () => this.render());
    },

    getAll() { return Storage.getArray(Storage.KEYS.RAW_MATERIALS); },
    getById(id) { return this.getAll().find(r => r.id === id); },

    stockStatus(r) {
        const s = Number(r.currentStock) || 0;
        const m = Number(r.minStock) || 0;
        if (s <= 0) return 'out';
        if (s <= m) return 'low';
        return 'ok';
    },

    populateSuppliers() {
        const sel = document.getElementById('rawSupplier');
        if (!sel) return;
        const cur = sel.value;
        sel.innerHTML = '<option value="">—</option>';
        Suppliers.getAll().forEach(s => {
            sel.innerHTML += `<option value="${s.id}">${escapeHtml(s.name)}</option>`;
        });
        if (cur) sel.value = cur;
    },

    openModal(item = null) {
        this.editingId = item ? item.id : null;
        this.populateSuppliers();
        document.getElementById('rawForm').reset();
        document.getElementById('rawFormError').classList.remove('show');
        document.getElementById('rawModalTitle').textContent = item ? 'Edit Raw Material' : 'Add Raw Material';
        document.getElementById('rawName').value = item ? item.name : '';
        document.getElementById('rawUnit').value = item ? (item.unit || 'kg') : 'kg';
        document.getElementById('rawStock').value = item ? (item.currentStock ?? 0) : 0;
        document.getElementById('rawMinStock').value = item ? (item.minStock ?? 5) : 5;
        document.getElementById('rawPrice').value = item ? (item.purchasePrice ?? 0) : 0;
        document.getElementById('rawSupplier').value = item ? (item.supplierId || '') : '';
        document.getElementById('rawExpiry').value = item ? (item.expiryDate || '') : '';
        document.getElementById('rawModal').classList.add('active');
        document.getElementById('rawName').focus();
    },

    save(e) {
        e.preventDefault();
        const error = document.getElementById('rawFormError');
        const name = document.getElementById('rawName').value.trim();
        if (!name) {
            error.textContent = 'Name is required';
            error.classList.add('show');
            return;
        }
        const supplierId = document.getElementById('rawSupplier').value;
        const sup = supplierId ? Suppliers.getById(supplierId) : null;
        const data = {
            name,
            unit: document.getElementById('rawUnit').value,
            currentStock: parseFloat(document.getElementById('rawStock').value) || 0,
            minStock: parseFloat(document.getElementById('rawMinStock').value) || 0,
            purchasePrice: parseFloat(document.getElementById('rawPrice').value) || 0,
            supplierId: supplierId || null,
            supplierName: sup ? sup.name : '',
            expiryDate: document.getElementById('rawExpiry').value || null,
            updatedAt: new Date().toISOString()
        };
        let items = this.getAll();
        if (this.editingId) {
            const idx = items.findIndex(r => r.id === this.editingId);
            if (idx !== -1) items[idx] = { ...items[idx], ...data };
            showToast('Raw material updated', 'success');
        } else {
            items.push({ id: Storage.generateId('raw'), ...data, createdAt: new Date().toISOString() });
            showToast('Raw material added', 'success');
        }
        Storage.saveData(Storage.KEYS.RAW_MATERIALS, items);
        document.getElementById('rawModal').classList.remove('active');
        this.render();
        if (window.Production) Production.populateRawSelects();
    },

    confirmDelete(id) {
        const item = this.getById(id);
        if (!item) return;
        document.getElementById('confirmMessage').textContent = `Delete "${item.name}"?`;
        Categories.deleteCallback = () => {
            Storage.saveData(Storage.KEYS.RAW_MATERIALS, this.getAll().filter(r => r.id !== id));
            showToast('Deleted', 'success');
            this.render();
        };
        document.getElementById('confirmModal').classList.add('active');
    },

    render() {
        const tbody = document.getElementById('rawMaterialsBody');
        if (!tbody) return;
        const search = (document.getElementById('rawSearch')?.value || '').toLowerCase();
        const filter = document.getElementById('rawStockFilter')?.value || '';
        let items = this.getAll();
        if (search) items = items.filter(r => (r.name || '').toLowerCase().includes(search));
        if (filter) items = items.filter(r => this.stockStatus(r) === filter);

        const all = this.getAll();
        const el = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
        el('rawStatTotal', all.length);
        el('rawStatLow', all.filter(r => this.stockStatus(r) === 'low').length);
        el('rawStatOut', all.filter(r => this.stockStatus(r) === 'out').length);

        if (!items.length) {
            tbody.innerHTML = `<tr class="empty-row"><td colspan="8" class="empty-state"><i class="fas fa-wheat-awn"></i><p>No raw materials yet</p></td></tr>`;
            return;
        }
        items.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        tbody.innerHTML = items.map(r => {
            const st = this.stockStatus(r);
            return `<tr>
                <td><strong>${escapeHtml(r.name)}</strong></td>
                <td>${escapeHtml(r.unit)}</td>
                <td><span class="stock-badge ${st}">${r.currentStock ?? 0}</span></td>
                <td>${r.minStock ?? 0}</td>
                <td>${Storage.formatCurrency(r.purchasePrice)}</td>
                <td>${escapeHtml(r.supplierName) || '—'}</td>
                <td>${r.expiryDate || '—'}</td>
                <td><div class="action-btns">
                    <button class="btn btn-icon edit" onclick="RawMaterials.openModal(RawMaterials.getById('${r.id}'))"><i class="fas fa-pen"></i></button>
                    <button class="btn btn-icon delete" onclick="RawMaterials.confirmDelete('${r.id}')"><i class="fas fa-trash"></i></button>
                </div></td>
            </tr>`;
        }).join('');
    }
};
window.RawMaterials = RawMaterials;
