# Charm Cafe Management System

Tablet-first POS and back-office system for Charm Cafe, Cebu, Philippines.
Built with React 19 + Vite 7, TypeScript (strict), TanStack Query, Zustand, Tailwind CSS v4.

**Current backend: browser localStorage** (single-device mode). The full Supabase backend
(schema, RLS, RPCs, seed) lives in `supabase/migrations/` ready to swap in when multi-device
sync is needed — the UI talks only to `src/services/`, so the swap touches no pages.

---

## Quick Start

```bash
npm install
npm run dev          # http://localhost:5173
```

No environment variables needed in localStorage mode. The app seeds itself with the full
Charm Cafe menu, inventory, and demo accounts on first load.

**Demo accounts** (also shown via "Show demo accounts" on the login page):

| Role | Email | Password | Clock-in PIN |
|---|---|---|---|
| Manager | `manager@charmcafe.ph` | `charm2026` | 1234 |
| Staff | `staff@charmcafe.ph` | `staff2026` | 2580 |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript (strict), Vite 7 |
| Styling | Tailwind CSS v4 (`@tailwindcss/vite`, CSS-first `@theme`) |
| Routing | React Router v7 (`createBrowserRouter`) |
| Server State | TanStack Query v5 |
| Client State | Zustand v5 |
| Storage | localStorage adapter (`src/services/storage.ts`) · Supabase migrations on standby |
| Charts | Recharts |
| PDF / CSV | jsPDF (payslips) · Blob CSV (sales export) |
| Notifications | Sonner |
| Fonts | Fraunces · Montserrat · Pinyon Script (Google Fonts) |

---

## Modules (all live)

- **POS** — product grid with Auto-86 (out-of-stock items disabled automatically), size +
  add-on customization, cart with discounts (Senior/PWD 20%, custom), Cash/GCash payment,
  change computation, receipts, order history with **manager void** (restores stock + ledger)
- **Inventory** — stock levels with low/out alerts, stock-in with weighted average cost,
  adjustments/waste, append-only movement ledger, item CRUD
- **Products** — menu CRUD, per-size pricing, **recipe builder** driving stock deduction and
  availability, live cost/margin, add-on management
- **Expenses** — categorized spending log feeding the P&L
- **Staff** — team CRUD with permissions and pay rates, PIN time clock, time logs,
  **payroll** (computed from shifts, bonuses/deductions, mark-paid locking, payslip PDFs)
- **Assets** — equipment register with payback estimate from real gross profit
- **Dashboard** — today's KPIs, 14-day trend, stock alerts, recent orders, top sellers
- **Analytics** — period filters (Manila business days), revenue trend chart, P&L
  (Revenue − COGS − Expenses = Net), payment & category mix, top products, CSV export
- **Settings** — cafe profile, receipt footer, order numbering, change password,
  **backup export/import (JSON)**, factory reset

Roles: **manager** (everything) and **staff** (POS, clock-in, My Day; inventory view and
expense logging by permission flag). Enforced in the sidebar, routes, and row actions.

---

## ⚠️ localStorage Mode — Read This

All data lives in this one browser profile:

- **Back up regularly**: Settings → Data & Backup → *Download backup* (one JSON file).
  End of each week is a good habit.
- Clearing Chrome's site data, uninstalling Chrome, or a factory reset **wipes everything**.
- No multi-device sync — one tablet is the till and the office.
- Restore via Settings → *Restore backup* (replaces all current data).

---

## Project Structure

```
src/
├── components/
│   ├── layout/        # Sidebar, Topbar, Layout shell
│   └── ui/            # PageShell, MetricCard, SectionPanel, Modal, TrendChart, Logo
├── data/seed.ts       # Demo data: menu, recipes, inventory, accounts (mirrors SQL seed)
├── hooks/useAuth.ts   # Session bootstrap
├── pages/             # One folder per route (pos/, inventory/, products/, staff/, …)
├── router/            # PrivateRoute (auth), ManagerRoute (role)
├── services/          # THE adapter seam — all reads/writes go through here
│   ├── storage.ts     #   localStorage engine + backup export/import
│   ├── authService.ts #   sign in/out, change password
│   ├── catalogService.ts    # menu + Auto-86 availability
│   ├── salesService.ts      # completeSale (atomic), voidOrderItem
│   ├── inventoryService.ts  # stock-in (weighted avg), adjust, item CRUD
│   ├── productService.ts    # product/variant/recipe + add-on CRUD
│   ├── expenseService.ts / assetService.ts / staffService.ts
│   ├── timeService.ts / payrollService.ts
│   ├── analyticsService.ts  # summaries, trends, exact COGS, CSV
│   └── settingsService.ts
├── stores/            # Zustand: authStore, cartStore
├── types/index.ts     # All domain interfaces (match the SQL schema 1:1)
└── utils/format.ts    # ₱ money + Asia/Manila dates everywhere

supabase/migrations/   # Full Postgres backend, ready for reactivation:
├── …001_schema.sql    #   22 tables, triggers, product_availability view
├── …002_rls.sql       #   Row Level Security for manager/staff
├── …003_functions.sql #   complete_sale, void_order_item, process_stock_in, adjust_stock
└── …004_seed.sql      #   Same demo data as src/data/seed.ts

legacy/                # Original Base44 prototype (reference only, not bundled)
```

---

## Reactivating Supabase (when ready)

1. Create a Supabase project, run the four migrations in order (SQL Editor or `supabase db push`)
2. Fill `.env.local` from `.env.example`
3. Reimplement each `src/services/*` function against `supabase` — the function signatures
   are designed to match the SQL RPCs (`completeSale` ↔ `complete_sale`, etc.)
4. Pages, stores, and components need **zero changes**

---

## Commands

```bash
npm run dev          # Dev server
npm run build        # Type-check (tsc -b) + production build → dist/
npm run preview      # Serve the production build
npx tsc -b           # Type check only (note: -b, not --noEmit — root tsconfig is solution-style)
```

---

## Conventions

- All money is Philippine Pesos via `formatMoney()` — never raw `toFixed`
- All dates/times use `Asia/Manila` via `src/utils/format.ts` — business days are Manila days
- Target device: Android tablet, Chrome, 1280×800 landscape
- Every async UI action has loading/disabled states and a Sonner toast on success/failure
- Destructive actions (delete, void, reset, restore) always confirm first
