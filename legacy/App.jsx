import React, { useEffect, useMemo, useState } from "react";
import Icon from "./components/Icon.jsx";
import { assets, defaultSettings, expenses, inventory, products, salesTrend, staff } from "./data/sampleData.js";
import { formatMoney, todayLabel } from "./utils/format.js";
import { downloadJson, loadLocalState, saveLocalState } from "./utils/localStore.js";

const navItems = [
  ["Dashboard", "dashboard"],
  ["POS", "pos"],
  ["Inventory", "inventory"],
  ["Products", "products"],
  ["Expenses", "expenses"],
  ["Assets", "inventory"],
  ["Analytics", "analytics"],
  ["Staff", "staff"],
  ["Settings", "setup"]
];

function LogoMark({ inverted = false }) {
  return (
    <svg className={inverted ? "logo-mark inverted" : "logo-mark"} viewBox="0 0 64 64" aria-hidden="true">
      <path d="M19 25c-6-8-16-1-11 9 4 8 15 14 24 18 9-4 20-10 24-18 5-10-5-17-11-9" />
      <path d="M22 28h18v13a7 7 0 0 1-7 7h-4a7 7 0 0 1-7-7V28Z" />
      <path d="M40 31h4a5 5 0 0 1 0 10h-4" />
      <path d="M20 28h22M23 34h17M24 40h15M26 22c4-3 9-3 13 0" />
      <path d="M14 18l2 3 3-2M48 15l2 3 3-2M42 10l1 2 2-1" />
    </svg>
  );
}

