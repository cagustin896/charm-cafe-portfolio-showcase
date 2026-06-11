<div align="center">

# ☕ Charm Cafe — Management System

**A complete, production-grade point-of-sale and back-office platform — built from scratch for a real cafe in Cebu, Philippines.**

### [▶ Try the Live Demo](https://charm-cafe-portfolio-showcase.vercel.app)

Sign in with username **`manager`** · password **`charm2026`**

*Ring up a sale, receive a delivery, run payroll, read the P&L. Every visitor gets a private sandbox — explore freely, nothing you do affects anyone else. Best viewed at tablet or desktop width.*

</div>

---

## What this is

Charm Cafe is a **full management system for a coffee shop** — not a mockup, not a template, and not a tutorial app. Every screen is functional, every number is real, and the whole thing runs a working cafe's counter day to day.

It was designed and built end to end: the data model, the business logic, the interface, the offline support, and the deployment. One person ordering at the till touches inventory, costing, sales analytics, and the books — and this app keeps all of that consistent, in real time, on a single tablet.

> **Tablet-first. Offline-capable. Installable like a native app.** It runs the cafe even when the Wi-Fi drops.

---

## ✨ Highlights

- 🛒 **Point of Sale** that feels instant — product photos, sizes, add-ons, discounts, cash & GCash, change, receipts, and manager voids that put stock back.
- 📦 **Recipe-driven inventory** — every drink knows its ingredients, so each sale deducts real stock and out-of-stock items disable themselves automatically.
- 📊 **Honest analytics** — a true profit & loss statement, exact cost of goods, revenue trends, payment and category mix — all in the cafe's local time.
- 👥 **Staff & payroll** — PIN time clock, shift logs, and payroll computed straight from hours worked, with printable payslips.
- 📴 **Works offline** — installs to the home screen and keeps selling with no internet, syncing updates when it's back.
- 🔒 **Safe by design** — role-based access, forced credential setup, on-device data, and one-tap backups.

---

## The modules — all fully working

| Module | What it does |
|---|---|
| **Point of Sale** | Photo menu with category filters and search · size + add-on selection · Senior/PWD and custom discounts · Cash & GCash with change calculation · printable receipts · order history with manager **void** (restores stock and logs it) · **Auto-86** (items sell out and disable themselves live) |
| **Inventory** | Live stock levels with low/out alerts · stock-in using **weighted-average costing** · adjustments and waste · an append-only movement ledger · full item management |
| **Products & Recipes** | Menu management with per-size pricing · a **recipe builder** that links each product to its ingredients — this is what drives stock deduction and availability · live cost and margin · add-on management |
| **Dashboard** | Today's revenue, orders, average order, gross profit, and stock alerts · a 14-day revenue trend · recent orders · top sellers |
| **Analytics** | Period filters (today / week / month / year / custom) · revenue trend chart · a real **Profit & Loss** (Revenue − Cost of Goods − Expenses = Net) · payment and category mix · top products · CSV export |
| **Expenses** | Categorized spending that flows straight into the P&L |
| **Staff & Payroll** | Team management with roles, permissions, and pay rates · a touch-friendly **PIN time clock** · shift logs · payroll computed from clocked hours with bonuses/deductions and **payslip PDFs** |
| **Assets** | Equipment register with an estimated payback based on real daily gross profit |
| **Settings** | Cafe profile and receipts · account security · **one-file backup & restore** · order numbering |

Two roles — **Manager** (full access) and **Staff** (POS, time clock, and permission-gated views) — enforced consistently across the navigation, routes, and every action.

---

## Built with care — the engineering

The details that separate a real tool from a demo:

- **Atomic checkout.** A sale checks stock across the *entire* cart before it writes anything, then records the order, deducts ingredients, and appends to the ledger as one consistent operation — so the books never end up half-written.
- **Auto-86.** A product disables itself the instant any ingredient runs short, computed from live stock — no manual toggling, no overselling.
- **Real cost of goods.** Every sold item is costed from its recipe *and* its add-ons, so gross margin and the P&L are exact, not estimates.
- **Weighted-average costing.** Receiving stock recomputes unit cost the way an accountant would.
- **Auditable by design.** Voids require a reason and restore exact quantities; the movement ledger is append-only; paid payroll periods lock permanently.
- **Timezone-correct.** Every "today," every business day, and every report is anchored to Manila time regardless of the device.
- **Clean architecture.** The interface never touches storage directly — a focused service layer sits between them, so the persistence engine can change without rewriting a single screen.
- **Offline-first PWA.** A service worker caches the whole app; it loads and runs with no network and installs to the home screen in full-screen, landscape mode.

---

## 🔐 Safety & data

- **Forced first-login setup** — the published demo credentials can't stay valid; each owner sets their own name, username, and password before entering.
- **Role-based access** — staff can sell and clock in; only managers can void sales, manage the menu, run payroll, and see the books.
- **Your data stays yours** — everything lives on the device, never on a third-party server. The public demo gives each visitor an isolated sandbox.
- **One-tap backups** — the full dataset exports to a single file and restores in seconds.

---

## 🧰 Tech stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19 · TypeScript (strict) · Vite 7 |
| **Styling** | Tailwind CSS v4 (CSS-first theming) |
| **Routing** | React Router v7 |
| **Server state** | TanStack Query v5 |
| **Client state** | Zustand v5 |
| **Charts / Docs** | Recharts · jsPDF (payslips) · CSV export |
| **Offline** | vite-plugin-pwa (service worker + installable manifest) |
| **Type-safe domain** | Hand-written interfaces spanning the whole app |

A complete relational backend (PostgreSQL schema, row-level security, and transactional stored procedures) is also included and ready to switch on for multi-device, cloud-synced operation — the interface needs zero changes to adopt it.

---

## ▶ Run it yourself

```bash
npm install
npm run dev      # http://localhost:5173
```

No setup, no accounts, no API keys — the app seeds itself with the full Charm Cafe menu, photos, and sample data on first load.

---

<div align="center">

**Designed, engineered, and shipped end to end.**
A working tool a real business depends on — crafted to be fast, clean, dependable, and safe.

[▶ Open the Live Demo](https://charm-cafe-portfolio-showcase.vercel.app)

</div>
