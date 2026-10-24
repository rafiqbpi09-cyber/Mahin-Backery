/* ========================================
   Expense Management Module
   ======================================== */

const Expenses = {
    editingId: null,

    init() {
        this.bindEvents();
        this.render();
    },

    bindEvents() {
        const addBtn = document.getElementById('btnAddExpense');
        if (addBtn) addBtn.addEventListener('click', () => this.openModal());

        const form = document.getElementById('expenseForm');
        if (form) form.addEventListener('submit', (e) => this.save(e));

        const search = document.getElementById('expenseSearch');
        if (search) search.addEventListener('input', () => this.render());

        const catFilter = document.getElementById('expenseCategoryFilter');
        if (catFilter) catFilter.addEventListener('change', () => this.render());

        const dateFrom = document.getElementById('expenseDateFrom');
        const dateTo = document.getElementById('expenseDateTo');
        if (dateFrom) dateFrom.addEventListener('change', () => this.render());
        if (dateTo) dateTo.addEventListener('change', () => this.render());
    },

    getAll() {
        return Storage.getArray(Storage.KEYS.EXPENSES);
    },

    getById(id) {
        return this.getAll().find(e => e.id === id);
    },

    openModal(expense = null) {
        this.editingId = expense ? expense.id : null;
        const title = document.getElementById('expenseModalTitle');
        if (title) {
            title.textContent = expense
                ? (window.i18n ? i18n.t('editExpense') || 'Edit Expense' : 'Edit Expense')
                : (window.i18n ? i18n.t('addExpense') || 'Add Expense' : 'Add Expense');
        }

        document.getElementById('expenseForm').reset();
        document.getElementById('expenseFormError').classList.remove('show');
        document.getElementById('expenseId').value = expense ? expense.id : '';
        document.getElementById('expenseCategory').value = expense ? expense.category : 'Rent';
        document.getElementById('expenseDescription').value = expense ? (expense.description || '') : '';
        document.getElementById('expenseAmount').value = expense ? expense.amount : '';
        document.getElementById('expenseDate').value = expense
            ? (expense.date || '').split('T')[0]
            : Storage.getToday();
        document.getElementById('expensePaymentMethod').value = expense ? (expense.paymentMethod || 'Cash') : 'Cash';

        document.getElementById('expenseModal').classList.add('active');
        document.getElementById('expenseAmount').focus();
    },

    save(e) {
        e.preventDefault();
        const error = document.getElementById('expenseFormError');
        const category = document.getElementById('expenseCategory').value;
        const description = document.getElementById('expenseDescription').value.trim();
        const amount = parseFloat(document.getElementById('expenseAmount').value) || 0;
        const dateVal = document.getElementById('expenseDate').value || Storage.getToday();
        const paymentMethod = document.getElementById('expensePaymentMethod').value;

        if (amount <= 0) {
            error.textContent = 'Amount must be greater than 0';
            error.classList.add('show');
            return;
        }

        const dateISO = dateVal.includes('T') ? dateVal : dateVal + 'T12:00:00';
        let expenses = this.getAll();

        if (this.editingId) {
            const idx = expenses.findIndex(x => x.id === this.editingId);
            if (idx !== -1) {
                expenses[idx] = {
                    ...expenses[idx],
                    category, description, amount,
                    date: dateISO,
                    paymentMethod,
                    updatedAt: new Date().toISOString()
                };
            }
            showToast('Expense updated', 'success');
        } else {
            expenses.push({
                id: Storage.generateId('exp'),
                category, description, amount,
                date: dateISO,
                paymentMethod,
                createdAt: new Date().toISOString()
            });
            showToast('Expense added', 'success');
        }

        Storage.saveData(Storage.KEYS.EXPENSES, expenses);
        document.getElementById('expenseModal').classList.remove('active');
        this.render();
        if (window.Dashboard) Dashboard.update();
    },

    confirmDelete(id) {
        const exp = this.getById(id);
        if (!exp) return;

        document.getElementById('confirmMessage').textContent =
            `Delete expense "${exp.category}" — ${Storage.formatCurrency(exp.amount)}?`;

        Categories.deleteCallback = () => {
            let expenses = this.getAll().filter(x => x.id !== id);
            Storage.saveData(Storage.KEYS.EXPENSES, expenses);
            showToast('Expense deleted', 'success');
            this.render();
            if (window.Dashboard) Dashboard.update();
        };
        document.getElementById('confirmModal').classList.add('active');
    },

    render() {
        const tbody = document.getElementById('expensesTableBody');
        if (!tbody) return;

        const search = (document.getElementById('expenseSearch')?.value || '').toLowerCase();
        const catFilter = document.getElementById('expenseCategoryFilter')?.value || '';
        const dateFrom = document.getElementById('expenseDateFrom')?.value || '';
        const dateTo = document.getElementById('expenseDateTo')?.value || '';

        let expenses = this.getAll();

        if (search) {
            expenses = expenses.filter(e =>
                (e.category || '').toLowerCase().includes(search) ||
                (e.description || '').toLowerCase().includes(search) ||
                (e.paymentMethod || '').toLowerCase().includes(search)
            );
        }
        if (catFilter) {
            expenses = expenses.filter(e => e.category === catFilter);
        }
        if (dateFrom) {
            expenses = expenses.filter(e => (e.date || '') >= dateFrom);
        }
        if (dateTo) {
            expenses = expenses.filter(e => (e.date || '').split('T')[0] <= dateTo);
        }

        // Stats from all
        const all = this.getAll();
        const today = Storage.getToday();
        const todayTotal = all
            .filter(e => e.date && e.date.startsWith(today))
            .reduce((s, e) => s + (Number(e.amount) || 0), 0);
        const allTotal = all.reduce((s, e) => s + (Number(e.amount) || 0), 0);

        const el = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
        el('expStatCount', all.length);
        el('expStatAmount', Storage.formatCurrency(allTotal));
        el('expStatToday', Storage.formatCurrency(todayTotal));

        if (expenses.length === 0) {
            tbody.innerHTML = `
                <tr class="empty-row">
                    <td colspan="6" class="empty-state">
                        <i class="fas fa-money-bill-wave"></i>
                        <p data-i18n="noExpenses">No expenses yet</p>
                    </td>
                </tr>
            `;
            return;
        }

        expenses.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

        tbody.innerHTML = expenses.map(e => {
            const dateStr = e.date
                ? new Date(e.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                : '—';

            return `
                <tr>
                    <td>${dateStr}</td>
                    <td><span class="status-badge active">${escapeHtml(e.category)}</span></td>
                    <td>${escapeHtml(e.description) || '—'}</td>
                    <td><strong class="text-danger">${Storage.formatCurrency(e.amount)}</strong></td>
                    <td>${escapeHtml(e.paymentMethod) || '—'}</td>
                    <td>
                        <div class="action-btns">
                            <button class="btn btn-icon edit" title="Edit" onclick="Expenses.openModal(Expenses.getById('${e.id}'))">
                                <i class="fas fa-pen"></i>
                            </button>
                            <button class="btn btn-icon delete" title="Delete" onclick="Expenses.confirmDelete('${e.id}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }
};

window.Expenses = Expenses;
