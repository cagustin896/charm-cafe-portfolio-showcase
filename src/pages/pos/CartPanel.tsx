import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { BrandLogo } from '@/components/ui/Logo';
import { useCartStore } from '@/stores/cartStore';
import { useAuthStore } from '@/stores/authStore';
import { completeSale, getOrderById } from '@/services/salesService';
import type { Catalog } from '@/services/catalogService';
import type { Order, PaymentMethod } from '@/types';
import { formatMoney } from '@/utils/format';
import { cn } from '@/utils/cn';
import { ReceiptModal } from './ReceiptModal';

type DiscountMode = 'none' | 'senior' | 'custom';

const SENIOR_PWD_RATE = 0.2;
const QUICK_CASH = [100, 200, 500, 1000];

export function CartPanel({ catalog: _catalog }: { catalog: Catalog }) {
  const cart = useCartStore();
  const profile = useAuthStore((s) => s.profile);
  const queryClient = useQueryClient();

  const [discountMode, setDiscountMode] = useState<DiscountMode>('none');
  const [customDiscount, setCustomDiscount] = useState('');
  const [tendered, setTendered] = useState('');
  const [gcashRef, setGcashRef] = useState('');
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null);

  const subtotal = cart.getSubtotal();
  const discountAmount =
    discountMode === 'senior'
      ? Math.round(subtotal * SENIOR_PWD_RATE * 100) / 100
      : discountMode === 'custom'
        ? Math.min(Number(customDiscount) || 0, subtotal)
        : 0;
  const total = Math.max(0, subtotal - discountAmount);

  const tenderedNum = Number(tendered) || 0;
  const changeDue = Math.max(0, tenderedNum - total);
  const cashShort = cart.paymentMethod === 'cash' && tenderedNum < total;

  const chargeMutation = useMutation({
    mutationFn: async () => {
      const result = completeSale({
        items: cart.items,
        orderType: cart.orderType,
        paymentMethod: cart.paymentMethod,
        discountTypeId: discountMode === 'none' ? null : discountMode,
        discountTypeName:
          discountMode === 'senior' ? 'Senior/PWD (20%)' : discountMode === 'custom' ? 'Custom' : null,
        discountAmount,
        amountTendered: cart.paymentMethod === 'cash' ? tenderedNum : null,
        gcashRef: cart.paymentMethod === 'gcash' ? gcashRef.trim() || null : null,
        createdBy: profile?.id ?? 'unknown',
      });
      return getOrderById(result.order_id);
    },
    onSuccess: (order) => {
      queryClient.invalidateQueries({ queryKey: ['catalog'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      cart.clearCart();
      setDiscountMode('none');
      setCustomDiscount('');
      setTendered('');
      setGcashRef('');
      if (order) {
        setReceiptOrder(order);
        toast.success(`Order ${order.order_no} completed`);
      }
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Sale failed');
    },
  });

  const canCharge =
    cart.items.length > 0 &&
    !chargeMutation.isPending &&
    (cart.paymentMethod !== 'cash' || !cashShort);

  return (
    <aside className="w-[340px] flex-none flex flex-col border-l border-line bg-paper min-h-0">

      {/* Header */}
      <div className="flex-none flex items-center justify-between px-5 pt-5 pb-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Current Order</p>
          <h2 className="font-heading text-[18px] font-semibold text-espresso mt-0.5">
            {profile?.full_name.split(' ')[0] ?? 'Cashier'}'s counter
          </h2>
        </div>
        <span className="px-2.5 py-1 rounded-full bg-cream border border-line text-[11px] font-semibold text-muted">
          {cart.getItemCount()} {cart.getItemCount() === 1 ? 'item' : 'items'}
        </span>
      </div>

      {/* Order type */}
      <div className="flex-none px-5 pb-3">
        <div className="grid grid-cols-2 gap-1 p-1 rounded-full bg-cream border border-line">
          {(['take-out', 'dine-in'] as const).map((type) => (
            <button
              key={type}
              onClick={() => cart.setOrderType(type)}
              className={cn(
                'h-8 rounded-full text-[11.5px] font-semibold transition-all',
                cart.orderType === type
                  ? 'bg-dark-roast text-paper shadow-sm'
                  : 'text-muted hover:text-espresso'
              )}
            >
              {type === 'take-out' ? 'Take Out' : 'Dine In'}
            </button>
          ))}
        </div>
      </div>

      {/* Order body — the items list and the checkout below scroll together, so
          a long order stays fully reviewable on the way down to the Charge button */}
      <div className="flex-1 min-h-0 overflow-y-auto">

      {/* Line items */}
      <div className="px-5 py-1 space-y-2">
        {cart.items.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 text-center py-16">
            <BrandLogo size={52} className="opacity-30" />
            <p className="text-espresso font-semibold text-[13.5px]">No items yet</p>
            <p className="text-muted text-[12px] max-w-[190px]">
              Tap a product to start a charming order.
            </p>
          </div>
        ) : (
          cart.items.map((item) => (
            <div key={item.lineId} className="rounded-xl border border-line bg-cream/30 px-3.5 py-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-dark-roast leading-snug">
                    {item.productName}
                    {item.sizeLabel !== 'Regular' && (
                      <span className="text-muted font-medium"> · {item.sizeLabel}</span>
                    )}
                  </p>
                  {item.addOns.length > 0 && (
                    <p className="text-[11px] text-muted mt-0.5">
                      + {item.addOns.map((a) => a.addOnName).join(', ')}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => cart.removeItem(item.lineId)}
                  className="flex-none w-7 h-7 rounded-full grid place-items-center text-taupe hover:text-danger hover:bg-danger-soft transition-colors"
                  aria-label={`Remove ${item.productName}`}
                >
                  <Trash2 size={13} />
                </button>
              </div>
              <div className="flex items-center justify-between mt-2">
                <div className="inline-flex items-center gap-0.5 rounded-full border border-line bg-paper p-0.5">
                  <button
                    onClick={() => cart.updateQuantity(item.lineId, item.quantity - 1)}
                    className="w-7 h-7 rounded-full grid place-items-center text-espresso hover:bg-cream transition-colors"
                    aria-label="Decrease quantity"
                  >
                    <Minus size={12} />
                  </button>
                  <span className="w-7 text-center text-[13px] font-semibold text-dark-roast">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => cart.updateQuantity(item.lineId, item.quantity + 1)}
                    className="w-7 h-7 rounded-full grid place-items-center text-espresso hover:bg-cream transition-colors"
                    aria-label="Increase quantity"
                  >
                    <Plus size={12} />
                  </button>
                </div>
                <p className="text-[13.5px] font-semibold text-espresso">
                  {formatMoney(item.linePrice * item.quantity)}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Checkout — flows directly after the items so it extends down with the order */}
      <div className="border-t border-line px-5 pt-3.5 pb-5 mt-2 space-y-3">

        {/* Discount + payment */}
        <div className="grid grid-cols-2 gap-2">
          <select
            value={discountMode}
            onChange={(e) => setDiscountMode(e.target.value as DiscountMode)}
            className="h-9 px-3 rounded-lg border border-line bg-cream/50 text-[12px] font-medium text-dark-roast outline-none focus:border-caramel"
            aria-label="Discount"
          >
            <option value="none">No Discount</option>
            <option value="senior">Senior/PWD 20%</option>
            <option value="custom">Custom ₱</option>
          </select>
          <select
            value={cart.paymentMethod}
            onChange={(e) => cart.setPaymentMethod(e.target.value as PaymentMethod)}
            className="h-9 px-3 rounded-lg border border-line bg-cream/50 text-[12px] font-medium text-dark-roast outline-none focus:border-caramel"
            aria-label="Payment method"
          >
            <option value="cash">Cash</option>
            <option value="gcash">GCash</option>
          </select>
        </div>

        {discountMode === 'custom' && (
          <input
            type="number"
            min={0}
            value={customDiscount}
            onChange={(e) => setCustomDiscount(e.target.value)}
            placeholder="Discount amount (₱)"
            className="w-full h-9 px-3 rounded-lg border border-line bg-cream/50 text-[12.5px] text-dark-roast placeholder:text-faint outline-none focus:border-caramel"
          />
        )}

        {/* Payment detail */}
        {cart.paymentMethod === 'cash' ? (
          <div className="space-y-2">
            <div className="flex gap-1.5">
              <input
                type="number"
                min={0}
                value={tendered}
                onChange={(e) => setTendered(e.target.value)}
                placeholder="Cash received"
                className={cn(
                  'flex-1 h-9 px-3 rounded-lg border bg-cream/50 text-[12.5px] text-dark-roast placeholder:text-faint outline-none transition-colors',
                  cashShort && tendered !== '' ? 'border-danger/50 focus:border-danger' : 'border-line focus:border-caramel'
                )}
              />
              <button
                onClick={() => setTendered(String(total))}
                disabled={total === 0}
                className="h-9 px-3 rounded-lg border border-line bg-cream text-[11px] font-semibold text-muted hover:text-espresso hover:border-caramel transition-colors disabled:opacity-40"
              >
                Exact
              </button>
            </div>
            <div className="flex gap-1.5">
              {QUICK_CASH.map((amt) => (
                <button
                  key={amt}
                  onClick={() => setTendered(String(amt))}
                  className="flex-1 h-8 rounded-lg border border-line bg-cream/40 text-[11px] font-semibold text-muted hover:text-espresso hover:border-caramel transition-colors"
                >
                  ₱{amt}
                </button>
              ))}
            </div>
            {tenderedNum > 0 && !cashShort && (
              <p className="text-[12px] text-sage font-semibold text-right">
                Change: {formatMoney(changeDue)}
              </p>
            )}
            {cashShort && tendered !== '' && (
              <p className="text-[12px] text-danger font-semibold text-right">
                Short by {formatMoney(total - tenderedNum)}
              </p>
            )}
          </div>
        ) : (
          <input
            value={gcashRef}
            onChange={(e) => setGcashRef(e.target.value)}
            placeholder="GCash reference no. (optional)"
            className="w-full h-9 px-3 rounded-lg border border-line bg-cream/50 text-[12.5px] text-dark-roast placeholder:text-faint outline-none focus:border-caramel"
          />
        )}

        {/* Totals */}
        <div className="space-y-1.5 pt-1">
          <div className="flex justify-between text-[12.5px] text-muted">
            <span>Subtotal</span>
            <span>{formatMoney(subtotal)}</span>
          </div>
          <div className="flex justify-between text-[12.5px] text-muted">
            <span>Discount</span>
            <span className={discountAmount > 0 ? 'text-sage font-semibold' : undefined}>
              −{formatMoney(discountAmount)}
            </span>
          </div>
          <div className="flex justify-between items-baseline font-heading text-[19px] font-semibold text-espresso border-t border-dashed border-line pt-2">
            <span>Total</span>
            <span>{formatMoney(total)}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <button
            onClick={() => {
              cart.clearCart();
              setDiscountMode('none');
              setCustomDiscount('');
              setTendered('');
              setGcashRef('');
            }}
            disabled={cart.items.length === 0}
            className="h-12 px-4 rounded-xl border border-line text-muted text-[12.5px] font-semibold hover:text-danger hover:border-danger/40 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Clear
          </button>
          <button
            onClick={() => chargeMutation.mutate()}
            disabled={!canCharge}
            className={cn(
              'flex-1 h-12 rounded-xl font-semibold text-[14px] transition-all',
              'bg-caramel text-paper hover:bg-caramel-dark',
              'shadow-[0_2px_8px_rgba(164,124,88,0.3)] hover:shadow-[0_4px_16px_rgba(164,124,88,0.4)]',
              'disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none'
            )}
          >
            {chargeMutation.isPending ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-paper border-t-transparent rounded-full animate-spin" />
                Charging…
              </span>
            ) : (
              `Charge ${formatMoney(total)}`
            )}
          </button>
        </div>
      </div>
      </div>

      {/* Receipt */}
      {receiptOrder && (
        <ReceiptModal order={receiptOrder} onClose={() => setReceiptOrder(null)} />
      )}
    </aside>
  );
}
