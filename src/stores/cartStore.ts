import { create } from 'zustand';
import type { CartItem, CartAddOn, OrderType, PaymentMethod } from '@/types';

interface CartState {
  items: CartItem[];
  orderType: OrderType;
  paymentMethod: PaymentMethod;
  discountTypeId: string | null;
  discountTypeName: string | null;
  discountAmount: number;
  cashAmount: number;
  gcashAmount: number;
  gcashRef: string;

  // Computed getters (as methods)
  getSubtotal: () => number;
  getTotal: () => number;
  getItemCount: () => number;

  // Actions
  addItem: (params: {
    variantId: string;
    productName: string;
    sizeLabel: string;
    basePrice: number;
    addOns: CartAddOn[];
    quantity?: number;
  }) => void;
  removeItem: (lineId: string) => void;
  updateQuantity: (lineId: string, qty: number) => void;
  setOrderType: (type: OrderType) => void;
  setPaymentMethod: (method: PaymentMethod) => void;
  setDiscount: (typeId: string | null, typeName: string | null, amount: number) => void;
  setCashAmount: (amount: number) => void;
  setGcashAmount: (amount: number) => void;
  setGcashRef: (ref: string) => void;
  clearCart: () => void;
}

function buildLineId(variantId: string, addOns: CartAddOn[]): string {
  const sortedAddonIds = addOns.map((a) => a.addOnId).sort().join(',');
  return `${variantId}::${sortedAddonIds}`;
}

const initialState = {
  items: [] as CartItem[],
  orderType: 'take-out' as OrderType,
  paymentMethod: 'cash' as PaymentMethod,
  discountTypeId: null as string | null,
  discountTypeName: null as string | null,
  discountAmount: 0,
  cashAmount: 0,
  gcashAmount: 0,
  gcashRef: '',
};

export const useCartStore = create<CartState>((set, get) => ({
  ...initialState,

  getSubtotal: () => {
    const { items } = get();
    return items.reduce((sum, item) => sum + item.linePrice * item.quantity, 0);
  },

  getTotal: () => {
    const { discountAmount } = get();
    return Math.max(0, get().getSubtotal() - discountAmount);
  },

  getItemCount: () => {
    return get().items.reduce((sum, item) => sum + item.quantity, 0);
  },

  addItem: ({ variantId, productName, sizeLabel, basePrice, addOns, quantity = 1 }) => {
    const lineId = buildLineId(variantId, addOns);
    const addOnsTotal = addOns.reduce((sum, a) => sum + a.price, 0);
    const linePrice = basePrice + addOnsTotal;

    set((state) => {
      const existing = state.items.find((i) => i.lineId === lineId);
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.lineId === lineId ? { ...i, quantity: i.quantity + quantity } : i
          ),
        };
      }
      return {
        items: [
          ...state.items,
          {
            lineId,
            variantId,
            productName,
            sizeLabel,
            basePrice,
            addOns,
            addOnsTotal,
            linePrice,
            quantity,
          },
        ],
      };
    });
  },

  removeItem: (lineId) => {
    set((state) => ({
      items: state.items.filter((i) => i.lineId !== lineId),
    }));
  },

  updateQuantity: (lineId, qty) => {
    if (qty <= 0) {
      get().removeItem(lineId);
      return;
    }
    set((state) => ({
      items: state.items.map((i) => (i.lineId === lineId ? { ...i, quantity: qty } : i)),
    }));
  },

  setOrderType: (orderType) => set({ orderType }),
  setPaymentMethod: (paymentMethod) => set({ paymentMethod }),
  setDiscount: (discountTypeId, discountTypeName, discountAmount) =>
    set({ discountTypeId, discountTypeName, discountAmount }),
  setCashAmount: (cashAmount) => set({ cashAmount }),
  setGcashAmount: (gcashAmount) => set({ gcashAmount }),
  setGcashRef: (gcashRef) => set({ gcashRef }),

  clearCart: () => set({ ...initialState }),
}));
