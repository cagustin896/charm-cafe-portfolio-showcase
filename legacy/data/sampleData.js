export const defaultSettings = {
  storeProfile: {
    name: "Charm Cafe",
    tagline: "A little charm in every cup",
    currency: "PHP",
    timezone: "Asia/Manila",
    address: "",
    contact: ""
  },
  featureFlags: {
    auto86: true,
    vatBir: false
  },
  sizes: [
    { id: "16oz", name: "16oz", priceDelta: 0, sortOrder: 1 },
    { id: "22oz", name: "22oz", priceDelta: 15, sortOrder: 2 }
  ],
  categories: [
    { id: "milk-series", name: "Milk Series", sortOrder: 1 },
    { id: "fruity-soda", name: "Fruity Soda", sortOrder: 2 },
    { id: "iced-coffee", name: "Iced Coffee", sortOrder: 3 },
    { id: "addons", name: "Add-ons", sortOrder: 4 }
  ],
  units: [
    { id: "ml", name: "ml" },
    { id: "g", name: "g" },
    { id: "pcs", name: "pcs" }
  ],
  paymentMethods: [
    { id: "cash", name: "Cash", enabled: true },
    { id: "gcash", name: "GCash", enabled: true }
  ],
  discountTypes: [
    { id: "senior-pwd", name: "Senior/PWD", percent: 20, vatExempt: true, enabled: true },
    { id: "promo", name: "Promo", percent: 0, vatExempt: false, enabled: true }
  ],
  addons: [
    { id: "coffee-jelly", name: "Coffee Jelly", price: 15, enabled: true },
    { id: "extra-syrup", name: "Extra Syrup", price: 10, enabled: true }
  ],
  tables: [
    { id: "counter", name: "Counter" },
    { id: "table-1", name: "Table 01" }
  ]
};

export const categories = ["All", ...defaultSettings.categories.map((category) => category.name)];

export const products = [
  { id: "p1", name: "Cookie Butter", category: "Milk Series", price: 75, cost: 31, status: "Available" },
  { id: "p2", name: "Choco Berry", category: "Milk Series", price: 70, cost: 29, status: "Available" },
  { id: "p3", name: "Matcha", category: "Milk Series", price: 65, cost: 27, status: "Available" },
  { id: "p4", name: "Velvet Blush", category: "Milk Series", price: 60, cost: 24, status: "Available" },
  { id: "p5", name: "Mango Milk", category: "Milk Series", price: 55, cost: 22, status: "Available" },
  { id: "p6", name: "Blueberry Milk", category: "Milk Series", price: 55, cost: 22, status: "Available" },
  { id: "p7", name: "Coke Float", category: "Fruity Soda", price: 39, cost: 16, status: "Available" },
  { id: "p8", name: "Green Apple Soda", category: "Fruity Soda", price: 29, cost: 12, status: "Available" },
  { id: "p9", name: "Lychee Soda", category: "Fruity Soda", price: 29, cost: 12, status: "Available" },
  { id: "p10", name: "Spanish Latte", category: "Iced Coffee", price: 85, cost: 38, status: "Available" },
  { id: "p11", name: "Caramel Macchiato", category: "Iced Coffee", price: 89, cost: 41, status: "Available" },
  { id: "p12", name: "Coffee Jelly", category: "Add-ons", price: 15, cost: 6, status: "Available" }
];

export const inventory = [
  { id: "i1", name: "Biscoff Biscuit Crumbs", supplier: "Chefs & Bakers", type: "Ingredient", stock: 365, unit: "g", reorder: 200, unitCost: 0.6 },
  { id: "i2", name: "Blueberry Jam", supplier: "Chefs & Bakers", type: "Ingredient", stock: 2270, unit: "g", reorder: 750, unitCost: 0.15 },
  { id: "i3", name: "Boba Straw 23cm", supplier: "Local Packaging", type: "Packaging", stock: 5, unit: "pcs", reorder: 80, unitCost: 0.85 },
  { id: "i4", name: "Chocolate Powder", supplier: "Enmall", type: "Ingredient", stock: 406, unit: "g", reorder: 200, unitCost: 0.43 },
  { id: "i5", name: "Coke", supplier: "Taboan", type: "Ingredient", stock: 1480, unit: "ml", reorder: 3000, unitCost: 0.05 },
  { id: "i6", name: "Condensed Milk", supplier: "Chefs & Bakers", type: "Ingredient", stock: 5875, unit: "g", reorder: 2000, unitCost: 0.1 },
  { id: "i7", name: "Plastic Cups 16oz", supplier: "Local Packaging", type: "Packaging", stock: 42, unit: "pcs", reorder: 120, unitCost: 2.2 }
];

export const expenses = [
  { id: "e1", date: "2026-06-08", description: "Ice cubes", category: "Supplies", amount: 116 },
  { id: "e2", date: "2026-06-07", description: "Milk restock", category: "Inventory", amount: 1800 },
  { id: "e3", date: "2026-06-06", description: "Delivery fee", category: "Other", amount: 65 },
  { id: "e4", date: "2026-06-05", description: "Cleaning supplies", category: "Supplies", amount: 240 }
];

export const staff = [
  { id: "s1", name: "Christian Agustin", email: "christianagustin.jbs@gmail.com", role: "Manager", rate: 0, status: "Active", clockedIn: true },
  { id: "s2", name: "Jazfer Basubas", email: "jazferbasubas@gmail.com", role: "Staff", rate: 6000, status: "Active", clockedIn: false },
  { id: "s3", name: "Rodessa Aranda", email: "dessangsang089@gmail.com", role: "Staff", rate: 0, status: "Active", clockedIn: false }
];

export const assets = [
  { id: "a1", name: "Counter Table", category: "Furniture", date: "Mar 1, 2026", price: 4700, condition: "Good" },
  { id: "a2", name: "Vermax 2in1 Milk Frother", category: "Equipment", date: "Feb 13, 2026", price: 329, condition: "Good" },
  { id: "a3", name: "Knock Box Coffee Bar", category: "Equipment", date: "Feb 11, 2026", price: 299, condition: "Good" },
  { id: "a4", name: "Moka Pot 300ml", category: "Equipment", date: "Feb 11, 2026", price: 500, condition: "Good" }
];

export const salesTrend = [0, 480, 320, 760, 920, 680, 1120];
