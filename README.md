# 🥖 Bakery Management System

Modern, offline-first Bakery Management Software built with **HTML5, CSS3 & Vanilla JavaScript**.

বাংলা ও English দুই ভাষা সাপোর্ট। সব ডেটা **LocalStorage**-এ সংরক্ষিত হয় — কোনো সার্ভার লাগে না।

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black)
![License](https://img.shields.io/badge/License-MIT-green)

---

## ✨ Features

| Module | Description |
|--------|-------------|
| **Dashboard** | Today's Sales, Purchase, Expense, Profit, Charts, Low Stock Alert |
| **POS / Sales** | Product cards, Cart, Discount, Multi payment (Cash/bKash/Nagad/Card), Invoice + Print |
| **Products** | CRUD, Image, Category, Stock, Expiry, Low stock filter |
| **Categories** | Bread, Cake, Biscuit… + custom categories |
| **Purchases** | Multi-item purchase, stock auto-increase, supplier due |
| **Suppliers** | CRUD + Total Purchase / Paid / Due |
| **Customers** | CRUD, Ledger, Receive Payment, Due tracking |
| **Bilingual** | বাংলা ⇄ English toggle |
| **Theme** | Dark / Light mode |
| **Responsive** | Mobile, Tablet, Desktop |

---

## 🚀 How to Run

### Option 1 — Direct (Chrome / Edge)
1. Download / clone this repo
2. Open `index.html` in browser

### Option 2 — VS Code Live Server
1. Open folder in VS Code
2. Install **Live Server** extension
3. Right-click `index.html` → **Open with Live Server**

### Option 3 — Python local server
```bash
cd bakery-management-system
python -m http.server 5500
```
Then open: http://localhost:5500

---

## 📁 Project Structure

```
bakery-management-system/
├── index.html
├── css/
│   ├── style.css
│   └── responsive.css
├── js/
│   ├── app.js
│   ├── storage.js
│   ├── i18n.js
│   ├── dashboard.js
│   ├── categories.js
│   ├── products.js
│   ├── pos.js
│   ├── suppliers.js
│   ├── purchases.js
│   └── customers.js
└── assets/
```

---

## 💾 Data Storage

All data is saved in browser **LocalStorage**:

- Products, Categories
- Sales, Purchases
- Customers, Suppliers
- Stock movements
- Settings, Language, Theme

> Browser refresh করলেও ডেটা হারায় না। অন্য ডিভাইসে দেখতে চাইলে Export/Import (Settings module — upcoming) ব্যবহার করতে হবে।

---

## 🔄 Stock Flow

```
Purchase  →  Stock ↑
Sale/POS  →  Stock ↓
```

---

## 🛠️ Tech Stack

- HTML5
- CSS3 (Custom properties, Flexbox, Grid)
- Vanilla JavaScript (ES6+)
- Chart.js (Dashboard charts)
- Font Awesome 6
- Google Fonts (Inter + Hind Siliguri)

**No** React / Vue / Angular / TypeScript / Backend.

---

## 📋 Roadmap (Upcoming)

- [ ] Expense Management
- [ ] Order Management
- [ ] Raw Materials & Production
- [ ] Stock Adjustment
- [ ] Reports (Daily/Monthly/P&L)
- [ ] Settings (Bakery info, Logo, Currency)
- [ ] Data Export / Import (JSON)

---

## 📄 License

MIT — free to use for personal & commercial projects.

---

## 👨‍💻 Author

Built as a complete Bakery Management solution for small & medium bakeries in Bangladesh.
