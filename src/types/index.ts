// ─── Auth & Profiles ────────────────────────────────────────────────────────

export type CafeRole = 'manager' | 'staff';

export interface Profile {
  id: string;
  full_name: string;
  cafe_role: CafeRole;
  can_view_inventory: boolean;
  can_add_expenses: boolean;
  is_active: boolean;
  daily_rate: number | null;
  hourly_rate: number | null;
  pin_code: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Settings ────────────────────────────────────────────────────────────────

export interface CafeSettings {
  business_name: string;
  tagline: string;
  logo_url: string | null;
  receipt_footer: string;
  currency: string;
  timezone: string;
  address: string;
  contact: string;
  vat_enabled: boolean;
  vat_tin: string | null;
  vat_rate: number;
  or_prefix: string;
  or_current: number;
}

// ─── Categories & Units ──────────────────────────────────────────────────────

export interface ProductCategory {
  id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface InventoryCategory {
  id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface Unit {
  id: string;
  name: string;
  sort_order: number;
}

// ─── Inventory ───────────────────────────────────────────────────────────────

export interface InventoryItem {
  id: string;
  name: string;
  category_id: string | null;
  unit_id: string | null;
  current_stock: number;
  low_stock_threshold: number;
  unit_cost: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  category?: InventoryCategory;
  unit?: Unit;
}

export type MovementType = 'sale' | 'stock_in' | 'adjustment' | 'waste' | 'void_restore';

export interface StockMovement {
  id: string;
  inventory_item_id: string;
  qty_change: number;
  movement_type: MovementType;
  reference_id: string | null;
  reference_type: string | null;
  note: string | null;
  created_by: string | null;
  created_at: string;
  inventory_item?: InventoryItem;
  created_by_profile?: Profile;
}

// ─── Products ────────────────────────────────────────────────────────────────

export interface Product {
  id: string;
  name: string;
  category_id: string | null;
  image_url: string | null;
  description: string | null;
  is_available: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  category?: ProductCategory;
  variants?: ProductVariant[];
}

export interface ProductVariant {
  id: string;
  product_id: string;
  size_label: string;
  price: number;
  sort_order: number;
  is_active: boolean;
  recipe_items?: RecipeItem[];
}

export interface RecipeItem {
  id: string;
  variant_id: string;
  inventory_item_id: string;
  qty_per_sale: number;
  inventory_item?: InventoryItem;
}

export interface AddOn {
  id: string;
  name: string;
  price: number;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  recipe_items?: AddOnRecipeItem[];
}

export interface AddOnRecipeItem {
  id: string;
  add_on_id: string;
  inventory_item_id: string;
  qty_per_sale: number;
  inventory_item?: InventoryItem;
}

// ─── Product Availability View ───────────────────────────────────────────────

export interface RecipeIngredientStatus {
  inventory_item_id: string;
  inventory_item_name: string;
  required: number;
  available: number;
  sufficient: boolean;
}

export interface ProductAvailability {
  product_id: string;
  variant_id: string;
  product_name: string;
  size_label: string;
  price: number;
  is_available: boolean;
  can_sell: boolean;
  recipe_status: RecipeIngredientStatus[] | null;
}

// ─── Orders ──────────────────────────────────────────────────────────────────

export type OrderType = 'dine-in' | 'take-out';
export type PaymentMethod = 'cash' | 'gcash' | 'split';
export type OrderStatus = 'completed' | 'voided';

export interface Order {
  id: string;
  order_no: string;
  order_type: OrderType;
  payment_method: PaymentMethod;
  cash_amount: number | null;
  gcash_amount: number | null;
  gcash_ref: string | null;
  subtotal: number;
  discount_type_id: string | null;
  discount_type_name: string | null;
  discount_amount: number;
  total: number;
  amount_tendered: number | null;
  change_due: number | null;
  status: OrderStatus;
  void_reason: string | null;
  voided_by: string | null;
  voided_at: string | null;
  created_by: string;
  created_at: string;
  items?: OrderItem[];
  created_by_profile?: Profile;
}

export interface OrderItem {
  id: string;
  order_id: string;
  variant_id: string | null;
  product_name: string;
  size_label: string;
  unit_price: number;
  quantity: number;
  line_total: number;
  is_voided: boolean;
  void_reason: string | null;
  voided_by: string | null;
  voided_at: string | null;
  add_ons?: OrderItemAddOn[];
}

export interface OrderItemAddOn {
  id: string;
  order_item_id: string;
  add_on_id: string | null;
  add_on_name: string;
  price: number;
}

// ─── Purchases ───────────────────────────────────────────────────────────────

export interface Purchase {
  id: string;
  supplier: string | null;
  notes: string | null;
  total: number;
  created_by: string;
  created_at: string;
  items?: PurchaseItem[];
  created_by_profile?: Profile;
}

export interface PurchaseItem {
  id: string;
  purchase_id: string;
  inventory_item_id: string;
  quantity: number;
  unit_cost: number;
  line_total: number;
  inventory_item?: InventoryItem;
}

// ─── Expenses ────────────────────────────────────────────────────────────────

export interface Expense {
  id: string;
  category: string;
  amount: number;
  note: string | null;
  expense_date: string;
  receipt_url: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  created_by_profile?: Profile;
}

// ─── Assets ──────────────────────────────────────────────────────────────────

export interface Asset {
  id: string;
  name: string;
  purchase_price: number;
  purchase_date: string | null;
  note: string | null;
  is_active: boolean;
  created_at: string;
}

// ─── Time Logs & Payroll ─────────────────────────────────────────────────────

export interface TimeLog {
  id: string;
  profile_id: string;
  clock_in: string;
  clock_out: string | null;
  hours_worked: number | null;
  adjustment_note: string | null;
  adjusted_by: string | null;
  created_at: string;
  profile?: Profile;
  adjusted_by_profile?: Profile;
}

export type PayrollStatus = 'draft' | 'paid';

export interface PayrollPeriod {
  id: string;
  period_start: string;
  period_end: string;
  status: PayrollStatus;
  paid_at: string | null;
  paid_by: string | null;
  created_at: string;
  entries?: PayrollEntry[];
}

export interface PayrollAdjustment {
  type: 'bonus' | 'deduction' | 'cash_advance';
  amount: number;
  note: string;
}

export interface PayrollEntry {
  id: string;
  payroll_period_id: string;
  profile_id: string;
  hours_worked: number;
  days_worked: number;
  base_pay: number;
  adjustments: PayrollAdjustment[];
  total_pay: number;
  notes: string | null;
  profile?: Profile;
}

// ─── Cart (client-side only) ─────────────────────────────────────────────────

export interface CartAddOn {
  addOnId: string;
  addOnName: string;
  price: number;
}

export interface CartItem {
  lineId: string;
  variantId: string;
  productName: string;
  sizeLabel: string;
  basePrice: number;
  addOns: CartAddOn[];
  addOnsTotal: number;
  linePrice: number;
  quantity: number;
}

// ─── RPC Return Types ────────────────────────────────────────────────────────

export interface CompleteSaleResult {
  order_id: string;
  order_no: string;
  total: number;
  change_due: number;
}

export interface CompleteSaleItem {
  variant_id: string;
  qty: number;
  unit_price: number;
  product_name: string;
  size_label: string;
  add_ons: CompleteSaleAddOn[];
}

export interface CompleteSaleAddOn {
  add_on_id: string;
  add_on_name: string;
  price: number;
}

// ─── Analytics ───────────────────────────────────────────────────────────────

export type AnalyticsPeriod = 'today' | 'week' | 'month' | 'year' | 'custom' | 'all';

export interface SalesSummary {
  revenue: number;
  orders: number;
  avg_order_value: number;
  gross_profit: number;
  cogs: number;
}

export interface TopProduct {
  product_name: string;
  size_label: string;
  qty_sold: number;
  revenue: number;
}

export interface SalesByPeriod {
  period_label: string;
  revenue: number;
  orders: number;
}
