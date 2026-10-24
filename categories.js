/* ========================================
   Categories Module
   ======================================== */

const Categories = {
    editingId: null,
    deleteCallback: null,

    init() {
        this.bindEvents();
        this.render();
    },

    bindEvents() {
        const addBtn = document.getElementById('btnAddCategory');
        if (addBtn) addBtn.addEventListener('click', () => this.openModal());

        const form = document.getElementById('categoryForm');
        if (form) form.addEventListener('submit', (e) => this.save(e));

        const search = document.getElementById('categorySearch');
        if (search) search.addEventListener('input', () => this.render());

        // Modal close buttons
        document.querySelectorAll('[data-close-modal]').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-close-modal');
                this.closeModal(id);
            });
        });

        // Overlay click close
        document.querySelectorAll('.modal-overlay').forEach(overlay => {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    overlay.classList.remove('active');
                }
            });
        });

        // Confirm delete
        const confirmBtn = document.getElementById('btnConfirmDelete');
        if (confirmBtn) {
            confirmBtn.addEventListener('click', () => {
                if (typeof this.deleteCallback === 'function') {
                    this.deleteCallback();
                    this.deleteCallback = null;
                }
                this.closeModal('confirmModal');
            });
        }
    },

    getAll() {
        return Storage.getArray(Storage.KEYS.CATEGORIES);
    },

    getById(id) {
        return this.getAll().find(c => c.id === id);
    },

    openModal(category = null) {
        this.editingId = category ? category.id : null;
        const title = document.getElementById('categoryModalTitle');
        const form = document.getElementById('categoryForm');
        const error = document.getElementById('categoryFormError');

        if (title) {
            title.textContent = category
                ? (window.i18n ? i18n.t('editCategory') || 'Edit Category' : 'Edit Category')
                : (window.i18n ? i18n.t('addCategory') || 'Add Category' : 'Add Category');
            title.setAttribute('data-i18n', category ? 'editCategory' : 'addCategory');
        }

        if (form) form.reset();
        if (error) {
            error.classList.remove('show');
            error.textContent = '';
        }

        document.getElementById('categoryId').value = category ? category.id : '';
        document.getElementById('categoryName').value = category ? category.name : '';
        document.getElementById('categoryNameBn').value = category ? (category.nameBn || '') : '';
        document.getElementById('categoryStatus').value = category ? (category.status || 'active') : 'active';

        document.getElementById('categoryModal').classList.add('active');
        document.getElementById('categoryName').focus();
    },

    closeModal(id) {
        const el = document.getElementById(id);
        if (el) el.classList.remove('active');
    },

    save(e) {
        e.preventDefault();
        const error = document.getElementById('categoryFormError');
        const name = document.getElementById('categoryName').value.trim();
        const nameBn = document.getElementById('categoryNameBn').value.trim();
        const status = document.getElementById('categoryStatus').value;

        if (!name) {
            error.textContent = window.i18n ? (i18n.t('nameRequired') || 'Name is required') : 'Name is required';
            error.classList.add('show');
            return;
        }

        let categories = this.getAll();

        // Duplicate check
        const duplicate = categories.find(c =>
            c.name.toLowerCase() === name.toLowerCase() && c.id !== this.editingId
        );
        if (duplicate) {
            error.textContent = 'Category already exists';
            error.classList.add('show');
            return;
        }

        if (this.editingId) {
            const idx = categories.findIndex(c => c.id === this.editingId);
            if (idx !== -1) {
                categories[idx] = {
                    ...categories[idx],
                    name,
                    nameBn,
                    status,
                    updatedAt: new Date().toISOString()
                };
            }
            showToast('Category updated successfully', 'success');
        } else {
            categories.push({
                id: Storage.generateId('cat'),
                name,
                nameBn,
                status,
                createdAt: new Date().toISOString()
            });
            showToast('Category added successfully', 'success');
        }

        Storage.saveData(Storage.KEYS.CATEGORIES, categories);
        this.closeModal('categoryModal');
        this.render();

        // Refresh product category dropdowns if Products module exists
        if (window.Products) Products.populateCategoryDropdowns();
    },

    confirmDelete(id) {
        const cat = this.getById(id);
        if (!cat) return;

        // Check if products use this category
        const products = Storage.getArray(Storage.KEYS.PRODUCTS);
        const used = products.filter(p => p.categoryId === id).length;

        const msg = document.getElementById('confirmMessage');
        if (used > 0) {
            msg.textContent = `This category has ${used} product(s). Delete anyway? Products will keep the category name but lose the link.`;
        } else {
            msg.textContent = window.i18n
                ? (i18n.t('deleteConfirmMsg') || 'Are you sure you want to delete this item?')
                : 'Are you sure you want to delete this item? This action cannot be undone.';
        }

        this.deleteCallback = () => {
            let categories = this.getAll().filter(c => c.id !== id);
            Storage.saveData(Storage.KEYS.CATEGORIES, categories);
            showToast('Category deleted', 'success');
            this.render();
            if (window.Products) Products.populateCategoryDropdowns();
        };

        document.getElementById('confirmModal').classList.add('active');
    },

    render() {
        const grid = document.getElementById('categoriesGrid');
        if (!grid) return;

        const search = (document.getElementById('categorySearch')?.value || '').toLowerCase();
        let categories = this.getAll();

        if (search) {
            categories = categories.filter(c =>
                (c.name || '').toLowerCase().includes(search) ||
                (c.nameBn || '').toLowerCase().includes(search)
            );
        }

        const products = Storage.getArray(Storage.KEYS.PRODUCTS);
        const lang = window.i18n ? i18n.getCurrentLang() : 'en';

        if (categories.length === 0) {
            grid.innerHTML = `
                <div class="categories-empty">
                    <i class="fas fa-tags"></i>
                    <p data-i18n="noCategories">No categories found</p>
                </div>
            `;
            return;
        }

        grid.innerHTML = categories.map(cat => {
            const count = products.filter(p => p.categoryId === cat.id).length;
            const displayName = lang === 'bn' && cat.nameBn ? cat.nameBn : cat.name;
            const statusClass = cat.status === 'active' ? 'active' : 'inactive';

            return `
                <div class="category-card">
                    <div class="category-card-header">
                        <div class="category-icon"><i class="fas fa-tag"></i></div>
                        <div class="action-btns">
                            <button class="btn btn-icon edit" title="Edit" onclick="Categories.openModal(Categories.getById('${cat.id}'))">
                                <i class="fas fa-pen"></i>
                            </button>
                            <button class="btn btn-icon delete" title="Delete" onclick="Categories.confirmDelete('${cat.id}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    <div>
                        <h3>${escapeHtml(displayName)}</h3>
                        ${cat.nameBn && lang === 'en' ? `<div class="cat-name-bn">${escapeHtml(cat.nameBn)}</div>` : ''}
                        ${cat.name && lang === 'bn' && cat.nameBn ? `<div class="cat-name-bn">${escapeHtml(cat.name)}</div>` : ''}
                    </div>
                    <div class="category-meta">
                        <span class="category-count"><strong>${count}</strong> products</span>
                        <span class="status-badge ${statusClass}">${cat.status || 'active'}</span>
                    </div>
                </div>
            `;
        }).join('');
    }
};

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function showToast(message, type = 'success') {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const icons = { success: 'fa-check-circle', error: 'fa-times-circle', warning: 'fa-exclamation-triangle' };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<i class="fas ${icons[type] || icons.success}"></i><span>${escapeHtml(message)}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

window.Categories = Categories;
window.showToast = showToast;
window.escapeHtml = escapeHtml;
