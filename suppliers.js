/* ========================================
   Suppliers Module
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