function App() {
  const [active, setActive] = useState("POS");
  const [category, setCategory] = useState("All");
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState("");
  const [settings, setSettings] = useState(() => loadLocalState("charmCafe.settings.v1", defaultSettings));

  useEffect(() => {
    saveLocalState("charmCafe.settings.v1", settings);
  }, [settings]);

  const categoryNames = useMemo(() => ["All", ...settings.categories.map((item) => item.name)], [settings.categories]);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesCategory = category === "All" || product.category === category;
      const matchesSearch = product.name.toLowerCase().includes(search.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [category, search]);

  const addToCart = (product, size = settings.sizes[0], addonIds = []) => {
    setCart((items) => {
      const effectiveSize = size || settings.sizes[0] || defaultSettings.sizes[0];
      const selectedAddons = settings.addons.filter((addon) => addonIds.includes(addon.id));
      const sortedAddonIds = [...addonIds].sort();
      const addonTotal = selectedAddons.reduce((sum, addon) => sum + (addon.price || 0), 0);
      const lineId = `${product.id}:${effectiveSize.id}:${sortedAddonIds.join("-")}`;
      const pricedProduct = {
        ...product,
        id: lineId,
        productId: product.id,
        size: effectiveSize,
        addons: selectedAddons,
        price: product.price + (effectiveSize.priceDelta || 0) + addonTotal
      };
      const current = items.find((item) => item.id === lineId);
      if (current) {
        return items.map((item) => item.id === lineId ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...items, { ...pricedProduct, quantity: 1 }];
    });
  };

  const lowStock = inventory.filter((item) => item.stock <= item.reorder);
  const todaysRevenue = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const inventoryValue = inventory.reduce((sum, item) => sum + item.stock * item.unitCost, 0);
  const expenseTotal = expenses.reduce((sum, item) => sum + item.amount, 0);
  const assetValue = assets.reduce((sum, item) => sum + item.price, 0);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><LogoMark /></div>
          <div>
            <strong>{settings.storeProfile.name}</strong>
            <span>{settings.storeProfile.tagline}</span>
          </div>
        </div>

        <div className="operator-card">
          <div className="avatar photo">CA</div>
          <div>
            <strong>Christian Agustin</strong>
            <span>Store Manager</span>
          </div>
        </div>

        <nav>
          <p className="nav-section">Main</p>
          {navItems.slice(0, 4).map(([label, icon]) => (
            <button className={active === label ? "nav-item active" : "nav-item"} key={label} onClick={() => setActive(label)}>
              <Icon name={icon} />
              <span>{label}</span>
            </button>
          ))}
          <p className="nav-section">Back Office</p>
          {navItems.slice(4).map(([label, icon]) => (
            <button className={active === label ? "nav-item active" : "nav-item"} key={label} onClick={() => setActive(label)}>
              <Icon name={icon} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-user">
          <button className="login-button">Log out</button>
        </div>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <label className="global-search">
            <Icon name="search" size={16} />
            <input placeholder="Search (Ctrl+/)" />
          </label>
          <div className="topbar-actions">
            <span className="shift-status"><span className="shift-dot" /> Open shift</span>
            <button className="icon-button" aria-label="Display settings">S</button>
            <div className="avatar mini">CA</div>
          </div>
        </header>

        {active === "Dashboard" && (
          <Dashboard
            activeOrders={cart.length}
            assetValue={assetValue}
            expenseTotal={expenseTotal}
            inventoryValue={inventoryValue}
            lowStock={lowStock}
            revenue={todaysRevenue}
          />
        )}
        {active === "POS" && (
          <POS
            cart={cart}
            category={category}
            filteredProducts={filteredProducts}
            onAdd={addToCart}
            onCategory={setCategory}
            onClear={() => setCart([])}
            search={search}
            setSearch={setSearch}
            settings={settings}
            categoryNames={categoryNames}
          />
        )}
        {active === "Inventory" && <Inventory lowStock={lowStock} inventoryValue={inventoryValue} />}
        {active === "Products" && <Products />}
        {active === "Expenses" && <Expenses expenseTotal={expenseTotal} />}
        {active === "Assets" && <Assets assetValue={assetValue} />}
        {active === "Analytics" && <Analytics />}
        {active === "Staff" && <Staff />}
        {active === "Settings" && <Setup settings={settings} setSettings={setSettings} />}
      </main>
    </div>
  );
}

function PageTitle({ title, subtitle, action }) {
  return (
    <div className="page-title">
      <div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      {action}
    </div>
  );
}

function Metric({ label, value, detail, tone = "" }) {
  return (
    <section className={`metric ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {detail && <small>{detail}</small>}
    </section>
  );
}

function Dashboard({ activeOrders, assetValue, expenseTotal, inventoryValue, lowStock, revenue }) {
  const totalBusinessValue = assetValue + inventoryValue + revenue;
  return (
    <div className="screen dashboard-grid">
      <PageTitle title="Good morning, Christian" subtitle="Your cafe is ready for today. Keep the line moving and the stock tight." />
      <div className="metrics-row">
        <Metric label="Revenue Today" value={formatMoney(revenue)} detail="Live from active orders" />
        <Metric label="Orders Today" value={String(activeOrders)} detail="Draft orders in POS" />
        <Metric label="Products Sold" value={String(activeOrders ? activeOrders + 2 : 0)} detail="Projected after checkout" />
        <Metric label="Low Stock Items" value={String(lowStock.length)} detail="Needs attention" tone="warning" />
        <Metric label="Business Value" value={formatMoney(totalBusinessValue)} detail="Assets + inventory + cash" tone="dark" />
      </div>
      <section className="panel chart-panel">
        <div className="panel-heading">
          <h2>Sales Trend</h2>
          <span>Last 7 days</span>
        </div>
        <div className="bars">
          {salesTrend.map((amount, index) => <i key={index} style={{ height: `${18 + amount / 14}px` }} />)}
        </div>
      </section>
      <section className="panel">
        <div className="panel-heading">
          <h2>Inventory Alerts</h2>
          <span>{lowStock.length} items</span>
        </div>
        <DataTable
          columns={["Item", "Stock", "Reorder", "Status"]}
          rows={lowStock.map((item) => [item.name, `${item.stock} ${item.unit}`, `${item.reorder} ${item.unit}`, "Low"])}
        />
      </section>
      <section className="panel">
        <div className="panel-heading">
          <h2>Today&apos;s Operations</h2>
          <span>{todayLabel()}</span>
        </div>
        <div className="operations-list">
          <div><strong>Cash drawer</strong><span>{formatMoney(11554)}</span></div>
          <div><strong>Expenses logged</strong><span>{formatMoney(expenseTotal)}</span></div>
          <div><strong>Staff clocked in</strong><span>{staff.filter((person) => person.clockedIn).length}</span></div>
        </div>
      </section>
    </div>
  );
}

function POS({ cart, category, filteredProducts, onAdd, onCategory, onClear, search, setSearch, settings, categoryNames }) {
  const [selectedSizeId, setSelectedSizeId] = useState(settings.sizes[0]?.id || "");
  const [selectedAddonIds, setSelectedAddonIds] = useState([]);
  const [dining, setDining] = useState("take_out");
  const [paymentMethodId, setPaymentMethodId] = useState(settings.paymentMethods[0]?.id || "cash");
  const availableSizes = settings.sizes.length ? settings.sizes : defaultSettings.sizes;
  const availablePaymentMethods = settings.paymentMethods.filter((method) => method.enabled);
  const paymentMethods = availablePaymentMethods.length ? availablePaymentMethods : defaultSettings.paymentMethods;
  const selectedSize = availableSizes.find((size) => size.id === selectedSizeId) || availableSizes[0];
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const productDiscount = cart.length ? 20 : 0;
  const couponDiscount = 0;
  const total = Math.max(0, subtotal - productDiscount - couponDiscount);
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const marginEstimate = cart.reduce((sum, item) => sum + (item.price - item.cost) * item.quantity, 0);

  useEffect(() => {
    if (!availableSizes.some((size) => size.id === selectedSizeId)) {
      setSelectedSizeId(availableSizes[0].id);
    }
  }, [availableSizes, selectedSizeId]);

  useEffect(() => {
    if (!paymentMethods.some((method) => method.id === paymentMethodId)) {
      setPaymentMethodId(paymentMethods[0].id);
    }
  }, [paymentMethodId, paymentMethods]);

  return (
    <div className="pos-screen">
      <section className="pos-catalog">
        <div className="pos-heading">
          <div>
            <h1>Point of Sale (POS)</h1>
            <p>{settings.storeProfile.name} workspace &gt; Point of Sale | {settings.storeProfile.tagline}</p>
          </div>
          <div className="pos-actions">
            <button className="primary-button"><Icon name="plus" size={16} /> New</button>
            <button className="ghost-button">Menu Orders</button>
            <button className="ghost-button">Draft List</button>
            <button className="ghost-button">Table Order</button>
          </div>
        </div>

        <div className="shift-strip">
          <div>
            <span>Open Drawer</span>
            <strong>{formatMoney(11554)}</strong>
          </div>
          <div>
            <span>Draft Items</span>
            <strong>{itemCount}</strong>
          </div>
          <div>
            <span>Est. Margin</span>
            <strong>{formatMoney(marginEstimate)}</strong>
          </div>
          <div>
            <span>Low Stock</span>
            <strong>{inventory.filter((item) => item.stock <= item.reorder).length}</strong>
          </div>
        </div>

        <div className="catalog-panel">
          <div className="pos-toolbar">
            <label className="search">
              <Icon name="search" size={17} />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search in products" />
            </label>
            <select aria-label="All Category" value={category} onChange={(event) => onCategory(event.target.value)}>
              {categoryNames.map((item) => <option key={item}>{item}</option>)}
            </select>
            <select aria-label="Select Size" value={selectedSizeId} onChange={(event) => setSelectedSizeId(event.target.value)}>
              {availableSizes.map((size) => <option key={size.id} value={size.id}>{size.name}</option>)}
            </select>
          </div>

          <div className="category-tabs">
            {categoryNames.map((item) => (
              <button className={category === item ? "chip active" : "chip"} key={item} onClick={() => onCategory(item)}>
                <span>{item === "All" ? "Show All" : item}</span>
                <b>{item === "All" ? products.length : products.filter((product) => product.category === item).length}</b>
              </button>
            ))}
          </div>

          <div className="product-grid">
            {filteredProducts.map((product) => (
              <button className="product-card" key={product.id} onClick={() => onAdd(product, selectedSize, selectedAddonIds)}>
                <span className="product-badge">{product.category}</span>
                <span className={`product-visual product-${product.id}`} />
                <strong>{product.name}</strong>
                <span className="product-meta">
                  <b>{formatMoney(product.price + (selectedSize?.priceDelta || 0))}</b>
                  <small>{formatMoney(product.price - product.cost)} margin</small>
                </span>
                <span className="quick-add"><Icon name="plus" size={14} /></span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <aside className="order-panel">
        <div className="order-header">
          <div>
            <span>Current Order</span>
            <h2>Order #020</h2>
          </div>
          <span className="order-count">{itemCount} items</span>
        </div>
        <label className="search order-search">
          <Icon name="search" size={16} />
          <input placeholder="Search in Existing" />
        </label>
        <div className="order-filters">
          <select aria-label="Select Discount">
            <option>No Discount</option>
            {settings.discountTypes.filter((discount) => discount.enabled).map((discount) => <option key={discount.id}>{discount.name}</option>)}
          </select>
          <select aria-label="Select Payment" value={paymentMethodId} onChange={(event) => setPaymentMethodId(event.target.value)}>
            {paymentMethods.map((method) => <option key={method.id} value={method.id}>{method.name}</option>)}
          </select>
        </div>
        <div className="service-toggle">
          <button className={dining === "take_out" ? "active" : ""} onClick={() => setDining("take_out")}>Take Out</button>
          <button className={dining === "dine_in" ? "active" : ""} onClick={() => setDining("dine_in")}>Dine In</button>
        </div>
        {dining === "dine_in" && (
          <select className="table-picker" aria-label="Select Table">
            {settings.tables.map((table) => <option key={table.id}>{table.name}</option>)}
          </select>
        )}
        <div className="addon-picker">
          {settings.addons.filter((addon) => addon.enabled).map((addon) => (
            <label key={addon.id}>
              <input
                type="checkbox"
                checked={selectedAddonIds.includes(addon.id)}
                onChange={(event) => {
                  setSelectedAddonIds((current) => event.target.checked
                    ? [...current, addon.id]
                    : current.filter((id) => id !== addon.id));
                }}
              />
              <span>{addon.name}</span>
              <b>{formatMoney(addon.price || 0)}</b>
            </label>
          ))}
        </div>
        <div className="cart-items">
          {cart.length === 0 ? (
            <div className="empty">
              <LogoMark />
              <p>No items yet</p>
              <span>Start a charming order from the menu.</span>
            </div>
          ) : cart.map((item) => (
            <div className="cart-row" key={item.id}>
              <button className="delete-button" aria-label={`Remove ${item.name}`}>x</button>
              <div>
                <strong>{item.name}</strong>
                <span>{item.size.name} | {formatMoney(item.price)} x {item.quantity} = {formatMoney(item.price * item.quantity)}</span>
                {item.addons.length > 0 && <small>{item.addons.map((addon) => addon.name).join(", ")}</small>}
                <div className="qty-row">
                  <button>-</button><b>{item.quantity}</b><button>+</button>
                  <button className="note-button">Notes</button>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="order-footer">
          <div className="totals">
            <span>Sub total <b>{formatMoney(subtotal)}</b></span>
            <span>Product Discount <b>{formatMoney(productDiscount)}</b></span>
            <span>Extra Discount <b>{formatMoney(0)}</b></span>
            <span>Coupon discount <b>{formatMoney(couponDiscount)}</b></span>
            <strong>Total <b>{formatMoney(total)}</b></strong>
          </div>
          <div className="order-buttons">
            <button className="dark-button wide" disabled={!cart.length}>KOT & Print</button>
            <button className="ghost-button wide">Draft</button>
            <button className="primary-button wide" disabled={!cart.length}>Bill & Payment</button>
            <button className="success-button wide" disabled={!cart.length}>Bill & Print</button>
            <button className="text-button wide" onClick={onClear}>Clear Order</button>
          </div>
        </div>
      </aside>
    </div>
  );
}

function Inventory({ lowStock, inventoryValue }) {
  return (
    <div className="screen">
      <PageTitle title="Inventory" subtitle="Track ingredients, packaging, supplies, reorder points, and stock value." action={<button className="primary-button"><Icon name="plus" size={18} /> Add Item</button>} />
      <div className="metrics-row compact">
        <Metric label="Total Items" value={String(inventory.length)} />
        <Metric label="Inventory Value" value={formatMoney(inventoryValue)} />
        <Metric label="Low Stock" value={String(lowStock.length)} tone="warning" />
        <Metric label="Out of Stock" value="0" />
      </div>
      <section className="panel">
        <DataTable
          columns={["Item", "Type", "Stock", "Reorder At", "Unit Cost", "Value", "Status"]}
          rows={inventory.map((item) => [
            <><strong>{item.name}</strong><small>{item.supplier}</small></>,
            item.type,
            `${item.stock} ${item.unit}`,
            `${item.reorder} ${item.unit}`,
            formatMoney(item.unitCost),
            formatMoney(item.stock * item.unitCost),
            item.stock <= item.reorder ? "Low" : "OK"
          ])}
        />
      </section>
    </div>
  );
}

function Products() {
  return (
    <div className="screen">
      <PageTitle title="Products" subtitle="Manage menu items, recipes, product sizing, and selling prices." action={<button className="primary-button"><Icon name="plus" size={18} /> New Product</button>} />
      <div className="list-panel">
        {products.map((product) => (
          <div className="product-line" key={product.id}>
            <span className={`product-visual small product-${product.id}`} />
            <div><strong>{product.name}</strong><small>{product.category}</small></div>
            <b>{formatMoney(product.price)}</b>
            <span>{product.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Expenses({ expenseTotal }) {
  return (
    <div className="screen">
      <PageTitle title="Expenses" subtitle="Track miscellaneous, inventory, supplies, and operational spending." action={<button className="primary-button"><Icon name="plus" size={18} /> Add Expense</button>} />
      <div className="metrics-row compact">
        <Metric label="Total Expenses" value={formatMoney(expenseTotal)} tone="dark" />
        <Metric label="Inventory" value={formatMoney(1800)} />
        <Metric label="Supplies" value={formatMoney(356)} />
        <Metric label="Other" value={formatMoney(65)} />
      </div>
      <section className="panel">
        <DataTable columns={["Date", "Description", "Category", "Amount"]} rows={expenses.map((item) => [item.date, item.description, item.category, formatMoney(item.amount)])} />
      </section>
    </div>
  );
}

function Analytics() {
  return (
    <div className="screen">
      <PageTitle title="Analytics" subtitle="Sales performance, product movement, and financial reporting." />
      <div className="metrics-row compact">
        <Metric label="Revenue Period" value={formatMoney(4280)} />
        <Metric label="Orders Period" value="68" />
        <Metric label="Avg Order Value" value={formatMoney(62.94)} />
        <Metric label="Gross Margin" value="58%" tone="success" />
      </div>
      <section className="panel chart-panel large">
        <div className="panel-heading"><h2>Hourly Sales Heatmap</h2><span>Simulated sample data</span></div>
        <div className="heatmap">
          {Array.from({ length: 42 }, (_, index) => <i key={index} style={{ opacity: 0.18 + (index % 7) * 0.11 }} />)}
        </div>
      </section>
    </div>
  );
}

function Staff() {
  return (
    <div className="screen">
      <PageTitle title="Staff Management" subtitle="Manage team members, access roles, time logs, payroll, and targets." action={<button className="primary-button"><Icon name="plus" size={18} /> Add Staff</button>} />
      <div className="metrics-row compact">
        <Metric label="Total Staff" value={String(staff.length)} />
        <Metric label="Active" value={String(staff.filter((person) => person.status === "Active").length)} />
        <Metric label="Managers" value={String(staff.filter((person) => person.role === "Manager").length)} />
      </div>
      <section className="panel">
        <DataTable columns={["Name", "Email", "Role", "Rate", "Status"]} rows={staff.map((person) => [person.name, person.email, person.role, formatMoney(person.rate), person.status])} />
      </section>
    </div>
  );
}

function Assets({ assetValue }) {
  return (
    <div className="screen">
      <PageTitle title="Assets" subtitle="Track equipment and fixtures, then feed asset value into business value and ROI." action={<button className="primary-button"><Icon name="plus" size={18} /> Add Asset</button>} />
      <div className="metrics-row compact">
        <Metric label="Total Assets" value={String(assets.length)} />
        <Metric label="Asset Value" value={formatMoney(assetValue)} />
        <Metric label="Payback Progress" value="18%" detail="Based on sample net profit" />
        <Metric label="Repair Needed" value="0" />
      </div>
      <section className="panel">
        <DataTable columns={["Asset", "Group", "Purchase Date", "Price", "Condition"]} rows={assets.map((item) => [item.name, item.category, item.date, formatMoney(item.price), item.condition])} />
      </section>
    </div>
  );
}

function Setup({ settings, setSettings }) {
  const addNamedItem = (key, name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const id = trimmed.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const baseItem = {
      id,
      name: trimmed,
      sortOrder: settings[key].length + 1,
      enabled: true
    };
    const itemByType = {
      sizes: { ...baseItem, priceDelta: 0 },
      categories: baseItem,
      addons: { ...baseItem, price: 0 },
      units: { id, name: trimmed },
      paymentMethods: baseItem,
      discountTypes: { ...baseItem, percent: 0, vatExempt: false }
    };
    setSettings((current) => ({
      ...current,
      [key]: [...current[key], itemByType[key] || baseItem]
    }));
  };

  const removeItem = (key, id) => {
    setSettings((current) => ({
      ...current,
      [key]: current[key].filter((item) => item.id !== id)
    }));
  };

  const updateStoreProfile = (field, value) => {
    setSettings((current) => ({
      ...current,
      storeProfile: { ...current.storeProfile, [field]: value }
    }));
  };

  const toggleFeature = (field) => {
    setSettings((current) => ({
      ...current,
      featureFlags: { ...current.featureFlags, [field]: !current.featureFlags[field] }
    }));
  };

  return (
    <div className="screen settings-screen">
      <PageTitle
        title="Settings"
        subtitle="Config-driven controls for sizes, categories, add-ons, units, payments, discounts, VAT, receipt, and backups."
        action={<button className="primary-button" onClick={() => downloadJson("charm-cafe-settings-backup.json", settings)}>Export Backup</button>}
      />

      <section className="panel settings-card">
        <div className="settings-grid">
          <label>
            <span>Store Name</span>
            <input value={settings.storeProfile.name} onChange={(event) => updateStoreProfile("name", event.target.value)} />
          </label>
          <label>
            <span>Tagline</span>
            <input value={settings.storeProfile.tagline} onChange={(event) => updateStoreProfile("tagline", event.target.value)} />
          </label>
          <label className="switch-row">
            <input type="checkbox" checked={settings.featureFlags.auto86} onChange={() => toggleFeature("auto86")} />
            <span>Auto-86 unavailable products</span>
          </label>
          <label className="switch-row disabled">
            <input type="checkbox" checked={settings.featureFlags.vatBir} onChange={() => toggleFeature("vatBir")} />
            <span>VAT / BIR official receipt mode</span>
          </label>
        </div>
      </section>

      <ConfigList title="Sizes" items={settings.sizes} onAdd={(name) => addNamedItem("sizes", name)} onRemove={(id) => removeItem("sizes", id)} renderDetail={(item) => item.priceDelta ? `+${formatMoney(item.priceDelta)}` : "Base"} />
      <ConfigList title="Categories" items={settings.categories} onAdd={(name) => addNamedItem("categories", name)} onRemove={(id) => removeItem("categories", id)} />
      <ConfigList title="Add-ons" items={settings.addons} onAdd={(name) => addNamedItem("addons", name)} onRemove={(id) => removeItem("addons", id)} renderDetail={(item) => formatMoney(item.price || 0)} />
      <ConfigList title="Units" items={settings.units} onAdd={(name) => addNamedItem("units", name)} onRemove={(id) => removeItem("units", id)} />
      <ConfigList title="Payment Methods" items={settings.paymentMethods} onAdd={(name) => addNamedItem("paymentMethods", name)} onRemove={(id) => removeItem("paymentMethods", id)} />
      <ConfigList title="Discount Types" items={settings.discountTypes} onAdd={(name) => addNamedItem("discountTypes", name)} onRemove={(id) => removeItem("discountTypes", id)} renderDetail={(item) => item.vatExempt ? `${item.percent}% VAT-exempt` : `${item.percent || 0}%`} />
    </div>
  );
}

function ConfigList({ title, items, onAdd, onRemove, renderDetail = () => "Editable" }) {
  const [draft, setDraft] = useState("");
  return (
    <section className="panel config-list">
      <div className="panel-heading">
        <h2>{title}</h2>
        <form onSubmit={(event) => { event.preventDefault(); onAdd(draft); setDraft(""); }}>
          <input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={`Add ${title.toLowerCase()}`} />
          <button className="primary-button">Add</button>
        </form>
      </div>
      <div className="setup-list">
        {items.map((item) => (
          <div key={item.id}>
            <strong>{item.name}</strong>
            <span>{renderDetail(item)}</span>
            <button className="text-button inline" onClick={() => onRemove(item.id)}>Remove</button>
          </div>
        ))}
      </div>
    </section>
  );
}

function DataTable({ columns, rows }) {
  return (
    <div className="table-wrap">
      <table>
        <thead><tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr></thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>{row.map((cell, index) => <td key={`${rowIndex}-${index}`}>{cell}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default App;
