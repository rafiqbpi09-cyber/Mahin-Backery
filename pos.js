/* ========================================
   POS / Sales Module
   ======================================== */

const POS = {
    cart: [],
    paymentMethod: 'Cash',
    selectedCategory: '',

    init() {
        this.bindEvents();
        this.loadCustomers();
        this.renderCategoryTabs();
        this.renderProducts();
        this.renderCart();
    },

    bindEvents() {
        const search = document.getElementById('posSearch');
        if (search) {
            search.addEventListener('input', () => this.renderProducts());
        }

        const clearBtn = document.getElementById('posClearCart');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                if (this.cart.length === 0) return;
                if (confirm('Clear entire cart?')) {
                    this.cart = [];
                    this.renderCart();
                }
            });
        }

        const discount = document.getElementById('posDiscount');
        if (discount) {
            discount.addEventListener('input', () => this.updateTotals());
        }

        const paid = document.getElementById('posPaid');
        if (paid) {
            paid.addEventListener('input', () => this.updateTotals());
        }

        document.querySelectorAll('#posPaymentMethods .pay-method').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('#posPaymentMethods .pay-method').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.paymentMethod = btn.dataset.method;
            });
        });

        const checkout = document.getElementById('posCheckout');
        if (checkout) {
            checkout.addEventListener('click', () => this.completeSale());
        }

        const printBtn = document.getElementById('btnPrintInvoice');
        if (printBtn) {
            printBtn.addEventListener('click', () => window.print());
        }
    },

    loadCustomers() {
        const select = document.getElementById('posCustomer');
        if (!select) return;
        const customers = Storage.getArray(Storage.KEYS.CUSTOMERS);
        const current = select.value;
        select.innerHTML = '<option value="">Walk-in Customer</option>';
        customers.forEach(c => {
            select.innerHTML += `<option value="${c.id}">${escapeHtml(c.name)}${c.mobile ? ' (' + c.mobile + ')' : ''}</option>`;
        });
        if (current) select.value = current;
    },

    renderCategoryTabs() {
        const tabs = document.getElementById('posCategoryTabs');
        if (!tabs) return;

        const categories = Categories.getAll().filter(c => c.status === 'active');
        const lang = window.i18n ? i18n.getCurrentLang() : 'en';

        let html = `<button class="pos-cat-tab ${this.selectedCategory === '' ? 'active' : ''}" data-cat="">All</button>`;
        categories.forEach(c => {
            const name = lang === 'bn' && c.nameBn ? c.nameBn : c.name;
            html += `<button class="pos-cat-tab ${this.selectedCategory === c.id ? 'active' : ''}" data-cat="${c.id}">${escapeHtml(name)}</button>`;
        });
        tabs.innerHTML = html;

        tabs.querySelectorAll('.pos-cat-tab').forEach(btn => {
            btn.addEventListener('click', () => {
                this.selectedCategory = btn.dataset.cat;
                tabs.querySelectorAll('.pos-cat-tab').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.renderProducts();
            });
        });
    },

    renderProducts() {
        const grid = document.getElementById('posProductsGrid');
        if (!grid) return;

        const search = (document.getElementById('posSearch')?.value || '').toLowerCase();
        let products = Products.getAll().filter(p => p.status === 'active');

        if (this.selectedCategory) {
            products = products.filter(p => p.categoryId === this.selectedCategory);
        }
        if (search) {
            products = products.filter(p =>
                (p.name || '').toLowerCase().includes(search) ||
                (p.code || '').toLowerCase().includes(search)
            );
        }

        if (products.length === 0) {
            grid.innerHTML = `
                <div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text-muted)">
                    <i class="fas fa-box-open" style="font-size:2rem;opacity:0.3;display:block;margin-bottom:10px"></i>
                    <p>No products found</p>
                </div>
            `;
            return;
        }

        grid.innerHTML = products.map(p => {
            const stock = Number(p.currentStock) || 0;
            const min = Number(p.minStock) || 0;
            let stockClass = '';
            let stockText = `Stock: ${stock}`;
            if (stock <= 0) {
                stockClass = 'out';
                stockText = 'Out of stock';
            } else if (stock <= min) {
                stockClass = 'low';
                stockText = `Low: ${stock}`;
            }

            let img = `<i class="fas fa-cookie-bite"></i>`;
            if (p.image) img = `<img src="${p.image}" alt="">`;

            return `
                <div class="pos-product-card ${stock <= 0 ? 'out-of-stock' : ''}"
                     data-id="${p.id}"
                     onclick="POS.addToCart('${p.id}')">
                    <div class="pos-product-img">${img}</div>
                    <div class="pos-product-name">${escapeHtml(p.name)}</div>
                    <div class="pos-product-price">${Storage.formatCurrency(p.sellingPrice)}</div>
                    <div class="pos-product-stock ${stockClass}">${stockText}</div>
                </div>
            `;
        }).join('');
    },

    addToCart(productId) {
        const product = Products.getById(productId);
        if (!product) return;

        const stock = Number(product.currentStock) || 0;
        if (stock <= 0) {
            showToast('Product is out of stock', 'warning');
            return;
        }

        const existing = this.cart.find(item => item.productId === productId);
        if (existing) {
            if (existing.qty >= stock) {
                showToast('Not enough stock', 'warning');
                return;
            }
            existing.qty += 1;
        } else {
            this.cart.push({
                productId: product.id,
                name: product.name,
                price: Number(product.sellingPrice) || 0,
                purchasePrice: Number(product.purchasePrice) || 0,
                qty: 1,
                unit: product.unit || 'pcs',
                maxStock: stock
            });
        }

        this.renderCart();
    },

    changeQty(productId, delta) {
        const item = this.cart.find(i => i.productId === productId);
        if (!item) return;

        const product = Products.getById(productId);
        const stock = product ? (Number(product.currentStock) || 0) : item.maxStock;

        const newQty = item.qty + delta;
        if (newQty <= 0) {
            this.cart = this.cart.filter(i => i.productId !== productId);
        } else if (newQty > stock) {
            showToast('Not enough stock', 'warning');
            return;
        } else {
            item.qty = newQty;
        }
        this.renderCart();
    },

    removeFromCart(productId) {
        this.cart = this.cart.filter(i => i.productId !== productId);
        this.renderCart();
    },

    getSubtotal() {
        return this.cart.reduce((sum, item) => sum + item.price * item.qty, 0);
    },

    updateTotals() {
        const subtotal = this.getSubtotal();
        let discount = parseFloat(document.getElementById('posDiscount')?.value) || 0;
        if (discount < 0) discount = 0;
        if (discount > subtotal) discount = subtotal;

        const grand = Math.max(0, subtotal - discount);
        let paid = parseFloat(document.getElementById('posPaid')?.value);
        if (isNaN(paid)) paid = 0;
        if (paid < 0) paid = 0;

        const due = Math.max(0, grand - paid);

        document.getElementById('posSubtotal').textContent = Storage.formatCurrency(subtotal);
        document.getElementById('posGrandTotal').textContent = Storage.formatCurrency(grand);
        document.getElementById('posDue').textContent = Storage.formatCurrency(due);

        const checkout = document.getElementById('posCheckout');
        if (checkout) {
            checkout.disabled = this.cart.length === 0;
        }

        return { subtotal, discount, grand, paid, due };
    },

    renderCart() {
        const container = document.getElementById('posCartItems');
        if (!container) return;

        if (this.cart.length === 0) {
            container.innerHTML = `
                <div class="pos-cart-empty">
                    <i class="fas fa-shopping-basket"></i>
                    <p data-i18n="cartEmpty">Cart is empty. Add products.</p>
                </div>
            `;
            // Reset paid/discount optionally
            this.updateTotals();
            return;
        }

        container.innerHTML = this.cart.map(item => `
            <div class="pos-cart-item">
                <div class="pos-cart-item-info">
                    <strong>${escapeHtml(item.name)}</strong>
                    <small>${Storage.formatCurrency(item.price)} × ${item.qty}</small>
                </div>
                <div class="pos-qty-controls">
                    <button class="pos-qty-btn" onclick="POS.changeQty('${item.productId}', -1)">
                        <i class="fas fa-minus"></i>
                    </button>
                    <span class="pos-qty-val">${item.qty}</span>
                    <button class="pos-qty-btn" onclick="POS.changeQty('${item.productId}', 1)">
                        <i class="fas fa-plus"></i>
                    </button>
                </div>
                <div class="pos-cart-item-total">${Storage.formatCurrency(item.price * item.qty)}</div>
                <button class="pos-cart-item-remove" onclick="POS.removeFromCart('${item.productId}')" title="Remove">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `).join('');

        this.updateTotals();
    },

    generateInvoiceNo() {
        const sales = Storage.getArray(Storage.KEYS.SALES);
        const today = Storage.getToday().replace(/-/g, '');
        const todayCount = sales.filter(s => s.invoiceNo && s.invoiceNo.includes(today)).length + 1;
        return `INV-${today}-${String(todayCount).padStart(3, '0')}`;
    },

    completeSale() {
        if (this.cart.length === 0) return;

        const totals = this.updateTotals();
        if (totals.grand <= 0 && totals.discount >= this.getSubtotal()) {
            // allow free with full discount
        }

        // Validate stock again
        for (const item of this.cart) {
            const product = Products.getById(item.productId);
            const stock = product ? (Number(product.currentStock) || 0) : 0;
            if (item.qty > stock) {
                showToast(`Not enough stock for ${item.name}`, 'error');
                return;
            }
        }

        const customerSelect = document.getElementById('posCustomer');
        const customerId = customerSelect?.value || '';
        let customerName = 'Walk-in Customer';
        if (customerId) {
            const customers = Storage.getArray(Storage.KEYS.CUSTOMERS);
            const cust = customers.find(c => c.id === customerId);
            if (cust) customerName = cust.name;
        }

        const invoiceNo = this.generateInvoiceNo();
        const now = new Date().toISOString();

        const sale = {
            id: Storage.generateId('sale'),
            invoiceNo,
            date: now,
            customerId: customerId || null,
            customerName,
            items: this.cart.map(item => ({
                productId: item.productId,
                name: item.name,
                price: item.price,
                purchasePrice: item.purchasePrice,
                qty: item.qty,
                total: item.price * item.qty
            })),
            subtotal: totals.subtotal,
            discount: totals.discount,
            grandTotal: totals.grand,
            paidAmount: totals.paid,
            dueAmount: totals.due,
            paymentMethod: this.paymentMethod,
            status: totals.due > 0 ? 'due' : 'paid',
            createdAt: now
        };

        // Save sale
        const sales = Storage.getArray(Storage.KEYS.SALES);
        sales.push(sale);
        Storage.saveData(Storage.KEYS.SALES, sales);

        // Decrease stock
        let products = Products.getAll();
        this.cart.forEach(item => {
            const idx = products.findIndex(p => p.id === item.productId);
            if (idx !== -1) {
                products[idx].currentStock = Math.max(0, (Number(products[idx].currentStock) || 0) - item.qty);
                products[idx].updatedAt = now;
            }
        });
        Storage.saveData(Storage.KEYS.PRODUCTS, products);

        // Stock movement history
        let movements = Storage.getArray(Storage.KEYS.STOCK_MOVEMENTS);
        this.cart.forEach(item => {
            movements.push({
                id: Storage.generateId('mov'),
                productId: item.productId,
                productName: item.name,
                type: 'out',
                quantity: item.qty,
                reason: 'Sale',
                reference: invoiceNo,
                date: now
            });
        });
        Storage.saveData(Storage.KEYS.STOCK_MOVEMENTS, movements);

        // Update customer totals if selected
        if (customerId) {
            let customers = Storage.getArray(Storage.KEYS.CUSTOMERS);
            const cIdx = customers.findIndex(c => c.id === customerId);
            if (cIdx !== -1) {
                customers[cIdx].totalPurchase = (Number(customers[cIdx].totalPurchase) || 0) + totals.grand;
                customers[cIdx].paid = (Number(customers[cIdx].paid) || 0) + totals.paid;
                customers[cIdx].due = (Number(customers[cIdx].due) || 0) + totals.due;
                customers[cIdx].lastPurchaseDate = now;
                Storage.saveData(Storage.KEYS.CUSTOMERS, customers);
            }
        }

        // Clear cart
        this.cart = [];
        document.getElementById('posDiscount').value = 0;
        document.getElementById('posPaid').value = 0;
        this.renderCart();
        this.renderProducts();

        // Show invoice
        this.showInvoice(sale);

        // Refresh other modules
        if (window.Dashboard) Dashboard.update();
        if (window.Products) Products.render();

        showToast('Sale completed successfully!', 'success');
    },

    showInvoice(sale) {
        const settings = Storage.initSettings();
        const content = document.getElementById('invoiceContent');
        if (!content) return;

        const dateStr = new Date(sale.date).toLocaleString('en-GB', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });

        content.innerHTML = `
            <div class="invoice-paper" id="invoicePrintArea">
                <div class="invoice-header">
                    <h1>${escapeHtml(settings.bakeryName || 'Bakery')}</h1>
                    <p>${escapeHtml(settings.address || '')}</p>
                    <p>${escapeHtml(settings.phone || '')}${settings.email ? ' | ' + escapeHtml(settings.email) : ''}</p>
                </div>
                <div class="invoice-meta">
                    <div>
                        <div><strong>Invoice:</strong> ${escapeHtml(sale.invoiceNo)}</div>
                        <div><strong>Date:</strong> ${dateStr}</div>
                    </div>
                    <div style="text-align:right">
                        <div><strong>Customer:</strong> ${escapeHtml(sale.customerName)}</div>
                        <div><strong>Payment:</strong> ${escapeHtml(sale.paymentMethod)}</div>
                    </div>
                </div>
                <table class="invoice-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Product</th>
                            <th class="text-right">Qty</th>
                            <th class="text-right">Price</th>
                            <th class="text-right">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sale.items.map((item, i) => `
                            <tr>
                                <td>${i + 1}</td>
                                <td>${escapeHtml(item.name)}</td>
                                <td class="text-right">${item.qty}</td>
                                <td class="text-right">${Storage.formatCurrency(item.price)}</td>
                                <td class="text-right">${Storage.formatCurrency(item.total)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                <div class="invoice-totals">
                    <div class="row"><span>Subtotal</span><span>${Storage.formatCurrency(sale.subtotal)}</span></div>
                    ${sale.discount > 0 ? `<div class="row"><span>Discount</span><span>- ${Storage.formatCurrency(sale.discount)}</span></div>` : ''}
                    <div class="row grand"><span>Grand Total</span><span>${Storage.formatCurrency(sale.grandTotal)}</span></div>
                    <div class="row"><span>Paid</span><span>${Storage.formatCurrency(sale.paidAmount)}</span></div>
                    <div class="row"><span>Due</span><span>${Storage.formatCurrency(sale.dueAmount)}</span></div>
                </div>
                <div class="invoice-footer">
                    ${escapeHtml(settings.invoiceFooter || 'Thank you for your purchase!')}
                </div>
            </div>
        `;

        document.getElementById('invoiceModal').classList.add('active');
    },

    refresh() {
        this.loadCustomers();
        this.renderCategoryTabs();
        this.renderProducts();
        this.renderCart();
    }
};

window.POS = POS;
